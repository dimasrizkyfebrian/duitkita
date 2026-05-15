import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { User } from '../../database/entities/user.entity';
import { UserSession } from '../../database/entities/user-session.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthMessages } from '../../common/constants/auth.messages';
import { SecurityAuditEventType } from '../../database/entities/security-audit-log.entity';
import { SecurityAuditService } from '../security-audit/security-audit.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async register(dto: RegisterDto, metadata?: SessionMetadata) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const result = await this.dataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const sessionRepository = manager.getRepository(UserSession);
      const existing = await userRepository.findOne({
        where: { email: dto.email },
      });
      if (existing) throw new ConflictException(AuthMessages.EMAIL_TAKEN);

      const user = userRepository.create({
        name: dto.name,
        email: dto.email,
        passwordHash,
      });
      await userRepository.save(user);

      return this.buildResponse(user, metadata, sessionRepository);
    });

    void this.securityAuditService.log({
      userId: result.user.id,
      eventType: SecurityAuditEventType.REGISTER_SUCCESS,
      ipAddress: metadata?.ipAddress ?? null,
      userAgent: metadata?.userAgent ?? null,
      meta: { sessionId: result.sessionId },
    });
    return result;
  }

  async login(dto: LoginDto, metadata?: SessionMetadata) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user) {
      void this.securityAuditService.log({
        userId: null,
        eventType: SecurityAuditEventType.LOGIN_FAILURE,
        ipAddress: metadata?.ipAddress ?? null,
        userAgent: metadata?.userAgent ?? null,
        meta: { email: dto.email, reason: 'user_not_found' },
      });
      throw new UnauthorizedException(AuthMessages.INVALID_CREDENTIALS);
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      void this.securityAuditService.log({
        userId: user.id,
        eventType: SecurityAuditEventType.LOGIN_FAILURE,
        ipAddress: metadata?.ipAddress ?? null,
        userAgent: metadata?.userAgent ?? null,
        meta: { reason: 'invalid_password' },
      });
      throw new UnauthorizedException(AuthMessages.INVALID_CREDENTIALS);
    }

    const result = await this.buildResponse(user, metadata);
    void this.securityAuditService.log({
      userId: user.id,
      eventType: SecurityAuditEventType.LOGIN_SUCCESS,
      ipAddress: metadata?.ipAddress ?? null,
      userAgent: metadata?.userAgent ?? null,
      meta: { sessionId: result.sessionId },
    });
    return result;
  }

  async refresh(refreshToken: string, metadata?: SessionMetadata) {
    let payload: { sub: string; sid: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException(AuthMessages.INVALID_REFRESH_TOKEN);
    }

    const rotation = await this.dataSource.transaction(async (manager) => {
      const sessionRepository = manager.getRepository(UserSession);
      const userRepository = manager.getRepository(User);
      const session = await sessionRepository.findOne({
        where: { id: payload.sid, userId: payload.sub },
        lock: { mode: 'pessimistic_write' },
      });

      if (!session || session.revokedAt) {
        return { error: new UnauthorizedException(AuthMessages.SESSION_REVOKED) };
      }

      if (session.expiresAt <= new Date()) {
        session.revokedAt = new Date();
        await sessionRepository.save(session);
        return { error: new UnauthorizedException(AuthMessages.INVALID_REFRESH_TOKEN) };
      }

      const isTokenValid = await bcrypt.compare(
        refreshToken,
        session.refreshTokenHash,
      );
      if (!isTokenValid) {
        session.revokedAt = new Date();
        await sessionRepository.save(session);
        return { error: new UnauthorizedException(AuthMessages.INVALID_REFRESH_TOKEN) };
      }

      const user = await userRepository.findOne({ where: { id: payload.sub } });
      if (!user) {
        return { error: new UnauthorizedException(AuthMessages.INVALID_REFRESH_TOKEN) };
      }

      return {
        result: await this.rotateSessionAndBuildResponse(
          user,
          session,
          metadata,
          sessionRepository,
        ),
      };
    });

    if ('error' in rotation) {
      throw rotation.error;
    }

    return rotation.result;
  }

  async listSessions(userId: string) {
    const sessions = await this.sessionRepository.find({
      where: { userId },
      order: { lastActiveAt: 'DESC' },
    });

    return sessions.map((session) => ({
      id: session.id,
      deviceName: session.deviceName,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      lastActiveAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      createdAt: session.createdAt,
    }));
  }

  async revokeSession(
    userId: string,
    sessionId: string,
    metadata?: SessionMetadata,
  ): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException(AuthMessages.SESSION_NOT_FOUND);
    }

    if (!session.revokedAt) {
      session.revokedAt = new Date();
      await this.sessionRepository.save(session);
      void this.securityAuditService.log({
        userId,
        eventType: SecurityAuditEventType.SESSION_REVOKED,
        ipAddress: metadata?.ipAddress ?? null,
        userAgent: metadata?.userAgent ?? null,
        meta: { revokedSessionId: sessionId },
      });
    }
  }

  async revokeOtherSessions(
    userId: string,
    currentSessionId?: string,
    metadata?: SessionMetadata,
  ): Promise<void> {
    const query = this.sessionRepository
      .createQueryBuilder()
      .update(UserSession)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL');

    if (currentSessionId) {
      query.andWhere('id <> :currentSessionId', { currentSessionId });
    }

    await query.execute();

    void this.securityAuditService.log({
      userId,
      eventType: SecurityAuditEventType.SESSIONS_REVOKED_OTHERS,
      ipAddress: metadata?.ipAddress ?? null,
      userAgent: metadata?.userAgent ?? null,
      meta: { keptSessionId: currentSessionId ?? null },
    });
  }

  async revokeAllSessions(
    userId: string,
    sessionRepository: Repository<UserSession> = this.sessionRepository,
  ): Promise<void> {
    await sessionRepository
      .createQueryBuilder()
      .update(UserSession)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  private async buildResponse(
    user: User,
    metadata?: SessionMetadata,
    sessionRepository: Repository<UserSession> = this.sessionRepository,
  ) {
    const session = await this.createSession(
      user.id,
      metadata,
      sessionRepository,
    );
    const refreshToken = await this.signRefreshToken(user.id, session.id);
    session.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await sessionRepository.save(session);

    const accessToken = this.signAccessToken(user, session.id);
    return {
      accessToken,
      refreshToken,
      sessionId: session.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    };
  }

  private signAccessToken(user: User, sessionId: string): string {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      sid: sessionId,
    });
    return accessToken;
  }

  private async rotateSessionAndBuildResponse(
    user: User,
    currentSession: UserSession,
    metadata?: SessionMetadata,
    sessionRepository: Repository<UserSession> = this.sessionRepository,
  ) {
    // Rotate to a brand new session id so old refresh token payload (sid)
    // is guaranteed to be invalid after a successful refresh.
    currentSession.revokedAt = new Date();
    await sessionRepository.save(currentSession);

    const nextSession = await this.createSession(
      user.id,
      metadata,
      sessionRepository,
    );
    const refreshToken = await this.signRefreshToken(user.id, nextSession.id);
    nextSession.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await sessionRepository.save(nextSession);

    const accessToken = this.signAccessToken(user, nextSession.id);
    return {
      accessToken,
      refreshToken,
      sessionId: nextSession.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    };
  }

  private async signRefreshToken(
    userId: string,
    sessionId: string,
  ): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, sid: sessionId, jti: randomUUID() },
      {
        secret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET,

        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as any,
      },
    );
  }

  private async createSession(
    userId: string,
    metadata?: SessionMetadata,
    sessionRepository: Repository<UserSession> = this.sessionRepository,
  ): Promise<UserSession> {
    const session = sessionRepository.create({
      userId,
      refreshTokenHash: 'pending',
      deviceName: metadata?.deviceName ?? null,
      ipAddress: metadata?.ipAddress ?? null,
      userAgent: metadata?.userAgent ?? null,
      lastActiveAt: new Date(),
      expiresAt: this.calculateRefreshExpiryDate(),
      revokedAt: null,
    });

    return sessionRepository.save(session);
  }

  private calculateRefreshExpiryDate(): Date {
    const raw = process.env.JWT_REFRESH_EXPIRES_IN ?? '30d';
    const match = /^(\d+)([dh])$/.exec(raw);
    const now = new Date();

    if (!match) {
      now.setDate(now.getDate() + 30);
      return now;
    }

    const amount = Number(match[1]);
    const unit = match[2];

    if (unit === 'd') {
      now.setDate(now.getDate() + amount);
      return now;
    }

    now.setHours(now.getHours() + amount);
    return now;
  }
}

export type SessionMetadata = {
  deviceName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

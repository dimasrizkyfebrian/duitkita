import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/user.entity';
import { Couple } from '../../database/entities/couple.entity';
import { UserSession } from '../../database/entities/user-session.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthService } from '../auth/auth.service';
import { SecurityAuditEventType } from '../../database/entities/security-audit-log.entity';
import { SecurityAuditService } from '../security-audit/security-audit.service';
import type { RequestAuditContext } from '../../common/utils/request-audit-context.util';
import { AvatarMessages } from '../../common/constants/avatar.messages';
import {
  AVATAR_STORAGE,
  type AvatarStorage,
} from './storage/avatar-storage.interface';

const ALLOWED_AVATAR_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_AVATAR_BYTES = 10 * 1024 * 1024;

export type ProfileInfo = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  hasAvatar: boolean;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Couple)
    private readonly coupleRepo: Repository<Couple>,
    private readonly dataSource: DataSource,
    private readonly authService: AuthService,
    private readonly securityAuditService: SecurityAuditService,
    @Inject(AVATAR_STORAGE)
    private readonly avatarStorage: AvatarStorage,
  ) {}

  async getProfile(userId: string): Promise<ProfileInfo> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.toProfileInfo(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileInfo> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.name !== undefined) user.name = dto.name;

    const saved = await this.userRepo.save(user);
    return this.toProfileInfo(saved);
  }

  async uploadAvatar(
    userId: string,
    file: { buffer: Buffer; mimetype: string; size: number } | undefined,
  ): Promise<ProfileInfo> {
    if (!file?.buffer?.length) {
      throw new BadRequestException(AvatarMessages.FILE_REQUIRED);
    }
    if (!ALLOWED_AVATAR_MIME.has(file.mimetype)) {
      throw new BadRequestException(AvatarMessages.INVALID_TYPE);
    }
    if (file.size > MAX_AVATAR_BYTES) {
      throw new BadRequestException(AvatarMessages.FILE_TOO_LARGE);
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const previousKey = user.avatarStorageKey ?? null;
    const storageKey = await this.avatarStorage.save(
      userId,
      file.buffer,
      file.mimetype,
    );

    user.avatarStorageKey = storageKey;
    const saved = await this.userRepo.save(user);

    if (previousKey && previousKey !== storageKey) {
      await this.avatarStorage.delete(previousKey).catch(() => undefined);
    }

    return this.toProfileInfo(saved);
  }

  async deleteAvatar(userId: string): Promise<ProfileInfo> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.avatarStorageKey) {
      await this.avatarStorage.delete(user.avatarStorageKey).catch(() => undefined);
      user.avatarStorageKey = null;
      await this.userRepo.save(user);
    }

    return this.toProfileInfo(user);
  }

  async getAvatarStream(viewerId: string, targetUserId: string) {
    const allowed = await this.canViewAvatar(viewerId, targetUserId);
    if (!allowed) {
      throw new ForbiddenException(AvatarMessages.FORBIDDEN);
    }

    const user = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!user?.avatarStorageKey) {
      throw new NotFoundException(AvatarMessages.NOT_FOUND);
    }

    const exists = await this.avatarStorage.exists(user.avatarStorageKey);
    if (!exists) {
      throw new NotFoundException(AvatarMessages.NOT_FOUND);
    }

    const stream = await this.avatarStorage.openReadStream(user.avatarStorageKey);
    return {
      stream,
      contentType: this.avatarStorage.getContentType(user.avatarStorageKey),
    };
  }

  async canViewAvatar(viewerId: string, targetUserId: string): Promise<boolean> {
    if (viewerId === targetUserId) return true;

    const couple = await this.coupleRepo
      .createQueryBuilder('couple')
      .where(
        '(couple.user1_id = :viewer AND couple.user2_id = :target) OR (couple.user1_id = :target AND couple.user2_id = :viewer)',
        { viewer: viewerId, target: targetUserId },
      )
      .getOne();

    return !!couple;
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    audit?: RequestAuditContext,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const sessionRepo = manager.getRepository(UserSession);
      const user = await userRepo.findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('User not found');

      const isMatch = await bcrypt.compare(
        dto.currentPassword,
        user.passwordHash,
      );
      if (!isMatch)
        throw new UnauthorizedException('Current password is incorrect');

      user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
      await userRepo.save(user);
      await this.authService.revokeAllSessions(userId, sessionRepo);
    });

    void this.securityAuditService.log({
      userId,
      eventType: SecurityAuditEventType.PASSWORD_CHANGED,
      ipAddress: audit?.ipAddress ?? null,
      userAgent: audit?.userAgent ?? null,
      meta: {},
    });
  }

  getSecurityAuditLog(userId: string, limit: number, offset: number) {
    return this.securityAuditService.listForUser(userId, limit, offset);
  }

  toProfileInfo(user: User): ProfileInfo {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      hasAvatar: !!user.avatarStorageKey,
    };
  }
}

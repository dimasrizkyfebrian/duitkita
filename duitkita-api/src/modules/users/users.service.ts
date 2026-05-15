import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/user.entity';
import { UserSession } from '../../database/entities/user-session.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthService } from '../auth/auth.service';
import { SecurityAuditEventType } from '../../database/entities/security-audit-log.entity';
import { SecurityAuditService } from '../security-audit/security-audit.service';
import type { RequestAuditContext } from '../../common/utils/request-audit-context.util';

export type ProfileInfo = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly authService: AuthService,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async getProfile(userId: string): Promise<ProfileInfo> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileInfo> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.name !== undefined) user.name = dto.name;

    const saved = await this.userRepo.save(user);
    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      createdAt: saved.createdAt,
    };
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
}

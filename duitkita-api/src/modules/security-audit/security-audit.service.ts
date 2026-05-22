import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SecurityAuditLog,
  SecurityAuditEventType,
} from '../../database/entities/security-audit-log.entity';

export type SecurityAuditLogParams = {
  userId?: string | null;
  eventType: SecurityAuditEventType;
  ipAddress?: string | null;
  userAgent?: string | null;
  meta?: Record<string, unknown>;
};

export type SecurityAuditListResult = {
  data: Array<{
    id: string;
    eventType: SecurityAuditEventType;
    ipAddress: string | null;
    userAgent: string | null;
    meta: Record<string, unknown> | null;
    createdAt: Date;
  }>;
  total: number;
  limit: number;
  offset: number;
};

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);

  constructor(
    @InjectRepository(SecurityAuditLog)
    private readonly auditRepo: Repository<SecurityAuditLog>,
  ) {}

  async log(params: SecurityAuditLogParams): Promise<void> {
    try {
      const row = this.auditRepo.create({
        userId: params.userId ?? null,
        eventType: params.eventType,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        meta: params.meta ?? null,
      });
      await this.auditRepo.save(row);
    } catch (err) {
      this.logger.error(
        { err, eventType: params.eventType, userId: params.userId },
        'security_audit:insert_failed',
      );
    }
  }

  async listForUser(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<SecurityAuditListResult> {
    const [rows, total] = await this.auditRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      data: rows.map((r) => ({
        id: r.id,
        eventType: r.eventType,
        ipAddress: r.ipAddress,
        userAgent: r.userAgent,
        meta: r.meta,
        createdAt: r.createdAt,
      })),
      total,
      limit,
      offset,
    };
  }
}

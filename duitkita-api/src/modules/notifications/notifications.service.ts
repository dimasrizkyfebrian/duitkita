import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationType,
} from '../../database/entities/notification.entity';
import { NotificationPreference } from '../../database/entities/notification-preference.entity';
import { NotificationMessages } from '../../common/constants/notification.messages';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

export type CreateNotificationParams = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  payloadJson?: Record<string, unknown>;
};

export type NotificationListResult = {
  data: Array<{
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    payloadJson: Record<string, unknown> | null;
    isRead: boolean;
    readAt: Date | null;
    createdAt: Date;
  }>;
  total: number;
  limit: number;
  offset: number;
  unreadCount: number;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepo: Repository<NotificationPreference>,
  ) {}

  async ensurePreferences(userId: string): Promise<NotificationPreference> {
    let prefs = await this.preferenceRepo.findOne({ where: { userId } });
    if (!prefs) {
      prefs = this.preferenceRepo.create({ userId });
      prefs = await this.preferenceRepo.save(prefs);
    }
    return prefs;
  }

  async isTypeEnabled(userId: string, type: NotificationType): Promise<boolean> {
    const prefs = await this.ensurePreferences(userId);
    switch (type) {
      case NotificationType.BUDGET_ALERT:
        return prefs.budgetAlert;
      case NotificationType.PARTNER_ACTIVITY:
        return prefs.partnerActivity;
      case NotificationType.WEEKLY_SUMMARY:
        return prefs.weeklySummary;
      case NotificationType.BILL_REMINDER:
        return prefs.reminderAlert;
      case NotificationType.RECURRING_EXPENSE:
        return prefs.recurringAlert;
      default:
        return true;
    }
  }

  async create(params: CreateNotificationParams): Promise<Notification | null> {
    const enabled = await this.isTypeEnabled(params.userId, params.type);
    if (!enabled) {
      return null;
    }

    try {
      const row = this.notificationRepo.create({
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        payloadJson: params.payloadJson,
        isRead: false,
      });
      return await this.notificationRepo.save(row);
    } catch (err) {
      this.logger.error({ err, userId: params.userId, type: params.type }, 'notification:create_failed');
      return null;
    }
  }

  async list(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<NotificationListResult> {
    const [rows, total] = await this.notificationRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    const unreadCount = await this.notificationRepo.count({
      where: { userId, isRead: false },
    });

    return {
      data: rows.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        body: r.body,
        payloadJson: r.payloadJson ?? null,
        isRead: r.isRead,
        readAt: r.readAt ?? null,
        createdAt: r.createdAt,
      })),
      total,
      limit,
      offset,
      unreadCount,
    };
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    const row = await this.notificationRepo.findOne({
      where: { id: notificationId, userId },
    });
    if (!row) {
      throw new NotFoundException(NotificationMessages.NOT_FOUND);
    }
    if (!row.isRead) {
      row.isRead = true;
      row.readAt = new Date();
      await this.notificationRepo.save(row);
    }
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('is_read = false')
      .execute();
    return result.affected ?? 0;
  }

  async getPreferences(userId: string) {
    const prefs = await this.ensurePreferences(userId);
    return {
      budgetAlert: prefs.budgetAlert,
      partnerActivity: prefs.partnerActivity,
      weeklySummary: prefs.weeklySummary,
      reminderAlert: prefs.reminderAlert,
      recurringAlert: prefs.recurringAlert,
      updatedAt: prefs.updatedAt,
    };
  }

  async updatePreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    const prefs = await this.ensurePreferences(userId);
    if (dto.budgetAlert !== undefined) prefs.budgetAlert = dto.budgetAlert;
    if (dto.partnerActivity !== undefined) prefs.partnerActivity = dto.partnerActivity;
    if (dto.weeklySummary !== undefined) prefs.weeklySummary = dto.weeklySummary;
    if (dto.reminderAlert !== undefined) prefs.reminderAlert = dto.reminderAlert;
    if (dto.recurringAlert !== undefined) prefs.recurringAlert = dto.recurringAlert;
    const saved = await this.preferenceRepo.save(prefs);
    return {
      budgetAlert: saved.budgetAlert,
      partnerActivity: saved.partnerActivity,
      weeklySummary: saved.weeklySummary,
      reminderAlert: saved.reminderAlert,
      recurringAlert: saved.recurringAlert,
      updatedAt: saved.updatedAt,
    };
  }
}

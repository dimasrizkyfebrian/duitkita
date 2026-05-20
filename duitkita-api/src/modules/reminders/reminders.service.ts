import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BillReminder,
  BillReminderStatus,
} from '../../database/entities/bill-reminder.entity';
import { ReminderMessages } from '../../common/constants/reminder.messages';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../database/entities/notification.entity';

export type ReminderView = {
  id: string;
  title: string;
  amount: number | null;
  dueDate: string;
  remindBeforeDays: number;
  status: BillReminderStatus;
  snoozedUntil: string | null;
  isRecurring: boolean;
  recurringRule: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class RemindersService {
  constructor(
    @InjectRepository(BillReminder)
    private readonly reminderRepo: Repository<BillReminder>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateReminderDto): Promise<ReminderView> {
    const dueDate = this.parseDateOnly(dto.dueDate);
    const row = this.reminderRepo.create({
      userId,
      title: dto.title,
      amount: dto.amount,
      dueDate,
      remindBeforeDays: dto.remindBeforeDays ?? 1,
      status: BillReminderStatus.UPCOMING,
      isRecurring: dto.isRecurring ?? false,
      recurringRule: dto.recurringRule,
    });
    const saved = await this.reminderRepo.save(row);
    await this.syncStatusesForUser(userId);
    const refreshed = await this.findOwned(userId, saved.id);
    await this.maybeNotifyUpcoming(refreshed);
    return this.toView(refreshed);
  }

  async findAll(userId: string, status?: BillReminderStatus): Promise<ReminderView[]> {
    if (status && !Object.values(BillReminderStatus).includes(status)) {
      throw new BadRequestException(ReminderMessages.INVALID_STATUS_FILTER);
    }

    await this.syncStatusesForUser(userId);

    const rows = await this.reminderRepo.find({
      where: status ? { userId, status } : { userId },
      order: { dueDate: 'ASC', createdAt: 'DESC' },
    });
    return rows.map((r) => this.toView(r));
  }

  async findOne(userId: string, id: string): Promise<ReminderView> {
    await this.syncStatusesForUser(userId);
    const row = await this.findOwned(userId, id);
    return this.toView(row);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateReminderDto,
  ): Promise<ReminderView> {
    const row = await this.findOwned(userId, id);
    if (row.status === BillReminderStatus.DONE) {
      throw new ConflictException(ReminderMessages.ALREADY_DONE);
    }

    if (dto.title !== undefined) row.title = dto.title;
    if (dto.amount !== undefined) row.amount = dto.amount;
    if (dto.dueDate !== undefined) row.dueDate = this.parseDateOnly(dto.dueDate);
    if (dto.remindBeforeDays !== undefined) row.remindBeforeDays = dto.remindBeforeDays;
    if (dto.isRecurring !== undefined) row.isRecurring = dto.isRecurring;
    if (dto.recurringRule !== undefined) row.recurringRule = dto.recurringRule;

    const saved = await this.reminderRepo.save(row);
    await this.syncStatusesForUser(userId);
    const refreshed = await this.findOwned(userId, saved.id);
    return this.toView(refreshed);
  }

  async markDone(userId: string, id: string): Promise<ReminderView> {
    const row = await this.findOwned(userId, id);
    if (row.status === BillReminderStatus.DONE) {
      throw new ConflictException(ReminderMessages.ALREADY_DONE);
    }
    row.status = BillReminderStatus.DONE;
    delete row.snoozedUntil;
    const saved = await this.reminderRepo.save(row);
    return this.toView(saved);
  }

  async snooze(userId: string, id: string, snoozeDays: number): Promise<ReminderView> {
    const row = await this.findOwned(userId, id);
    if (row.status === BillReminderStatus.DONE) {
      throw new ConflictException(ReminderMessages.ALREADY_DONE);
    }

    const until = new Date();
    until.setDate(until.getDate() + snoozeDays);
    row.snoozedUntil = this.startOfDay(until);
    if (row.status === BillReminderStatus.OVERDUE) {
      row.status = BillReminderStatus.UPCOMING;
    }
    const saved = await this.reminderRepo.save(row);
    return this.toView(saved);
  }

  async remove(userId: string, id: string): Promise<void> {
    const row = await this.findOwned(userId, id);
    await this.reminderRepo.remove(row);
  }

  private async syncStatusesForUser(userId: string): Promise<void> {
    const rows = await this.reminderRepo.find({
      where: { userId },
    });
    const today = this.startOfDay(new Date());
    const toSave: BillReminder[] = [];

    for (const row of rows) {
      if (row.status === BillReminderStatus.DONE) continue;

      const due = this.startOfDay(new Date(row.dueDate));
      const snoozedUntil = row.snoozedUntil
        ? this.startOfDay(new Date(row.snoozedUntil))
        : null;

      if (snoozedUntil && snoozedUntil >= today) {
        if (row.status !== BillReminderStatus.UPCOMING) {
          row.status = BillReminderStatus.UPCOMING;
          toSave.push(row);
        }
        continue;
      }

      if (due < today && row.status !== BillReminderStatus.OVERDUE) {
        row.status = BillReminderStatus.OVERDUE;
        toSave.push(row);
        void this.notificationsService.create({
          userId,
          type: NotificationType.BILL_REMINDER,
          title: 'Bill reminder overdue',
          body: row.title,
          payloadJson: { reminderId: row.id, dueDate: this.formatDateYmd(due) },
        });
      } else if (due >= today && row.status === BillReminderStatus.OVERDUE) {
        row.status = BillReminderStatus.UPCOMING;
        toSave.push(row);
      }
    }

    if (toSave.length > 0) {
      await this.reminderRepo.save(toSave);
    }
  }

  private async maybeNotifyUpcoming(row: BillReminder): Promise<void> {
    if (row.status === BillReminderStatus.DONE) return;

    const today = this.startOfDay(new Date());
    const due = this.startOfDay(new Date(row.dueDate));
    const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);

    if (diffDays >= 0 && diffDays <= row.remindBeforeDays) {
      void this.notificationsService.create({
        userId: row.userId,
        type: NotificationType.BILL_REMINDER,
        title: 'Upcoming bill reminder',
        body: row.title,
        payloadJson: {
          reminderId: row.id,
          dueDate: this.formatDateYmd(due),
          daysUntilDue: diffDays,
        },
      });
    }
  }

  private async findOwned(userId: string, id: string): Promise<BillReminder> {
    const row = await this.reminderRepo.findOne({ where: { id, userId } });
    if (!row) {
      throw new NotFoundException(ReminderMessages.NOT_FOUND);
    }
    return row;
  }

  private parseDateOnly(value: string): Date {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  private startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private formatDateYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private toView(row: BillReminder): ReminderView {
    return {
      id: row.id,
      title: row.title,
      amount: row.amount !== null ? Number(row.amount) : null,
      dueDate: this.formatDateYmd(this.startOfDay(new Date(row.dueDate))),
      remindBeforeDays: row.remindBeforeDays,
      status: row.status,
      snoozedUntil: row.snoozedUntil
        ? this.formatDateYmd(this.startOfDay(new Date(row.snoozedUntil)))
        : null,
      isRecurring: row.isRecurring,
      recurringRule: row.recurringRule ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

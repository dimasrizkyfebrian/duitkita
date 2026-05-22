import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';
import {
  RecurringExpense,
  RecurringScheduleType,
} from '../../database/entities/recurring-expense.entity';
import { Category } from '../../database/entities/category.entity';
import { RecurringMessages } from '../../common/constants/recurring.messages';
import { CreateRecurringExpenseDto } from './dto/create-recurring-expense.dto';
import { UpdateRecurringExpenseDto } from './dto/update-recurring-expense.dto';
import {
  advanceNextRunAt,
  computeNextRunAt,
  formatDateYmd,
  validateScheduleDay,
} from '../../common/utils/recurring-schedule.util';
import { ExpensesService } from '../expenses/expenses.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../database/entities/notification.entity';

export type RecurringExpenseView = {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  note: string | null;
  scheduleType: RecurringScheduleType;
  scheduleDay: number;
  nextRunAt: Date;
  lastRunAt: Date | null;
  isActive: boolean;
  createdAt: Date;
};

export type RunDueItemResult = {
  recurringExpenseId: string;
  success: boolean;
  expenseId?: string;
  error?: string;
};

export type RunDueResult = {
  processed: number;
  succeeded: number;
  failed: number;
  items: RunDueItemResult[];
};

@Injectable()
export class RecurringExpensesService {
  constructor(
    @InjectRepository(RecurringExpense)
    private readonly recurringRepo: Repository<RecurringExpense>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    private readonly dataSource: DataSource,
    private readonly expensesService: ExpensesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateRecurringExpenseDto): Promise<RecurringExpenseView> {
    this.assertValidSchedule(dto.scheduleType, dto.scheduleDay);
    await this.assertCategoryOwned(userId, dto.categoryId);

    const nextRunAt = computeNextRunAt(dto.scheduleType, dto.scheduleDay);
    const row = this.recurringRepo.create({
      userId,
      categoryId: dto.categoryId,
      amount: dto.amount,
      note: dto.note,
      scheduleType: dto.scheduleType,
      scheduleDay: dto.scheduleDay,
      nextRunAt,
      isActive: true,
    });
    const saved = await this.recurringRepo.save(row);
    return this.toView(await this.loadWithCategory(saved.id));
  }

  async findAll(userId: string): Promise<RecurringExpenseView[]> {
    const rows = await this.recurringRepo.find({
      where: { userId },
      relations: ['category'],
      order: { nextRunAt: 'ASC' },
    });
    return rows.map((r) => this.toView(r));
  }

  async findOne(userId: string, id: string): Promise<RecurringExpenseView> {
    const row = await this.findOwned(userId, id);
    return this.toView(row);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateRecurringExpenseDto,
  ): Promise<RecurringExpenseView> {
    const row = await this.findOwned(userId, id);
    const scheduleType = dto.scheduleType ?? row.scheduleType;
    const scheduleDay = dto.scheduleDay ?? row.scheduleDay;
    this.assertValidSchedule(scheduleType, scheduleDay);

    if (dto.amount !== undefined) row.amount = dto.amount;
    if (dto.note !== undefined) row.note = dto.note;
    if (dto.scheduleType !== undefined) row.scheduleType = dto.scheduleType;
    if (dto.scheduleDay !== undefined) row.scheduleDay = dto.scheduleDay;
    if (dto.scheduleType !== undefined || dto.scheduleDay !== undefined) {
      row.nextRunAt = computeNextRunAt(scheduleType, scheduleDay);
    }

    const saved = await this.recurringRepo.save(row);
    return this.toView(await this.loadWithCategory(saved.id));
  }

  async remove(userId: string, id: string): Promise<void> {
    const row = await this.findOwned(userId, id);
    await this.recurringRepo.remove(row);
  }

  async pause(userId: string, id: string): Promise<RecurringExpenseView> {
    const row = await this.findOwned(userId, id);
    if (!row.isActive) {
      throw new ConflictException(RecurringMessages.ALREADY_PAUSED);
    }
    row.isActive = false;
    const saved = await this.recurringRepo.save(row);
    return this.toView(await this.loadWithCategory(saved.id));
  }

  async resume(userId: string, id: string): Promise<RecurringExpenseView> {
    const row = await this.findOwned(userId, id);
    if (row.isActive) {
      throw new ConflictException(RecurringMessages.ALREADY_ACTIVE);
    }
    row.isActive = true;
    row.nextRunAt = computeNextRunAt(row.scheduleType, row.scheduleDay);
    const saved = await this.recurringRepo.save(row);
    return this.toView(await this.loadWithCategory(saved.id));
  }

  async runDueForUser(userId: string): Promise<RunDueResult> {
    const due = await this.recurringRepo.find({
      where: {
        userId,
        isActive: true,
        nextRunAt: LessThanOrEqual(new Date()),
      },
      order: { nextRunAt: 'ASC' },
    });
    return this.processDueRows(due);
  }

  async runDueAll(): Promise<RunDueResult> {
    const due = await this.recurringRepo.find({
      where: {
        isActive: true,
        nextRunAt: LessThanOrEqual(new Date()),
      },
      order: { nextRunAt: 'ASC' },
    });
    return this.processDueRows(due);
  }

  private async processDueRows(rows: RecurringExpense[]): Promise<RunDueResult> {
    const items: RunDueItemResult[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const item = await this.processOneDueRow(row);
        if (item.success && item.expenseId) {
          succeeded += 1;
          void this.notificationsService.create({
            userId: row.userId,
            type: NotificationType.RECURRING_EXPENSE,
            title: 'Recurring expense recorded',
            body: row.note
              ? `${row.note} — Rp ${Number(row.amount).toLocaleString('id-ID')}`
              : `Rp ${Number(row.amount).toLocaleString('id-ID')} recorded automatically`,
            payloadJson: {
              recurringExpenseId: row.id,
              expenseId: item.expenseId,
            },
          });
        } else {
          failed += 1;
        }
        items.push(item);
      } catch (err) {
        failed += 1;
        items.push({
          recurringExpenseId: row.id,
          success: false,
          error: err instanceof Error ? err.message : 'unknown_error',
        });
      }
    }

    return {
      processed: rows.length,
      succeeded,
      failed,
      items,
    };
  }

  private async processOneDueRow(row: RecurringExpense): Promise<RunDueItemResult> {
    return this.dataSource.transaction(async (manager) => {
      const recurringRepo = manager.getRepository(RecurringExpense);
      const locked = await recurringRepo.findOne({
        where: { id: row.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked || !locked.isActive || locked.nextRunAt > new Date()) {
        return { recurringExpenseId: row.id, success: false, error: 'skipped' };
      }

      const runDate = locked.nextRunAt;
      const expense = await this.expensesService.create(locked.userId, {
        categoryId: locked.categoryId,
        amount: Number(locked.amount),
        note: locked.note ?? undefined,
        expenseDate: formatDateYmd(runDate),
      });

      locked.lastRunAt = new Date();
      locked.nextRunAt = advanceNextRunAt(
        locked.scheduleType,
        locked.scheduleDay,
        runDate,
      );
      await recurringRepo.save(locked);

      return {
        recurringExpenseId: locked.id,
        success: true,
        expenseId: expense.id,
      };
    });
  }

  private assertValidSchedule(
    scheduleType: RecurringScheduleType,
    scheduleDay: number,
  ): void {
    if (!validateScheduleDay(scheduleType, scheduleDay)) {
      if (scheduleType === RecurringScheduleType.WEEKLY) {
        throw new BadRequestException(RecurringMessages.INVALID_SCHEDULE_DAY_WEEKLY);
      }
      throw new BadRequestException(RecurringMessages.INVALID_SCHEDULE_DAY_MONTHLY);
    }
  }

  private async assertCategoryOwned(userId: string, categoryId: string): Promise<void> {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId, userId },
    });
    if (!category) {
      throw new NotFoundException(RecurringMessages.CATEGORY_NOT_BELONG_TO_USER);
    }
  }

  private async findOwned(userId: string, id: string): Promise<RecurringExpense> {
    const row = await this.recurringRepo.findOne({
      where: { id, userId },
      relations: ['category'],
    });
    if (!row) {
      throw new NotFoundException(RecurringMessages.NOT_FOUND);
    }
    return row;
  }

  private async loadWithCategory(id: string): Promise<RecurringExpense> {
    return this.recurringRepo.findOneOrFail({
      where: { id },
      relations: ['category'],
    });
  }

  private toView(row: RecurringExpense): RecurringExpenseView {
    return {
      id: row.id,
      categoryId: row.categoryId,
      categoryName: row.category?.name ?? '',
      amount: Number(row.amount),
      note: row.note ?? null,
      scheduleType: row.scheduleType,
      scheduleDay: row.scheduleDay,
      nextRunAt: row.nextRunAt,
      lastRunAt: row.lastRunAt ?? null,
      isActive: row.isActive,
      createdAt: row.createdAt,
    };
  }
}

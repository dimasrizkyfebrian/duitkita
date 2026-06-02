import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm';
import { Expense } from '../../database/entities/expense.entity';
import { MonthlyBudget } from '../../database/entities/monthly-budget.entity';
import { Couple } from '../../database/entities/couple.entity';
import { Category } from '../../database/entities/category.entity';
import { User } from '../../database/entities/user.entity';
import {
  ActivityAction,
  ActivityEntityType,
} from '../../database/entities/activity.entity';
import { NotificationType } from '../../database/entities/notification.entity';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { validateYearMonth } from '../../common/utils/validate-period.util';
import { ExpenseMessages } from '../../common/constants/expense.messages';

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,

    @InjectRepository(MonthlyBudget)
    private readonly budgetRepo: Repository<MonthlyBudget>,

    @InjectRepository(Couple)
    private readonly coupleRepo: Repository<Couple>,

    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly dataSource: DataSource,
    private readonly activityService: ActivityService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateExpenseDto): Promise<Expense> {
    const result = await this.dataSource.transaction(async (manager) => {
      const expenseRepo = manager.getRepository(Expense);
      const budgetRepo = manager.getRepository(MonthlyBudget);
      const categoryRepo = manager.getRepository(Category);
      const category = await categoryRepo.findOne({
        where: { id: dto.categoryId, userId },
      });
      if (!category) {
        throw new NotFoundException(
          ExpenseMessages.CATEGORY_NOT_BELONG_TO_USER,
        );
      }

      const date = new Date(dto.expenseDate);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const budget = await budgetRepo.findOne({
        where: { userId, categoryId: dto.categoryId, year, month },
        lock: { mode: 'pessimistic_write' },
      });
      if (!budget) {
        throw new BadRequestException(
          ExpenseMessages.BUDGET_NOT_FOUND_FOR_MONTH(month, year),
        );
      }

      if (budget.isFinalized) {
        throw new ForbiddenException(ExpenseMessages.FINALIZED_CREATE);
      }

      const expense = expenseRepo.create({
        userId,
        categoryId: dto.categoryId,
        monthlyBudgetId: budget.id,
        amount: dto.amount,
        note: dto.note,
        expenseDate: new Date(dto.expenseDate),
      });

      return { saved: await expenseRepo.save(expense), category };
    });

    try {
      await this.activityService.log({
        userId,
        action: ActivityAction.CREATED,
        entityType: ActivityEntityType.EXPENSE,
        entityId: result.saved.id,
        meta: {
          amount: Number(result.saved.amount),
          note: result.saved.note ?? null,
          categoryName: result.category.name,
          categoryIcon: result.category.icon ?? null,
          expenseDate: dto.expenseDate,
        },
      });
    } catch {
      /* activity log failure must not break the main operation */
    }

    void this.notifyPartnerActivity(userId, result.category.name, Number(result.saved.amount), result.saved.note ?? null);

    return result.saved;
  }

  async findAllByMonth(
    userId: string,
    year: number,
    month: number,
    categoryId?: string,
  ): Promise<Expense[]> {
    validateYearMonth(year, month);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const whereClause: any = {
      userId,
      expenseDate: Between(startDate, endDate),
    };

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    return this.expenseRepo.find({
      where: whereClause,
      relations: ['category'],
      order: { expenseDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findAllByBudget(
    userId: string,
    monthlyBudgetId: string,
  ): Promise<Expense[]> {
    const budget = await this.budgetRepo.findOne({
      where: { id: monthlyBudgetId, userId },
    });
    if (!budget) {
      throw new NotFoundException(ExpenseMessages.BUDGET_NOT_FOUND);
    }

    return this.expenseRepo.find({
      where: { monthlyBudgetId },
      relations: ['category'],
      order: { expenseDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, expenseId: string): Promise<Expense> {
    const expense = await this.expenseRepo.findOne({
      where: { id: expenseId, userId },
      relations: ['category', 'monthlyBudget'],
    });
    if (!expense) {
      throw new NotFoundException(ExpenseMessages.NOT_FOUND);
    }
    return expense;
  }

  async update(
    userId: string,
    expenseId: string,
    dto: UpdateExpenseDto,
  ): Promise<Expense> {
    const result = await this.dataSource.transaction(async (manager) => {
      const expenseRepo = manager.getRepository(Expense);
      const budgetRepo = manager.getRepository(MonthlyBudget);
      const expense = await expenseRepo.findOne({
        where: { id: expenseId, userId },
        relations: ['monthlyBudget', 'category'],
      });
      if (!expense) {
        throw new NotFoundException(ExpenseMessages.NOT_FOUND);
      }

      const lockedBudget = await budgetRepo.findOne({
        where: { id: expense.monthlyBudgetId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedBudget) {
        throw new NotFoundException(ExpenseMessages.BUDGET_NOT_FOUND);
      }

      if (lockedBudget.isFinalized) {
        throw new ForbiddenException(ExpenseMessages.FINALIZED_EDIT);
      }

      if (dto.expenseDate) {
        const newDate = new Date(dto.expenseDate);
        const newYear = newDate.getFullYear();
        const newMonth = newDate.getMonth() + 1;

        if (
          newYear !== lockedBudget.year ||
          newMonth !== lockedBudget.month
        ) {
          throw new BadRequestException(ExpenseMessages.CROSS_MONTH);
        }

        expense.expenseDate = newDate;
      }

      if (dto.amount !== undefined) expense.amount = dto.amount;
      if (dto.note !== undefined) expense.note = dto.note;

      return {
        saved: await expenseRepo.save(expense),
        categoryName: expense.category.name,
        categoryIcon: expense.category.icon ?? null,
      };
    });

    try {
      await this.activityService.log({
        userId,
        action: ActivityAction.UPDATED,
        entityType: ActivityEntityType.EXPENSE,
        entityId: result.saved.id,
        meta: {
          amount: Number(result.saved.amount),
          note: result.saved.note ?? null,
          categoryName: result.categoryName,
          categoryIcon: result.categoryIcon,
          expenseDate:
            result.saved.expenseDate instanceof Date
              ? result.saved.expenseDate.toISOString().split('T')[0]
              : String(result.saved.expenseDate),
        },
      });
    } catch {
      /* activity log failure must not break the main operation */
    }

    return result.saved;
  }

  async remove(userId: string, expenseId: string): Promise<void> {
    const result = await this.dataSource.transaction(async (manager) => {
      const expenseRepo = manager.getRepository(Expense);
      const budgetRepo = manager.getRepository(MonthlyBudget);
      const expense = await expenseRepo.findOne({
        where: { id: expenseId, userId },
        relations: ['monthlyBudget', 'category'],
      });
      if (!expense) {
        throw new NotFoundException(ExpenseMessages.NOT_FOUND);
      }

      const lockedBudget = await budgetRepo.findOne({
        where: { id: expense.monthlyBudgetId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedBudget) {
        throw new NotFoundException(ExpenseMessages.BUDGET_NOT_FOUND);
      }

      if (lockedBudget.isFinalized) {
        throw new ForbiddenException(ExpenseMessages.FINALIZED_DELETE);
      }

      const meta = {
        amount: Number(expense.amount),
        note: expense.note ?? null,
        categoryName: expense.category.name,
        categoryIcon: expense.category.icon ?? null,
        expenseDate:
          expense.expenseDate instanceof Date
            ? expense.expenseDate.toISOString().split('T')[0]
            : String(expense.expenseDate),
      };
      const entityId = expense.id;

      await expenseRepo.remove(expense);
      return { meta, entityId };
    });

    try {
      await this.activityService.log({
        userId,
        action: ActivityAction.DELETED,
        entityType: ActivityEntityType.EXPENSE,
        entityId: result.entityId,
        meta: result.meta,
      });
    } catch {
      /* activity log failure must not break the main operation */
    }
  }

  async findPartnerExpenses(
    requestingUserId: string,
    year: number,
    month: number,
    categoryId?: string,
  ): Promise<Expense[]> {
    const partnerId = await this.getPartnerId(requestingUserId);
    return this.findAllByMonth(partnerId, year, month, categoryId);
  }

  private async notifyPartnerActivity(
    actorId: string,
    categoryName: string,
    amount: number,
    note: string | null,
  ): Promise<void> {
    try {
      const couple = await this.coupleRepo
        .createQueryBuilder('couple')
        .where('couple.user1_id = :actorId OR couple.user2_id = :actorId', { actorId })
        .getOne();
      if (!couple) return;

      const partnerId = couple.user1Id === actorId ? couple.user2Id : couple.user1Id;
      const actor = await this.userRepo.findOne({ where: { id: actorId }, select: ['name'] });
      if (!actor) return;

      const body = note
        ? `${formatRupiah(amount)} untuk ${categoryName} · ${note}`
        : `${formatRupiah(amount)} untuk ${categoryName}`;

      await this.notificationsService.create({
        userId: partnerId,
        type: NotificationType.PARTNER_ACTIVITY,
        title: `${actor.name} mencatat pengeluaran`,
        body,
        payloadJson: { actorId, categoryName, amount },
      });
    } catch {
      /* notification failure must not surface to the caller */
    }
  }

  private async getPartnerId(userId: string): Promise<string> {
    const couple = await this.coupleRepo
      .createQueryBuilder('couple')
      .leftJoinAndSelect('couple.user1', 'user1')
      .leftJoinAndSelect('couple.user2', 'user2')
      .where('couple.user1_id = :userId OR couple.user2_id = :userId', {
        userId,
      })
      .getOne();

    if (!couple) {
      throw new NotFoundException(ExpenseMessages.NO_PARTNER);
    }

    return couple.user1.id === userId ? couple.user2.id : couple.user1.id;
  }
}

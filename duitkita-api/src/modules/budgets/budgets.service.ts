import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MonthlyBudget } from '../../database/entities/monthly-budget.entity';
import { Expense } from '../../database/entities/expense.entity';
import { Couple } from '../../database/entities/couple.entity';
import { Category } from '../../database/entities/category.entity';
import {
  ActivityAction,
  ActivityEntityType,
} from '../../database/entities/activity.entity';
import { ActivityService } from '../activity/activity.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { validateYearMonth } from '../../common/utils/validate-period.util';
import { BudgetMessages } from '../../common/constants/budget.messages';
import { CategoryMessages } from '../../common/constants/category.messages';

const ALERT_WARNING_THRESHOLD = 0.8;
const ALERT_DANGER_THRESHOLD = 0.95;

export type AlertStatus = 'ok' | 'warning' | 'danger' | 'over';

export type BudgetWithStats = {
  id: string;
  userId: string;
  categoryId: string;
  category: Category;
  year: number;
  month: number;
  baseAmount: number;
  rolloverAmount: number;
  totalAmount: number;
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  alertStatus: AlertStatus;
  isFinalized: boolean;
};

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(MonthlyBudget)
    private readonly budgetRepo: Repository<MonthlyBudget>,
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(Couple)
    private readonly coupleRepo: Repository<Couple>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,

    private readonly dataSource: DataSource,
    private readonly activityService: ActivityService,
  ) {}

  async create(userId: string, dto: CreateBudgetDto): Promise<MonthlyBudget> {
    const result = await this.dataSource.transaction(async (manager) => {
      const budgetRepo = manager.getRepository(MonthlyBudget);
      const expenseRepo = manager.getRepository(Expense);
      const categoryRepo = manager.getRepository(Category);
      const category = await categoryRepo.findOne({
        where: { id: dto.categoryId, userId },
      });
      if (!category) {
        throw new NotFoundException(CategoryMessages.NOT_BELONG_TO_USER);
      }

      const existing = await budgetRepo.findOne({
        where: {
          userId,
          categoryId: dto.categoryId,
          year: dto.year,
          month: dto.month,
        },
      });
      if (existing) {
        throw new ConflictException(BudgetMessages.ALREADY_EXISTS);
      }

      const rolloverAmount =
        dto.includeRollover === true
          ? await this.calculateRollover(userId, dto.categoryId, dto.year, dto.month, budgetRepo, expenseRepo)
          : 0;

      const budget = budgetRepo.create({
        userId,
        categoryId: dto.categoryId,
        year: dto.year,
        month: dto.month,
        baseAmount: dto.baseAmount,
        rolloverAmount,
        totalAmount: dto.baseAmount + rolloverAmount,
      });

      return { saved: await budgetRepo.save(budget), category };
    });

    try {
      await this.activityService.log({
        userId,
        action: ActivityAction.CREATED,
        entityType: ActivityEntityType.BUDGET,
        entityId: result.saved.id,
        meta: {
          categoryName: result.category.name,
          categoryIcon: result.category.icon ?? null,
          baseAmount: dto.baseAmount,
          year: dto.year,
          month: dto.month,
        },
      });
    } catch {
      /* activity log failure must not break the main operation */
    }

    return result.saved;
  }

  async findAllByMonth(
    userId: string,
    year: number,
    month: number,
  ): Promise<BudgetWithStats[]> {
    validateYearMonth(year, month);
    const budgets = await this.budgetRepo.find({
      where: { userId, year, month },
      relations: ['category'],
      order: { category: { name: 'ASC' } },
    });

    const spentMap = await this.getTotalSpentBatch(budgets.map((b) => b.id));
    return budgets.map((b) => this.buildStats(b, spentMap.get(b.id) ?? 0));
  }

  async findOne(userId: string, budgetId: string): Promise<BudgetWithStats> {
    const budget = await this.budgetRepo.findOne({
      where: { id: budgetId, userId },
      relations: ['category'],
    });
    if (!budget) throw new NotFoundException(BudgetMessages.NOT_FOUND);
    return this.attachBudgetStats(budget);
  }

  async update(
    userId: string,
    budgetId: string,
    dto: UpdateBudgetDto,
  ): Promise<MonthlyBudget> {
    const result = await this.dataSource.transaction(async (manager) => {
      const budgetRepo = manager.getRepository(MonthlyBudget);
      const budget = await budgetRepo.findOne({
        where: { id: budgetId, userId },
        relations: ['category'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!budget) throw new NotFoundException(BudgetMessages.NOT_FOUND);
      if (budget.isFinalized) {
        throw new ForbiddenException(BudgetMessages.FINALIZED_EDIT);
      }

      if (dto.baseAmount !== undefined) {
        budget.baseAmount = dto.baseAmount;
        budget.totalAmount =
          dto.baseAmount + Number(budget.rolloverAmount ?? 0);
      }

      return {
        saved: await budgetRepo.save(budget),
        categoryName: budget.category.name,
        categoryIcon: budget.category.icon ?? null,
      };
    });

    try {
      await this.activityService.log({
        userId,
        action: ActivityAction.UPDATED,
        entityType: ActivityEntityType.BUDGET,
        entityId: result.saved.id,
        meta: {
          categoryName: result.categoryName,
          categoryIcon: result.categoryIcon,
          baseAmount: Number(result.saved.baseAmount),
          year: result.saved.year,
          month: result.saved.month,
        },
      });
    } catch {
      /* activity log failure must not break the main operation */
    }

    return result.saved;
  }

  async remove(userId: string, budgetId: string): Promise<{ id: string }> {
    await this.dataSource.transaction(async (manager) => {
      const budgetRepo = manager.getRepository(MonthlyBudget);
      const expenseRepo = manager.getRepository(Expense);
      const budget = await budgetRepo.findOne({
        where: { id: budgetId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!budget) throw new NotFoundException(BudgetMessages.NOT_FOUND);

      const expenseCount = await expenseRepo.count({
        where: { monthlyBudgetId: budgetId },
      });
      if (expenseCount > 0) {
        throw new ForbiddenException(BudgetMessages.HAS_EXPENSES);
      }

      await budgetRepo.remove(budget);
    });
    return { id: budgetId };
  }

  async findPartnerBudgets(
    requestingUserId: string,
    year: number,
    month: number,
  ): Promise<BudgetWithStats[]> {
    validateYearMonth(year, month);
    const partnerId = await this.getPartnerId(requestingUserId);

    const budgets = await this.budgetRepo.find({
      where: { userId: partnerId, year, month },
      relations: ['category'],
      order: { category: { name: 'ASC' } },
    });

    const spentMap = await this.getTotalSpentBatch(budgets.map((b) => b.id));
    return budgets.map((b) => this.buildStats(b, spentMap.get(b.id) ?? 0));
  }

  async finalizeMonth(
    userId: string,
    year: number,
    month: number,
  ): Promise<{ finalized: number }> {
    validateYearMonth(year, month);
    return this.dataSource.transaction(async (manager) => {
      const budgetRepo = manager.getRepository(MonthlyBudget);
      const budgets = await budgetRepo.find({
        where: { userId, year, month, isFinalized: false },
        lock: { mode: 'pessimistic_write' },
      });

      if (budgets.length === 0) return { finalized: 0 };

      for (const b of budgets) {
        b.isFinalized = true;
        await budgetRepo.save(b);
      }

      return { finalized: budgets.length };
    });
  }

  private async calculateRollover(
    userId: string,
    categoryId: string,
    year: number,
    month: number,
    budgetRepo: Repository<MonthlyBudget> = this.budgetRepo,
    expenseRepo: Repository<Expense> = this.expenseRepo,
  ): Promise<number> {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const prevBudget = await budgetRepo.findOne({
      where: { userId, categoryId, year: prevYear, month: prevMonth },
    });
    if (!prevBudget) return 0;

    const totalSpent = await this.getTotalSpent(prevBudget.id, expenseRepo);
    const leftover = Number(prevBudget.totalAmount ?? 0) - totalSpent;
    return leftover > 0 ? leftover : 0;
  }

  private async getTotalSpent(
    monthlyBudgetId: string,
    expenseRepo: Repository<Expense> = this.expenseRepo,
  ): Promise<number> {
    const result = await expenseRepo
      .createQueryBuilder('expense')
      .select('COALESCE(SUM(expense.amount), 0)', 'total')
      .where('expense.monthlyBudgetId = :monthlyBudgetId', { monthlyBudgetId })
      .getRawOne<{ total: string }>();

    return Number(result?.total ?? 0);
  }

  private async getTotalSpentBatch(
    budgetIds: string[],
  ): Promise<Map<string, number>> {
    if (budgetIds.length === 0) return new Map();

    const rows = await this.expenseRepo
      .createQueryBuilder('expense')
      .select('expense.monthlyBudgetId', 'budgetId')
      .addSelect('COALESCE(SUM(expense.amount), 0)', 'total')
      .where('expense.monthlyBudgetId IN (:...budgetIds)', { budgetIds })
      .groupBy('expense.monthlyBudgetId')
      .getRawMany<{ budgetId: string; total: string }>();

    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.budgetId, Number(row.total));
    }
    return map;
  }

  private buildStats(
    budget: MonthlyBudget,
    totalSpent: number,
  ): BudgetWithStats {
    const totalAmount = Number(budget.totalAmount ?? 0);
    const remaining = totalAmount - totalSpent;
    const percentage = totalAmount > 0 ? totalSpent / totalAmount : 0;

    let alertStatus: AlertStatus = 'ok';
    if (percentage >= 1) alertStatus = 'over';
    else if (percentage >= ALERT_DANGER_THRESHOLD) alertStatus = 'danger';
    else if (percentage >= ALERT_WARNING_THRESHOLD) alertStatus = 'warning';

    return {
      id: budget.id,
      userId: budget.userId,
      categoryId: budget.categoryId,
      category: budget.category,
      year: budget.year,
      month: budget.month,
      baseAmount: Number(budget.baseAmount ?? 0),
      rolloverAmount: Number(budget.rolloverAmount ?? 0),
      totalAmount,
      totalSpent,
      remaining,
      percentageUsed: Math.round(percentage * 100),
      alertStatus,
      isFinalized: budget.isFinalized,
    };
  }

  private async attachBudgetStats(
    budget: MonthlyBudget,
  ): Promise<BudgetWithStats> {
    const totalSpent = await this.getTotalSpent(budget.id);
    return this.buildStats(budget, totalSpent);
  }

  private async getPartnerId(userId: string): Promise<string> {
    const couple = await this.coupleRepo.findOne({
      where: [{ user1Id: userId }, { user2Id: userId }],
    });
    if (!couple) throw new NotFoundException(BudgetMessages.NO_PARTNER);
    return couple.user1Id === userId ? couple.user2Id : couple.user1Id;
  }
}

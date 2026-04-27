import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MonthlyBudget } from '../../database/entities/monthly-budget.entity';
import { Expense } from '../../database/entities/expense.entity';
import { Couple } from '../../database/entities/couple.entity';
import { User } from '../../database/entities/user.entity';
import {
  validateMonthsBack,
  validateYearMonth,
} from '../../common/utils/validate-period.util';
import { ReportMessages } from '../../common/constants/report.messages';

export interface CategoryReportItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  baseAmount: number;
  rolloverAmount: number;
  totalAmount: number;
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  alertStatus: 'ok' | 'warning' | 'danger' | 'over';
  expenseCount: number;
  topExpenses: {
    id: string;
    amount: number;
    note: string | null;
    expenseDate: Date;
  }[];
}

export interface MonthlyReport {
  userId: string;
  userName: string;
  year: number;
  month: number;
  totalBudgeted: number;
  totalRollover: number;
  totalEffectiveBudget: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentageUsed: number;
  categories: CategoryReportItem[];
}

export interface CoupleReport {
  year: number;
  month: number;
  me: MonthlyReport;
  partner: MonthlyReport;
  combinedTotalSpent: number;
  combinedTotalBudget: number;
}

export interface TrendItem {
  year: number;
  month: number;
  totalSpent: number;
  totalBudget: number;
  percentageUsed: number;
}

export interface CategoryTrend {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  trend: TrendItem[];
}

export interface RolloverHistoryItem {
  year: number;
  month: number;
  baseAmount: number;
  rolloverAmount: number;
  totalAmount: number;
  totalSpent: number;
  leftover: number;
}

export interface CategoryRolloverHistory {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  history: RolloverHistoryItem[];
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(MonthlyBudget)
    private readonly budgetRepo: Repository<MonthlyBudget>,

    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,

    @InjectRepository(Couple)
    private readonly coupleRepo: Repository<Couple>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getMonthlyReport(
    userId: string,
    year: number,
    month: number,
  ): Promise<MonthlyReport> {
    validateYearMonth(year, month);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(ReportMessages.USER_NOT_FOUND);

    const budgets = await this.budgetRepo.find({
      where: { userId, year, month },
      relations: ['category'],
      order: { category: { name: 'ASC' } },
    });

    const budgetIds = budgets.map((b) => b.id);
    const allExpenses =
      budgetIds.length > 0
        ? await this.expenseRepo.find({
            where: { monthlyBudgetId: In(budgetIds) },
            order: { amount: 'DESC' },
          })
        : [];

    const expensesByBudget = new Map<string, Expense[]>();
    for (const e of allExpenses) {
      const list = expensesByBudget.get(e.monthlyBudgetId) ?? [];
      list.push(e);
      expensesByBudget.set(e.monthlyBudgetId, list);
    }

    const categories = budgets.map((budget) =>
      this.buildCategoryReport(budget, expensesByBudget.get(budget.id) ?? []),
    );

    const totalBudgeted = categories.reduce((s, c) => s + c.baseAmount, 0);
    const totalRollover = categories.reduce((s, c) => s + c.rolloverAmount, 0);
    const totalEffectiveBudget = categories.reduce((s, c) => s + c.totalAmount, 0);
    const totalSpent = categories.reduce((s, c) => s + c.totalSpent, 0);
    const totalRemaining = totalEffectiveBudget - totalSpent;
    const overallPercentageUsed =
      totalEffectiveBudget > 0
        ? Math.round((totalSpent / totalEffectiveBudget) * 100)
        : 0;

    return {
      userId,
      userName: user.name,
      year,
      month,
      totalBudgeted,
      totalRollover,
      totalEffectiveBudget,
      totalSpent,
      totalRemaining,
      overallPercentageUsed,
      categories,
    };
  }

  async getCoupleReport(
    requestingUserId: string,
    year: number,
    month: number,
  ): Promise<CoupleReport> {
    const partnerId = await this.getPartnerId(requestingUserId);

    const [me, partner] = await Promise.all([
      this.getMonthlyReport(requestingUserId, year, month),
      this.getMonthlyReport(partnerId, year, month),
    ]);

    return {
      year,
      month,
      me,
      partner,
      combinedTotalSpent: me.totalSpent + partner.totalSpent,
      combinedTotalBudget: me.totalEffectiveBudget + partner.totalEffectiveBudget,
    };
  }

  async getSpendingTrend(
    userId: string,
    monthsBack: number = 6,
  ): Promise<TrendItem[]> {
    validateMonthsBack(monthsBack);
    const periods = this.getLastNMonths(monthsBack);

    return Promise.all(
      periods.map(async ({ year, month }) => {
        const budgets = await this.budgetRepo.find({
          where: { userId, year, month },
        });

        const totalBudget = budgets.reduce((s, b) => s + Number(b.totalAmount), 0);
        const totalSpent = await this.getTotalSpentForPeriod(userId, year, month);
        const percentageUsed =
          totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

        return { year, month, totalSpent, totalBudget, percentageUsed };
      }),
    );
  }

  async getCategoryTrend(
    userId: string,
    monthsBack: number = 6,
  ): Promise<CategoryTrend[]> {
    validateMonthsBack(monthsBack);
    const periods = this.getLastNMonths(monthsBack);

    const allBudgets = await this.budgetRepo.find({
      where: periods.map(({ year, month }) => ({ userId, year, month })),
      relations: ['category'],
    });

    const categoryMap = new Map<string, { name: string; icon: string | null }>();
    for (const b of allBudgets) {
      if (!categoryMap.has(b.categoryId)) {
        categoryMap.set(b.categoryId, { name: b.category.name, icon: b.category.icon });
      }
    }

    if (categoryMap.size === 0) return [];

    const spentMap = await this.getTotalSpentBatch(allBudgets.map((b) => b.id));

    const budgetLookup = new Map<string, MonthlyBudget>();
    for (const b of allBudgets) {
      budgetLookup.set(`${b.categoryId}-${b.year}-${b.month}`, b);
    }

    const result: CategoryTrend[] = [];
    for (const [categoryId, meta] of categoryMap.entries()) {
      const trend = periods.map(({ year, month }) => {
        const budget = budgetLookup.get(`${categoryId}-${year}-${month}`);
        const totalBudget = budget ? Number(budget.totalAmount) : 0;
        const totalSpent = budget ? (spentMap.get(budget.id) ?? 0) : 0;
        const percentageUsed =
          totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
        return { year, month, totalSpent, totalBudget, percentageUsed };
      });
      result.push({ categoryId, categoryName: meta.name, categoryIcon: meta.icon, trend });
    }

    return result;
  }

  async getRolloverHistory(
    userId: string,
    categoryId: string,
    monthsBack: number = 6,
  ): Promise<CategoryRolloverHistory> {
    validateMonthsBack(monthsBack);
    const budget = await this.budgetRepo.findOne({
      where: { userId, categoryId },
      relations: ['category'],
    });
    if (!budget) {
      throw new NotFoundException(ReportMessages.NO_BUDGET_HISTORY);
    }

    const periods = this.getLastNMonths(monthsBack);

    const allPeriodBudgets = await this.budgetRepo.find({
      where: periods.map(({ year, month }) => ({ userId, categoryId, year, month })),
    });

    const spentMap = await this.getTotalSpentBatch(allPeriodBudgets.map((b) => b.id));

    const budgetByPeriod = new Map(
      allPeriodBudgets.map((b) => [`${b.year}-${b.month}`, b]),
    );

    const history: RolloverHistoryItem[] = periods.map(({ year, month }) => {
      const b = budgetByPeriod.get(`${year}-${month}`);
      if (!b) {
        return { year, month, baseAmount: 0, rolloverAmount: 0, totalAmount: 0, totalSpent: 0, leftover: 0 };
      }
      const totalSpent = spentMap.get(b.id) ?? 0;
      const leftover = Math.max(0, Number(b.totalAmount) - totalSpent);
      return {
        year,
        month,
        baseAmount: Number(b.baseAmount),
        rolloverAmount: Number(b.rolloverAmount),
        totalAmount: Number(b.totalAmount),
        totalSpent,
        leftover,
      };
    });

    return {
      categoryId,
      categoryName: budget.category.name,
      categoryIcon: budget.category.icon,
      history,
    };
  }

  private buildCategoryReport(budget: MonthlyBudget, expenses: Expense[]): CategoryReportItem {
    const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalAmount = Number(budget.totalAmount);
    const remaining = totalAmount - totalSpent;
    const percentage = totalAmount > 0 ? totalSpent / totalAmount : 0;

    let alertStatus: 'ok' | 'warning' | 'danger' | 'over' = 'ok';
    if (percentage >= 1) alertStatus = 'over';
    else if (percentage >= 0.95) alertStatus = 'danger';
    else if (percentage >= 0.8) alertStatus = 'warning';

    const topExpenses = expenses.slice(0, 3).map((e) => ({
      id: e.id,
      amount: Number(e.amount),
      note: e.note,
      expenseDate: e.expenseDate,
    }));

    return {
      categoryId: budget.categoryId,
      categoryName: budget.category.name,
      categoryIcon: budget.category.icon,
      baseAmount: Number(budget.baseAmount),
      rolloverAmount: Number(budget.rolloverAmount),
      totalAmount,
      totalSpent,
      remaining,
      percentageUsed: Math.round(percentage * 100),
      alertStatus,
      expenseCount: expenses.length,
      topExpenses,
    };
  }

  private async getTotalSpentForPeriod(
    userId: string,
    year: number,
    month: number,
  ): Promise<number> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const result = await this.expenseRepo
      .createQueryBuilder('expense')
      .select('COALESCE(SUM(expense.amount), 0)', 'total')
      .where('expense.user_id = :userId', { userId })
      .andWhere('expense.expense_date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    return Number(result.total);
  }

  private async getTotalSpentBatch(budgetIds: string[]): Promise<Map<string, number>> {
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

  private getLastNMonths(n: number): { year: number; month: number }[] {
    const result: { year: number; month: number }[] = [];
    const now = new Date();

    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }

    return result;
  }

  private async getPartnerId(userId: string): Promise<string> {
    const couple = await this.coupleRepo
      .createQueryBuilder('couple')
      .leftJoinAndSelect('couple.user1', 'user1')
      .leftJoinAndSelect('couple.user2', 'user2')
      .where('couple.user1_id = :userId OR couple.user2_id = :userId', { userId })
      .getOne();

    if (!couple) {
      throw new NotFoundException(ReportMessages.NO_PARTNER);
    }

    return couple.user1.id === userId ? couple.user2.id : couple.user1.id;
  }
}

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
import { ReportScope } from './dto/forecast-query.dto';

export interface ReportTopExpense {
  id: string;
  amount: number;
  note: string | null;
  expenseDate: Date;
  categoryName: string;
}

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
  totalExpenseCount: number;
  averageExpenseAmount: number;
  topExpenses: ReportTopExpense[];
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

export interface ForecastKeyDriver {
  categoryId: string;
  categoryName: string;
  shareOfSpend: number;
  totalSpent: number;
}

export interface SpendingForecast {
  year: number;
  month: number;
  scope: ReportScope;
  projectedSpent: number;
  projectedRemaining: number;
  burnRatePerDay: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  keyDrivers: ForecastKeyDriver[];
}

export interface FinancialHealthScore {
  year: number;
  month: number;
  scope: ReportScope.ME | ReportScope.BOTH;
  score: number;
  savingRate: number;
  budgetAdherence: number;
  expenseVolatility: number;
  insights: string[];
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

    const budgetById = new Map(budgets.map((b) => [b.id, b]));
    const topExpenses = allExpenses.slice(0, 5).map((e) => ({
      id: e.id,
      amount: Number(e.amount),
      note: e.note,
      expenseDate: e.expenseDate,
      categoryName: budgetById.get(e.monthlyBudgetId)?.category.name ?? '—',
    }));
    const totalExpenseCount = allExpenses.length;
    const averageExpenseAmount =
      totalExpenseCount > 0 ? Math.round(totalSpent / totalExpenseCount) : 0;

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
      totalExpenseCount,
      averageExpenseAmount,
      topExpenses,
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

  async getForecast(
    requestingUserId: string,
    year: number,
    month: number,
    scope: ReportScope = ReportScope.ME,
  ): Promise<SpendingForecast> {
    validateYearMonth(year, month);
    const reports = await this.resolveScopedMonthlyReports(
      requestingUserId,
      year,
      month,
      scope,
    );

    const totalEffectiveBudget = reports.reduce(
      (s, r) => s + r.totalEffectiveBudget,
      0,
    );
    const totalSpent = reports.reduce((s, r) => s + r.totalSpent, 0);

    const { daysElapsed, daysInMonth, daysRemaining } = this.getMonthProgress(
      year,
      month,
    );

    // When fewer than 3 days have elapsed the actual burn rate is too noisy.
    // Blend actual burn rate with the budget-implied daily rate to dampen wild
    // early-month projections. Weight shifts fully to actual after 14 days.
    const budgetDailyRate =
      daysInMonth > 0 ? Math.round(totalEffectiveBudget / daysInMonth) : 0;
    const actualBurnRate =
      daysElapsed > 0 ? Math.round(totalSpent / daysElapsed) : budgetDailyRate;

    const blendWeight = Math.min(1, daysElapsed / 14); // 0 → 1 over first 14 days
    const burnRatePerDay = Math.round(
      actualBurnRate * blendWeight + budgetDailyRate * (1 - blendWeight),
    );

    const projectedSpent = totalSpent + burnRatePerDay * daysRemaining;
    const projectedRemaining = Math.round(totalEffectiveBudget - projectedSpent);

    const mergedCategories = reports.flatMap((r) => r.categories);
    const keyDrivers = this.buildKeyDrivers(mergedCategories, totalSpent);

    const confidenceLevel =
      daysElapsed >= 20 ? 'high' : daysElapsed >= 10 ? 'medium' : 'low';

    return {
      year,
      month,
      scope,
      projectedSpent: Math.round(projectedSpent),
      projectedRemaining,
      burnRatePerDay,
      confidenceLevel,
      keyDrivers,
    };
  }

  async getHealthScore(
    requestingUserId: string,
    year: number,
    month: number,
    scope: ReportScope.ME | ReportScope.BOTH = ReportScope.ME,
  ): Promise<FinancialHealthScore> {
    validateYearMonth(year, month);
    const reports = await this.resolveScopedMonthlyReports(
      requestingUserId,
      year,
      month,
      scope,
    );

    const totalEffectiveBudget = reports.reduce(
      (s, r) => s + r.totalEffectiveBudget,
      0,
    );
    const totalSpent = reports.reduce((s, r) => s + r.totalSpent, 0);
    const totalRemaining = totalEffectiveBudget - totalSpent;

    const savingRate =
      totalEffectiveBudget > 0
        ? Math.round((totalRemaining / totalEffectiveBudget) * 100)
        : 0;
    const overallUsed =
      totalEffectiveBudget > 0
        ? Math.round((totalSpent / totalEffectiveBudget) * 100)
        : 0;
    const budgetAdherence = Math.max(0, 100 - overallUsed);

    const trend = await Promise.all(
      reports.map((r) => this.getSpendingTrend(r.userId, 3)),
    );
    const volatility = this.computeVolatility(
      trend.flat().map((t) => t.percentageUsed),
    );

    const score = Math.round(
      savingRate * 0.4 + budgetAdherence * 0.4 + (100 - volatility) * 0.2,
    );
    const clampedScore = Math.min(100, Math.max(0, score));

    const insights: string[] = [];
    if (overallUsed >= 90) {
      insights.push('Spending is near or above budget for the selected period.');
    } else if (savingRate >= 25) {
      insights.push('Strong savings rate relative to effective budget.');
    }
    if (volatility >= 35) {
      insights.push('Expense volatility is elevated across recent months.');
    } else {
      insights.push('Spending pattern is relatively stable month over month.');
    }

    return {
      year,
      month,
      scope,
      score: clampedScore,
      savingRate,
      budgetAdherence,
      expenseVolatility: volatility,
      insights,
    };
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

  private async resolveScopedMonthlyReports(
    requestingUserId: string,
    year: number,
    month: number,
    scope: ReportScope,
  ): Promise<MonthlyReport[]> {
    if (scope === ReportScope.ME) {
      return [await this.getMonthlyReport(requestingUserId, year, month)];
    }
    const partnerId = await this.getPartnerId(requestingUserId);
    if (scope === ReportScope.PARTNER) {
      return [await this.getMonthlyReport(partnerId, year, month)];
    }
    return Promise.all([
      this.getMonthlyReport(requestingUserId, year, month),
      this.getMonthlyReport(partnerId, year, month),
    ]);
  }

  private getMonthProgress(year: number, month: number) {
    const now = new Date();
    const isCurrentMonth =
      now.getFullYear() === year && now.getMonth() + 1 === month;
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysElapsed = isCurrentMonth
      ? now.getDate()
      : now > new Date(year, month - 1, daysInMonth)
        ? daysInMonth
        : 0;
    const daysRemaining = Math.max(0, daysInMonth - daysElapsed);
    return { daysElapsed, daysInMonth, daysRemaining };
  }

  private buildKeyDrivers(
    categories: CategoryReportItem[],
    totalSpent: number,
  ): ForecastKeyDriver[] {
    if (totalSpent <= 0) return [];
    const byCategory = new Map<string, ForecastKeyDriver>();
    for (const c of categories) {
      const existing = byCategory.get(c.categoryId);
      if (existing) {
        existing.totalSpent += c.totalSpent;
      } else {
        byCategory.set(c.categoryId, {
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          totalSpent: c.totalSpent,
          shareOfSpend: 0,
        });
      }
    }
    return [...byCategory.values()]
      .map((d) => ({
        ...d,
        shareOfSpend: Math.round((d.totalSpent / totalSpent) * 100),
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
  }

  private computeVolatility(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance =
      values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    return Math.round(Math.sqrt(variance));
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

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { MonthlyBudget } from '../../database/entities/monthly-budget.entity';
import { Expense } from '../../database/entities/expense.entity';
import { Couple } from '../../database/entities/couple.entity';
import { User } from '../../database/entities/user.entity';
import { Category } from '../../database/entities/category.entity';

const USER_ID = 'user-uuid';
const PARTNER_ID = 'partner-uuid';
const CAT_ID = 'cat-uuid';
const BUDGET_ID = 'budget-uuid';

const makeUser = (overrides: Partial<User> = {}): User =>
  ({ id: USER_ID, name: 'Dimas', email: 'dimas@example.com', createdAt: new Date(), ...overrides }) as User;

const makeCategory = (overrides: Partial<Category> = {}): Category =>
  ({ id: CAT_ID, name: 'Food', icon: '🍔', userId: USER_ID, ...overrides }) as Category;

const makeBudget = (overrides: Partial<MonthlyBudget> = {}): MonthlyBudget =>
  ({
    id: BUDGET_ID,
    userId: USER_ID,
    categoryId: CAT_ID,
    category: makeCategory(),
    year: 2025,
    month: 5,
    baseAmount: 500000,
    rolloverAmount: 0,
    totalAmount: 500000,
    isFinalized: false,
    ...overrides,
  }) as MonthlyBudget;

const makeExpense = (overrides: Partial<Expense> = {}): Expense =>
  ({
    id: 'expense-uuid',
    userId: USER_ID,
    categoryId: CAT_ID,
    monthlyBudgetId: BUDGET_ID,
    amount: 100000,
    note: 'Test',
    expenseDate: new Date('2025-05-10'),
    createdAt: new Date(),
    ...overrides,
  }) as Expense;

describe('ReportsService', () => {
  let service: ReportsService;

  // QB for getTotalSpentForPeriod (select/where/andWhere/getRawOne)
  const periodQb = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
  };

  // QB for getTotalSpentBatch (select/addSelect/where/groupBy/getRawMany)
  const batchQb = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  const coupleQb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const budgetRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const expenseRepo = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const coupleRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(coupleQb),
  };

  const userRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getRepositoryToken(MonthlyBudget), useValue: budgetRepo },
        { provide: getRepositoryToken(Expense), useValue: expenseRepo },
        { provide: getRepositoryToken(Couple), useValue: coupleRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get(ReportsService);
    jest.clearAllMocks();

    coupleRepo.createQueryBuilder.mockReturnValue(coupleQb);
    coupleQb.leftJoinAndSelect.mockReturnThis();
    coupleQb.where.mockReturnThis();

    periodQb.select.mockReturnThis();
    periodQb.where.mockReturnThis();
    periodQb.andWhere.mockReturnThis();
    periodQb.getRawOne.mockResolvedValue({ total: '0' });

    batchQb.select.mockReturnThis();
    batchQb.addSelect.mockReturnThis();
    batchQb.where.mockReturnThis();
    batchQb.groupBy.mockReturnThis();
    batchQb.getRawMany.mockResolvedValue([]);

    // Default: expense createQueryBuilder returns periodQb (for getSpendingTrend)
    expenseRepo.createQueryBuilder.mockReturnValue(periodQb);
    expenseRepo.find.mockResolvedValue([]);
  });

  // ─────────────────────────────────────────
  // getMonthlyReport
  // ─────────────────────────────────────────
  describe('getMonthlyReport', () => {
    it('returns a monthly report with aggregated totals', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      budgetRepo.find.mockResolvedValue([makeBudget({ totalAmount: 500000 })]);
      expenseRepo.find.mockResolvedValue([makeExpense({ amount: 200000 })]);

      const result = await service.getMonthlyReport(USER_ID, 2025, 5);

      expect(result.userId).toBe(USER_ID);
      expect(result.userName).toBe('Dimas');
      expect(result.year).toBe(2025);
      expect(result.month).toBe(5);
      expect(result.totalEffectiveBudget).toBe(500000);
      expect(result.totalSpent).toBe(200000);
      expect(result.totalRemaining).toBe(300000);
      expect(result.overallPercentageUsed).toBe(40);
      expect(result.categories).toHaveLength(1);
    });

    it('returns zero totals when no budgets exist for the month', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      budgetRepo.find.mockResolvedValue([]);

      const result = await service.getMonthlyReport(USER_ID, 2025, 5);

      expect(result.categories).toHaveLength(0);
      expect(result.totalSpent).toBe(0);
      expect(result.overallPercentageUsed).toBe(0);
      expect(result.topExpenses).toHaveLength(0);
      expect(result.totalExpenseCount).toBe(0);
      expect(result.averageExpenseAmount).toBe(0);
    });

    it('throws NotFoundException when user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.getMonthlyReport('bad-id', 2025, 5)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('aggregates multiple categories correctly', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      budgetRepo.find.mockResolvedValue([
        makeBudget({ id: 'b1', totalAmount: 300000 }),
        makeBudget({ id: 'b2', categoryId: 'cat-2', totalAmount: 200000 }),
      ]);
      expenseRepo.find.mockResolvedValue([
        makeExpense({ monthlyBudgetId: 'b1', amount: 150000 }),
        makeExpense({ monthlyBudgetId: 'b2', amount: 100000 }),
      ]);

      const result = await service.getMonthlyReport(USER_ID, 2025, 5);

      expect(result.categories).toHaveLength(2);
      expect(result.totalEffectiveBudget).toBe(500000);
      expect(result.totalSpent).toBe(250000);
    });
  });

  // ─────────────────────────────────────────
  // buildCategoryReport (via getMonthlyReport)
  // ─────────────────────────────────────────
  describe('category report alert status', () => {
    const cases: Array<[number, number, string]> = [
      [500000, 0, 'ok'],
      [500000, 390000, 'ok'],       // 78%
      [500000, 400000, 'warning'],  // 80%
      [500000, 470000, 'warning'],  // 94%
      [500000, 475000, 'danger'],   // 95%
      [500000, 495000, 'danger'],   // 99%
      [500000, 500000, 'over'],     // 100%
      [500000, 600000, 'over'],     // 120%
    ];

    test.each(cases)(
      'totalAmount=%i spent=%i → alertStatus "%s"',
      async (totalAmount, spent, expected) => {
        userRepo.findOne.mockResolvedValue(makeUser());
        budgetRepo.find.mockResolvedValue([makeBudget({ totalAmount })]);
        expenseRepo.find.mockResolvedValue(
          spent > 0 ? [makeExpense({ amount: spent })] : [],
        );

        const result = await service.getMonthlyReport(USER_ID, 2025, 5);
        expect(result.categories[0].alertStatus).toBe(expected);
      },
    );
  });

  describe('category report top expenses', () => {
    it('returns at most 3 top expenses ordered by amount descending', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      budgetRepo.find.mockResolvedValue([makeBudget()]);
      expenseRepo.find.mockResolvedValue([
        makeExpense({ id: 'e1', amount: 200000 }),
        makeExpense({ id: 'e2', amount: 150000 }),
        makeExpense({ id: 'e3', amount: 100000 }),
        makeExpense({ id: 'e4', amount: 50000 }),
      ]);

      const result = await service.getMonthlyReport(USER_ID, 2025, 5);

      expect(result.categories[0].expenseCount).toBe(4);
      expect(result.categories[0].topExpenses).toHaveLength(3);
      expect(result.categories[0].topExpenses[0].id).toBe('e1');
    });

    it('returns global top 5 expenses with category names', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      budgetRepo.find.mockResolvedValue([makeBudget()]);
      expenseRepo.find.mockResolvedValue([
        makeExpense({ id: 'e1', amount: 200000, note: 'Belanja mingguan' }),
        makeExpense({ id: 'e2', amount: 150000 }),
        makeExpense({ id: 'e3', amount: 100000 }),
        makeExpense({ id: 'e4', amount: 50000 }),
        makeExpense({ id: 'e5', amount: 40000 }),
        makeExpense({ id: 'e6', amount: 30000 }),
      ]);

      const result = await service.getMonthlyReport(USER_ID, 2025, 5);

      expect(result.topExpenses).toHaveLength(5);
      expect(result.topExpenses[0].id).toBe('e1');
      expect(result.topExpenses[0].categoryName).toBe('Food');
      expect(result.topExpenses[0].note).toBe('Belanja mingguan');
      expect(result.totalExpenseCount).toBe(6);
      expect(result.averageExpenseAmount).toBe(Math.round(570000 / 6));
    });

    it('includes rolloverAmount in category report', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      budgetRepo.find.mockResolvedValue([makeBudget({ rolloverAmount: 75000 })]);
      expenseRepo.find.mockResolvedValue([]);

      const result = await service.getMonthlyReport(USER_ID, 2025, 5);

      expect(result.categories[0].rolloverAmount).toBe(75000);
      expect(result.totalRollover).toBe(75000);
    });
  });

  // ─────────────────────────────────────────
  // getCoupleReport
  // ─────────────────────────────────────────
  describe('getCoupleReport', () => {
    it('returns combined report for both partners', async () => {
      coupleQb.getOne.mockResolvedValue({
        user1: { id: USER_ID },
        user2: { id: PARTNER_ID },
      });
      userRepo.findOne
        .mockResolvedValueOnce(makeUser({ id: USER_ID, name: 'Dimas' }))
        .mockResolvedValueOnce(makeUser({ id: PARTNER_ID, name: 'Partner' }));
      budgetRepo.find.mockResolvedValue([]);

      const result = await service.getCoupleReport(USER_ID, 2025, 5);

      expect(result.me.userId).toBe(USER_ID);
      expect(result.partner.userId).toBe(PARTNER_ID);
      expect(result.combinedTotalSpent).toBe(0);
      expect(result.combinedTotalBudget).toBe(0);
    });

    it('calculates combinedTotalSpent correctly', async () => {
      coupleQb.getOne.mockResolvedValue({
        user1: { id: USER_ID },
        user2: { id: PARTNER_ID },
      });
      userRepo.findOne
        .mockResolvedValueOnce(makeUser({ id: USER_ID }))
        .mockResolvedValueOnce(makeUser({ id: PARTNER_ID }));
      budgetRepo.find
        .mockResolvedValueOnce([makeBudget({ totalAmount: 500000 })])
        .mockResolvedValueOnce([makeBudget({ totalAmount: 400000 })]);
      expenseRepo.find
        .mockResolvedValueOnce([makeExpense({ amount: 200000 })])
        .mockResolvedValueOnce([makeExpense({ amount: 150000 })]);

      const result = await service.getCoupleReport(USER_ID, 2025, 5);

      expect(result.combinedTotalSpent).toBe(350000);
      expect(result.combinedTotalBudget).toBe(900000);
    });

    it('throws NotFoundException when user has no partner', async () => {
      coupleQb.getOne.mockResolvedValue(null);
      await expect(service.getCoupleReport(USER_ID, 2025, 5)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('resolves partner correctly when requesting user is user2', async () => {
      coupleQb.getOne.mockResolvedValue({
        user1: { id: PARTNER_ID },
        user2: { id: USER_ID },
      });
      userRepo.findOne
        .mockResolvedValueOnce(makeUser({ id: USER_ID }))
        .mockResolvedValueOnce(makeUser({ id: PARTNER_ID }));
      budgetRepo.find.mockResolvedValue([]);

      const result = await service.getCoupleReport(USER_ID, 2025, 5);

      expect(result.me.userId).toBe(USER_ID);
      expect(result.partner.userId).toBe(PARTNER_ID);
    });
  });

  // ─────────────────────────────────────────
  // getSpendingTrend
  // ─────────────────────────────────────────
  describe('getSpendingTrend', () => {
    it('returns N trend items for the last N months', async () => {
      budgetRepo.find.mockResolvedValue([]);
      periodQb.getRawOne.mockResolvedValue({ total: '0' });

      const result = await service.getSpendingTrend(USER_ID, 3);

      expect(result).toHaveLength(3);
      result.forEach((item) => {
        expect(item).toHaveProperty('year');
        expect(item).toHaveProperty('month');
        expect(item).toHaveProperty('totalSpent');
        expect(item).toHaveProperty('totalBudget');
        expect(item).toHaveProperty('percentageUsed');
      });
    });

    it('returns zero percentageUsed when totalBudget is zero', async () => {
      budgetRepo.find.mockResolvedValue([]);
      periodQb.getRawOne.mockResolvedValue({ total: '0' });

      const result = await service.getSpendingTrend(USER_ID, 1);

      expect(result[0].percentageUsed).toBe(0);
    });

    it('calculates percentageUsed correctly when budget exists', async () => {
      budgetRepo.find.mockResolvedValue([makeBudget({ totalAmount: 500000 })]);
      periodQb.getRawOne.mockResolvedValue({ total: '250000' });

      const result = await service.getSpendingTrend(USER_ID, 1);

      expect(result[0].totalBudget).toBe(500000);
      expect(result[0].totalSpent).toBe(250000);
      expect(result[0].percentageUsed).toBe(50);
    });

    it('defaults to 6 months when monthsBack is not provided', async () => {
      budgetRepo.find.mockResolvedValue([]);
      periodQb.getRawOne.mockResolvedValue({ total: '0' });

      const result = await service.getSpendingTrend(USER_ID);

      expect(result).toHaveLength(6);
    });

    it('returns months in chronological order (oldest first)', async () => {
      budgetRepo.find.mockResolvedValue([]);
      periodQb.getRawOne.mockResolvedValue({ total: '0' });

      const result = await service.getSpendingTrend(USER_ID, 3);

      for (let i = 1; i < result.length; i++) {
        const prev = result[i - 1];
        const curr = result[i];
        const prevVal = prev.year * 12 + prev.month;
        const currVal = curr.year * 12 + curr.month;
        expect(currVal).toBeGreaterThan(prevVal);
      }
    });
  });

  // ─────────────────────────────────────────
  // getCategoryTrend
  // ─────────────────────────────────────────
  describe('getCategoryTrend', () => {
    it('returns one entry per unique category with N trend items each', async () => {
      const cat2 = makeCategory({ id: 'cat-2', name: 'Transport', icon: '🚗' });
      budgetRepo.find.mockResolvedValue([
        makeBudget({ categoryId: CAT_ID, category: makeCategory() }),
        makeBudget({ id: 'b2', categoryId: 'cat-2', category: cat2 }),
      ]);
      expenseRepo.createQueryBuilder.mockReturnValue(batchQb);
      batchQb.getRawMany.mockResolvedValue([]);

      const result = await service.getCategoryTrend(USER_ID, 3);

      expect(result).toHaveLength(2);
      expect(result[0].trend).toHaveLength(3);
      expect(result[1].trend).toHaveLength(3);
    });

    it('returns empty array when user has no budget history', async () => {
      budgetRepo.find.mockResolvedValue([]);

      const result = await service.getCategoryTrend(USER_ID, 6);

      expect(result).toHaveLength(0);
    });

    it('de-duplicates categories that appear in multiple months', async () => {
      budgetRepo.find.mockResolvedValue([
        makeBudget({ id: 'b1', month: 4 }),
        makeBudget({ id: 'b2', month: 5 }),
      ]);
      expenseRepo.createQueryBuilder.mockReturnValue(batchQb);
      batchQb.getRawMany.mockResolvedValue([]);

      const result = await service.getCategoryTrend(USER_ID, 3);

      expect(result).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────
  // getRolloverHistory
  // ─────────────────────────────────────────
  describe('getRolloverHistory', () => {
    it('returns rollover history with leftover calculated per month', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-05-01'));

      const periodBudgets = [
        makeBudget({ year: 2025, month: 4, totalAmount: 500000 }),
        makeBudget({ id: 'b2', year: 2025, month: 5, totalAmount: 500000 }),
      ];
      budgetRepo.findOne.mockResolvedValue(makeBudget());
      budgetRepo.find.mockResolvedValue(periodBudgets);
      expenseRepo.createQueryBuilder.mockReturnValue(batchQb);
      batchQb.getRawMany.mockResolvedValue([
        { budgetId: BUDGET_ID, total: '200000' },
        { budgetId: 'b2', total: '200000' },
      ]);

      const result = await service.getRolloverHistory(USER_ID, CAT_ID, 2);

      expect(result.categoryId).toBe(CAT_ID);
      expect(result.categoryName).toBe('Food');
      expect(result.history).toHaveLength(2);
      expect(result.history[0].leftover).toBe(300000);

      jest.useRealTimers();
    });

    it('returns zeros for months with no budget data', async () => {
      budgetRepo.findOne.mockResolvedValue(makeBudget());
      budgetRepo.find.mockResolvedValue([]);

      const result = await service.getRolloverHistory(USER_ID, CAT_ID, 2);

      result.history.forEach((item) => {
        expect(item.totalSpent).toBe(0);
        expect(item.leftover).toBe(0);
        expect(item.totalAmount).toBe(0);
      });
    });

    it('caps leftover at 0 when spending exceeds budget', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-05-01'));

      budgetRepo.findOne.mockResolvedValue(makeBudget());
      budgetRepo.find.mockResolvedValue([makeBudget({ year: 2025, month: 5, totalAmount: 300000 })]);
      expenseRepo.createQueryBuilder.mockReturnValue(batchQb);
      batchQb.getRawMany.mockResolvedValue([{ budgetId: BUDGET_ID, total: '400000' }]);

      const result = await service.getRolloverHistory(USER_ID, CAT_ID, 1);

      expect(result.history[0].leftover).toBe(0);

      jest.useRealTimers();
    });

    it('throws NotFoundException when no budget exists for the category', async () => {
      budgetRepo.findOne.mockResolvedValue(null);
      await expect(service.getRolloverHistory(USER_ID, 'bad-cat', 6)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─────────────────────────────────────────
  // getLastNMonths (via getSpendingTrend)
  // ─────────────────────────────────────────
  describe('getLastNMonths boundary', () => {
    it('wraps correctly across a January boundary', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-02-01'));
      budgetRepo.find.mockResolvedValue([]);
      periodQb.getRawOne.mockResolvedValue({ total: '0' });

      const result = await service.getSpendingTrend(USER_ID, 3);

      expect(result[0]).toMatchObject({ year: 2024, month: 12 });
      expect(result[1]).toMatchObject({ year: 2025, month: 1 });
      expect(result[2]).toMatchObject({ year: 2025, month: 2 });

      jest.useRealTimers();
    });
  });
});

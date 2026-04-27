import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { ActivityService } from '../activity/activity.service';
import { MonthlyBudget } from '../../database/entities/monthly-budget.entity';
import { Expense } from '../../database/entities/expense.entity';
import { Couple } from '../../database/entities/couple.entity';
import { Category } from '../../database/entities/category.entity';

const USER_ID = 'user-uuid';
const PARTNER_ID = 'partner-uuid';
const CAT_ID = 'cat-uuid';
const BUDGET_ID = 'budget-uuid';

const makeCategory = (overrides: Partial<Category> = {}): Category =>
  ({ id: CAT_ID, userId: USER_ID, name: 'Food', icon: '🍔', ...overrides }) as Category;

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
    expenses: [],
    ...overrides,
  }) as MonthlyBudget;

const makeCouple = (user1Id = USER_ID, user2Id = PARTNER_ID) =>
  ({ id: 'couple-uuid', user1Id, user2Id }) as Couple;

describe('BudgetsService', () => {
  let service: BudgetsService;

  // QB for single-budget getTotalSpent (select/where/getRawOne)
  const singleQb = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
  };

  // QB for batch getTotalSpentBatch (select/addSelect/where/groupBy/getRawMany)
  const batchQb = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  const budgetRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const expenseRepo = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const coupleRepo = {
    findOne: jest.fn(),
  };

  const categoryRepo = {
    findOne: jest.fn(),
  };

  const activityService = { log: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        { provide: getRepositoryToken(MonthlyBudget), useValue: budgetRepo },
        { provide: getRepositoryToken(Expense), useValue: expenseRepo },
        { provide: getRepositoryToken(Couple), useValue: coupleRepo },
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
        { provide: ActivityService, useValue: activityService },
      ],
    }).compile();

    service = module.get(BudgetsService);
    jest.clearAllMocks();

    singleQb.select.mockReturnThis();
    singleQb.where.mockReturnThis();
    singleQb.getRawOne.mockResolvedValue({ total: '0' });

    batchQb.select.mockReturnThis();
    batchQb.addSelect.mockReturnThis();
    batchQb.where.mockReturnThis();
    batchQb.groupBy.mockReturnThis();
    batchQb.getRawMany.mockResolvedValue([]);

    // Default: createQueryBuilder returns singleQb (used by getTotalSpent in create/findOne)
    expenseRepo.createQueryBuilder.mockReturnValue(singleQb);
  });

  describe('create', () => {
    const dto = { categoryId: CAT_ID, year: 2025, month: 5, baseAmount: 500000 };

    it('creates a budget with zero rollover when no previous month exists', async () => {
      categoryRepo.findOne.mockResolvedValue(makeCategory());
      budgetRepo.findOne.mockResolvedValueOnce(null); // no existing budget
      budgetRepo.findOne.mockResolvedValueOnce(null); // no previous month budget
      const budget = makeBudget();
      budgetRepo.create.mockReturnValue(budget);
      budgetRepo.save.mockResolvedValue(budget);

      const result = await service.create(USER_ID, dto);

      expect(budgetRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ baseAmount: 500000, rolloverAmount: 0, totalAmount: 500000 }),
      );
      expect(result).toEqual(budget);
    });

    it('rolls over unspent amount from the previous month', async () => {
      categoryRepo.findOne.mockResolvedValue(makeCategory());
      budgetRepo.findOne.mockResolvedValueOnce(null); // no existing budget
      const prevBudget = makeBudget({ month: 4, totalAmount: 500000 });
      budgetRepo.findOne.mockResolvedValueOnce(prevBudget); // prev month budget
      singleQb.getRawOne.mockResolvedValue({ total: '300000' }); // spent 300k
      const budget = makeBudget({ rolloverAmount: 200000, totalAmount: 700000 });
      budgetRepo.create.mockReturnValue(budget);
      budgetRepo.save.mockResolvedValue(budget);

      const result = await service.create(USER_ID, dto);

      expect(budgetRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ rolloverAmount: 200000, totalAmount: 700000 }),
      );
      expect(result.rolloverAmount).toBe(200000);
    });

    it('sets rollover to zero when previous month was overspent', async () => {
      categoryRepo.findOne.mockResolvedValue(makeCategory());
      budgetRepo.findOne.mockResolvedValueOnce(null);
      const prevBudget = makeBudget({ month: 4, totalAmount: 200000 });
      budgetRepo.findOne.mockResolvedValueOnce(prevBudget);
      singleQb.getRawOne.mockResolvedValue({ total: '300000' }); // overspent
      const budget = makeBudget();
      budgetRepo.create.mockReturnValue(budget);
      budgetRepo.save.mockResolvedValue(budget);

      await service.create(USER_ID, dto);

      expect(budgetRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ rolloverAmount: 0 }),
      );
    });

    it('throws NotFoundException when category does not belong to user', async () => {
      categoryRepo.findOne.mockResolvedValue(null);
      await expect(service.create(USER_ID, dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when a budget already exists for that month', async () => {
      categoryRepo.findOne.mockResolvedValue(makeCategory());
      budgetRepo.findOne.mockResolvedValueOnce(makeBudget()); // existing budget
      await expect(service.create(USER_ID, dto)).rejects.toThrow(ConflictException);
    });

    it('wraps rollover correctly across January boundary (month=1 → prev is Dec of prev year)', async () => {
      categoryRepo.findOne.mockResolvedValue(makeCategory());
      budgetRepo.findOne.mockResolvedValueOnce(null);
      const prevBudget = makeBudget({ year: 2024, month: 12, totalAmount: 500000 });
      budgetRepo.findOne.mockResolvedValueOnce(prevBudget);
      singleQb.getRawOne.mockResolvedValue({ total: '100000' });
      const budget = makeBudget({ month: 1, rolloverAmount: 400000, totalAmount: 900000 });
      budgetRepo.create.mockReturnValue(budget);
      budgetRepo.save.mockResolvedValue(budget);

      await service.create(USER_ID, { ...dto, year: 2025, month: 1 });

      const prevMonthQuery = budgetRepo.findOne.mock.calls[1][0];
      expect(prevMonthQuery.where).toMatchObject({ year: 2024, month: 12 });
    });
  });

  describe('findAllByMonth', () => {
    it('returns budgets with computed stats attached', async () => {
      const budgets = [makeBudget()];
      budgetRepo.find.mockResolvedValue(budgets);
      expenseRepo.createQueryBuilder.mockReturnValue(batchQb);
      batchQb.getRawMany.mockResolvedValue([{ budgetId: BUDGET_ID, total: '100000' }]);

      const result = await service.findAllByMonth(USER_ID, 2025, 5);

      expect(result).toHaveLength(1);
      expect(result[0].totalSpent).toBe(100000);
      expect(result[0].remaining).toBe(400000);
      expect(result[0].percentageUsed).toBe(20);
      expect(result[0].alertStatus).toBe('ok');
    });
  });

  describe('findOne', () => {
    it('returns a budget with stats', async () => {
      budgetRepo.findOne.mockResolvedValue(makeBudget());
      singleQb.getRawOne.mockResolvedValue({ total: '0' });

      const result = await service.findOne(USER_ID, BUDGET_ID);

      expect(result.id).toBe(BUDGET_ID);
      expect(result.totalSpent).toBe(0);
    });

    it('throws NotFoundException when budget does not exist', async () => {
      budgetRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(USER_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates baseAmount and recalculates totalAmount', async () => {
      const budget = makeBudget({ rolloverAmount: 50000 });
      budgetRepo.findOne.mockResolvedValue(budget);
      budgetRepo.save.mockImplementation((b) => Promise.resolve(b));

      const result = await service.update(USER_ID, BUDGET_ID, { baseAmount: 600000 });

      expect(result.baseAmount).toBe(600000);
      expect(result.totalAmount).toBe(650000);
    });

    it('throws NotFoundException when budget does not exist', async () => {
      budgetRepo.findOne.mockResolvedValue(null);
      await expect(service.update(USER_ID, 'bad-id', { baseAmount: 100 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when budget is finalized', async () => {
      budgetRepo.findOne.mockResolvedValue(makeBudget({ isFinalized: true }));
      await expect(service.update(USER_ID, BUDGET_ID, { baseAmount: 100 })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('removes a budget with no expenses', async () => {
      budgetRepo.findOne.mockResolvedValue(makeBudget());
      expenseRepo.count.mockResolvedValue(0);
      budgetRepo.remove.mockResolvedValue(undefined);

      const result = await service.remove(USER_ID, BUDGET_ID);

      expect(budgetRepo.remove).toHaveBeenCalled();
      expect(result).toEqual({ id: BUDGET_ID });
    });

    it('throws NotFoundException when budget does not exist', async () => {
      budgetRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(USER_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when budget has expenses', async () => {
      budgetRepo.findOne.mockResolvedValue(makeBudget());
      expenseRepo.count.mockResolvedValue(3);
      await expect(service.remove(USER_ID, BUDGET_ID)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('finalizeMonth', () => {
    it('finalizes all non-finalized budgets for the month', async () => {
      const budgets = [makeBudget(), makeBudget({ id: 'b2' })];
      budgetRepo.find.mockResolvedValue(budgets);
      budgetRepo.save.mockImplementation((b) => Promise.resolve(b));

      const result = await service.finalizeMonth(USER_ID, 2025, 5);

      expect(result).toEqual({ finalized: 2 });
      budgets.forEach((b) => expect(b.isFinalized).toBe(true));
    });

    it('returns finalized: 0 when all budgets are already finalized', async () => {
      budgetRepo.find.mockResolvedValue([]);
      const result = await service.finalizeMonth(USER_ID, 2025, 5);
      expect(result).toEqual({ finalized: 0 });
    });
  });

  describe('findPartnerBudgets', () => {
    it('returns partner budgets when couple exists', async () => {
      coupleRepo.findOne.mockResolvedValue(makeCouple());
      budgetRepo.find.mockResolvedValue([makeBudget({ userId: PARTNER_ID })]);
      expenseRepo.createQueryBuilder.mockReturnValue(batchQb);
      batchQb.getRawMany.mockResolvedValue([{ budgetId: BUDGET_ID, total: '0' }]);

      const result = await service.findPartnerBudgets(USER_ID, 2025, 5);

      expect(result).toHaveLength(1);
    });

    it('throws NotFoundException when user has no partner', async () => {
      coupleRepo.findOne.mockResolvedValue(null);
      await expect(service.findPartnerBudgets(USER_ID, 2025, 5)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('alert status thresholds', () => {
    const cases: Array<[number, string]> = [
      [0, 'ok'],
      [79, 'ok'],
      [80, 'warning'],
      [94, 'warning'],
      [95, 'danger'],
      [99, 'danger'],
      [100, 'over'],
      [120, 'over'],
    ];

    test.each(cases)('%i%% spent → alertStatus "%s"', async (pct, expected) => {
      const totalAmount = 100000;
      const totalSpent = (totalAmount * pct) / 100;
      budgetRepo.findOne.mockResolvedValue(makeBudget({ totalAmount }));
      singleQb.getRawOne.mockResolvedValue({ total: String(totalSpent) });

      const result = await service.findOne(USER_ID, BUDGET_ID);

      expect(result.alertStatus).toBe(expected);
    });
  });
});

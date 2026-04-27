import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ActivityService } from '../activity/activity.service';
import { Expense } from '../../database/entities/expense.entity';
import { MonthlyBudget } from '../../database/entities/monthly-budget.entity';
import { Couple } from '../../database/entities/couple.entity';
import { Category } from '../../database/entities/category.entity';

const USER_ID = 'user-uuid';
const PARTNER_ID = 'partner-uuid';
const CAT_ID = 'cat-uuid';
const BUDGET_ID = 'budget-uuid';
const EXPENSE_ID = 'expense-uuid';

const makeCategory = (overrides: Partial<Category> = {}): Category =>
  ({ id: CAT_ID, userId: USER_ID, name: 'Food', icon: '🍔', ...overrides }) as Category;

const makeBudget = (overrides: Partial<MonthlyBudget> = {}): MonthlyBudget =>
  ({
    id: BUDGET_ID,
    userId: USER_ID,
    categoryId: CAT_ID,
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
    id: EXPENSE_ID,
    userId: USER_ID,
    categoryId: CAT_ID,
    monthlyBudgetId: BUDGET_ID,
    amount: 85000,
    note: 'Dinner',
    expenseDate: new Date('2025-05-14'),
    createdAt: new Date('2025-05-14T10:00:00Z'),
    category: { id: CAT_ID, name: 'Food', icon: '🍔' } as any,
    ...overrides,
  }) as Expense;

const makeCouple = (user1Id = USER_ID, user2Id = PARTNER_ID) =>
  ({
    id: 'couple-uuid',
    user1: { id: user1Id },
    user2: { id: user2Id },
    user1Id,
    user2Id,
  }) as Couple;

describe('ExpensesService', () => {
  let service: ExpensesService;

  const mockQb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const expenseRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const budgetRepo = {
    findOne: jest.fn(),
  };

  const coupleRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQb),
  };

  const categoryRepo = {
    findOne: jest.fn(),
  };

  const activityService = { log: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: getRepositoryToken(Expense), useValue: expenseRepo },
        { provide: getRepositoryToken(MonthlyBudget), useValue: budgetRepo },
        { provide: getRepositoryToken(Couple), useValue: coupleRepo },
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
        { provide: ActivityService, useValue: activityService },
      ],
    }).compile();

    service = module.get(ExpensesService);
    jest.clearAllMocks();
    coupleRepo.createQueryBuilder.mockReturnValue(mockQb);
    mockQb.leftJoinAndSelect.mockReturnThis();
    mockQb.where.mockReturnThis();
  });

  describe('create', () => {
    const dto = {
      categoryId: CAT_ID,
      amount: 85000,
      note: 'Dinner',
      expenseDate: '2025-05-14',
    };

    it('creates an expense linked to the correct monthly budget', async () => {
      categoryRepo.findOne.mockResolvedValue(makeCategory());
      budgetRepo.findOne.mockResolvedValue(makeBudget());
      const expense = makeExpense();
      expenseRepo.create.mockReturnValue(expense);
      expenseRepo.save.mockResolvedValue(expense);

      const result = await service.create(USER_ID, dto);

      expect(expenseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          categoryId: CAT_ID,
          monthlyBudgetId: BUDGET_ID,
          amount: 85000,
        }),
      );
      expect(result).toEqual(expense);
    });

    it('throws NotFoundException when category does not belong to user', async () => {
      categoryRepo.findOne.mockResolvedValue(null);
      await expect(service.create(USER_ID, dto)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when no budget exists for the category/month', async () => {
      categoryRepo.findOne.mockResolvedValue(makeCategory());
      budgetRepo.findOne.mockResolvedValue(null);
      await expect(service.create(USER_ID, dto)).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when the budget is finalized', async () => {
      categoryRepo.findOne.mockResolvedValue(makeCategory());
      budgetRepo.findOne.mockResolvedValue(makeBudget({ isFinalized: true }));
      await expect(service.create(USER_ID, dto)).rejects.toThrow(ForbiddenException);
    });

    it('derives year and month from expenseDate to find the budget', async () => {
      categoryRepo.findOne.mockResolvedValue(makeCategory());
      budgetRepo.findOne.mockResolvedValue(makeBudget());
      expenseRepo.create.mockReturnValue(makeExpense());
      expenseRepo.save.mockResolvedValue(makeExpense());

      await service.create(USER_ID, { ...dto, expenseDate: '2025-05-14' });

      const budgetQuery = budgetRepo.findOne.mock.calls[0][0];
      expect(budgetQuery.where).toMatchObject({ year: 2025, month: 5 });
    });
  });

  describe('findAllByMonth', () => {
    it('returns expenses for the given month ordered by date descending', async () => {
      const expenses = [makeExpense(), makeExpense({ id: 'e2', amount: 25000 })];
      expenseRepo.find.mockResolvedValue(expenses);

      const result = await service.findAllByMonth(USER_ID, 2025, 5);

      expect(result).toHaveLength(2);
      expect(expenseRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { expenseDate: 'DESC', createdAt: 'DESC' },
        }),
      );
    });

    it('filters by categoryId when provided', async () => {
      expenseRepo.find.mockResolvedValue([makeExpense()]);

      await service.findAllByMonth(USER_ID, 2025, 5, CAT_ID);

      const callArg = expenseRepo.find.mock.calls[0][0];
      expect(callArg.where).toMatchObject({ categoryId: CAT_ID });
    });

    it('does not include categoryId filter when not provided', async () => {
      expenseRepo.find.mockResolvedValue([]);

      await service.findAllByMonth(USER_ID, 2025, 5);

      const callArg = expenseRepo.find.mock.calls[0][0];
      expect(callArg.where).not.toHaveProperty('categoryId');
    });
  });

  describe('findAllByBudget', () => {
    it('returns expenses under the specified budget', async () => {
      budgetRepo.findOne.mockResolvedValue(makeBudget());
      expenseRepo.find.mockResolvedValue([makeExpense()]);

      const result = await service.findAllByBudget(USER_ID, BUDGET_ID);

      expect(result).toHaveLength(1);
    });

    it('throws NotFoundException when budget does not belong to user', async () => {
      budgetRepo.findOne.mockResolvedValue(null);
      await expect(service.findAllByBudget(USER_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('returns a single expense', async () => {
      expenseRepo.findOne.mockResolvedValue(makeExpense());

      const result = await service.findOne(USER_ID, EXPENSE_ID);

      expect(result.id).toBe(EXPENSE_ID);
    });

    it('throws NotFoundException when expense does not exist', async () => {
      expenseRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(USER_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates amount, note, and date within the same month', async () => {
      const expense = makeExpense({ monthlyBudget: makeBudget() as any });
      expenseRepo.findOne.mockResolvedValue(expense);
      expenseRepo.save.mockImplementation((e) => Promise.resolve(e));

      const result = await service.update(USER_ID, EXPENSE_ID, {
        amount: 90000,
        note: 'Lunch',
        expenseDate: '2025-05-20',
      });

      expect(result.amount).toBe(90000);
      expect(result.note).toBe('Lunch');
    });

    it('throws NotFoundException when expense does not exist', async () => {
      expenseRepo.findOne.mockResolvedValue(null);
      await expect(service.update(USER_ID, 'bad-id', { amount: 100 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the budget is finalized', async () => {
      const expense = makeExpense({ monthlyBudget: makeBudget({ isFinalized: true }) as any });
      expenseRepo.findOne.mockResolvedValue(expense);
      await expect(service.update(USER_ID, EXPENSE_ID, { amount: 100 })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws BadRequestException when new date is in a different month', async () => {
      const expense = makeExpense({ monthlyBudget: makeBudget() as any });
      expenseRepo.findOne.mockResolvedValue(expense);

      await expect(
        service.update(USER_ID, EXPENSE_ID, { expenseDate: '2025-06-01' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when new date is in a different year', async () => {
      const expense = makeExpense({ monthlyBudget: makeBudget() as any });
      expenseRepo.findOne.mockResolvedValue(expense);

      await expect(
        service.update(USER_ID, EXPENSE_ID, { expenseDate: '2026-05-01' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('does not overwrite fields that are not provided', async () => {
      const expense = makeExpense({ monthlyBudget: makeBudget() as any });
      expenseRepo.findOne.mockResolvedValue(expense);
      expenseRepo.save.mockImplementation((e) => Promise.resolve(e));

      await service.update(USER_ID, EXPENSE_ID, { note: 'New note' });

      const saved = expenseRepo.save.mock.calls[0][0] as Expense;
      expect(saved.amount).toBe(85000);
    });
  });

  describe('remove', () => {
    it('removes an expense from a non-finalized budget', async () => {
      const expense = makeExpense({ monthlyBudget: makeBudget() as any });
      expenseRepo.findOne.mockResolvedValue(expense);
      expenseRepo.remove.mockResolvedValue(undefined);

      await service.remove(USER_ID, EXPENSE_ID);

      expect(expenseRepo.remove).toHaveBeenCalledWith(expense);
    });

    it('throws NotFoundException when expense does not exist', async () => {
      expenseRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(USER_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the budget is finalized', async () => {
      const expense = makeExpense({ monthlyBudget: makeBudget({ isFinalized: true }) as any });
      expenseRepo.findOne.mockResolvedValue(expense);
      await expect(service.remove(USER_ID, EXPENSE_ID)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findPartnerExpenses', () => {
    it('returns partner expenses when couple exists (user is user1)', async () => {
      mockQb.getOne.mockResolvedValue(makeCouple(USER_ID, PARTNER_ID));
      expenseRepo.find.mockResolvedValue([makeExpense({ userId: PARTNER_ID })]);

      const result = await service.findPartnerExpenses(USER_ID, 2025, 5);

      expect(result).toHaveLength(1);
      const findCall = expenseRepo.find.mock.calls[0][0];
      expect(findCall.where).toMatchObject({ userId: PARTNER_ID });
    });

    it('returns partner expenses when couple exists (user is user2)', async () => {
      mockQb.getOne.mockResolvedValue(makeCouple(PARTNER_ID, USER_ID));
      expenseRepo.find.mockResolvedValue([makeExpense({ userId: PARTNER_ID })]);

      await service.findPartnerExpenses(USER_ID, 2025, 5);

      const findCall = expenseRepo.find.mock.calls[0][0];
      expect(findCall.where).toMatchObject({ userId: PARTNER_ID });
    });

    it('throws NotFoundException when user has no partner', async () => {
      mockQb.getOne.mockResolvedValue(null);
      await expect(service.findPartnerExpenses(USER_ID, 2025, 5)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('passes categoryId filter through to findAllByMonth', async () => {
      mockQb.getOne.mockResolvedValue(makeCouple(USER_ID, PARTNER_ID));
      expenseRepo.find.mockResolvedValue([]);

      await service.findPartnerExpenses(USER_ID, 2025, 5, CAT_ID);

      const findCall = expenseRepo.find.mock.calls[0][0];
      expect(findCall.where).toMatchObject({ categoryId: CAT_ID });
    });
  });
});

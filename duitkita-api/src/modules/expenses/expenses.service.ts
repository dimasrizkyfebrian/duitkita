import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Expense } from '../../database/entities/expense.entity';
import { MonthlyBudget } from '../../database/entities/monthly-budget.entity';
import { Couple } from '../../database/entities/couple.entity';
import { Category } from '../../database/entities/category.entity';
import { ActivityAction, ActivityEntityType } from '../../database/entities/activity.entity';
import { ActivityService } from '../activity/activity.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { validateYearMonth } from '../../common/utils/validate-period.util';
import { ExpenseMessages } from '../../common/constants/expense.messages';

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

    private readonly activityService: ActivityService,
  ) {}

  async create(userId: string, dto: CreateExpenseDto): Promise<Expense> {
    const category = await this.categoryRepo.findOne({
      where: { id: dto.categoryId, userId },
    });
    if (!category) {
      throw new NotFoundException(ExpenseMessages.CATEGORY_NOT_BELONG_TO_USER);
    }

    const date = new Date(dto.expenseDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    const budget = await this.budgetRepo.findOne({
      where: { userId, categoryId: dto.categoryId, year, month },
    });
    if (!budget) {
      throw new BadRequestException(ExpenseMessages.BUDGET_NOT_FOUND_FOR_MONTH(month, year));
    }

    if (budget.isFinalized) {
      throw new ForbiddenException(ExpenseMessages.FINALIZED_CREATE);
    }

    const expense = this.expenseRepo.create({
      userId,
      categoryId: dto.categoryId,
      monthlyBudgetId: budget.id,
      amount: dto.amount,
      note: dto.note,
      expenseDate: new Date(dto.expenseDate),
    });

    const saved = await this.expenseRepo.save(expense);

    try {
      await this.activityService.log({
        userId,
        action: ActivityAction.CREATED,
        entityType: ActivityEntityType.EXPENSE,
        entityId: saved.id,
        meta: {
          amount: Number(saved.amount),
          note: saved.note ?? null,
          categoryName: category.name,
          categoryIcon: category.icon ?? null,
          expenseDate: dto.expenseDate,
        },
      });
    } catch { /* activity log failure must not break the main operation */ }

    return saved;
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
    const expense = await this.expenseRepo.findOne({
      where: { id: expenseId, userId },
      relations: ['monthlyBudget', 'category'],
    });
    if (!expense) {
      throw new NotFoundException(ExpenseMessages.NOT_FOUND);
    }

    if (expense.monthlyBudget.isFinalized) {
      throw new ForbiddenException(ExpenseMessages.FINALIZED_EDIT);
    }

    if (dto.expenseDate) {
      const newDate = new Date(dto.expenseDate);
      const newYear = newDate.getFullYear();
      const newMonth = newDate.getMonth() + 1;

      if (
        newYear !== expense.monthlyBudget.year ||
        newMonth !== expense.monthlyBudget.month
      ) {
        throw new BadRequestException(ExpenseMessages.CROSS_MONTH);
      }

      expense.expenseDate = newDate;
    }

    if (dto.amount !== undefined) expense.amount = dto.amount;
    if (dto.note !== undefined) expense.note = dto.note;

    const saved = await this.expenseRepo.save(expense);

    try {
      await this.activityService.log({
        userId,
        action: ActivityAction.UPDATED,
        entityType: ActivityEntityType.EXPENSE,
        entityId: saved.id,
        meta: {
          amount: Number(saved.amount),
          note: saved.note ?? null,
          categoryName: expense.category.name,
          categoryIcon: expense.category.icon ?? null,
          expenseDate: saved.expenseDate instanceof Date
            ? saved.expenseDate.toISOString().split('T')[0]
            : String(saved.expenseDate),
        },
      });
    } catch { /* activity log failure must not break the main operation */ }

    return saved;
  }

  async remove(userId: string, expenseId: string): Promise<void> {
    const expense = await this.expenseRepo.findOne({
      where: { id: expenseId, userId },
      relations: ['monthlyBudget', 'category'],
    });
    if (!expense) {
      throw new NotFoundException(ExpenseMessages.NOT_FOUND);
    }

    if (expense.monthlyBudget.isFinalized) {
      throw new ForbiddenException(ExpenseMessages.FINALIZED_DELETE);
    }

    const meta = {
      amount: Number(expense.amount),
      note: expense.note ?? null,
      categoryName: expense.category.name,
      categoryIcon: expense.category.icon ?? null,
      expenseDate: expense.expenseDate instanceof Date
        ? expense.expenseDate.toISOString().split('T')[0]
        : String(expense.expenseDate),
    };
    const entityId = expense.id;

    await this.expenseRepo.remove(expense);

    try {
      await this.activityService.log({
        userId,
        action: ActivityAction.DELETED,
        entityType: ActivityEntityType.EXPENSE,
        entityId,
        meta,
      });
    } catch { /* activity log failure must not break the main operation */ }
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

  private async getPartnerId(userId: string): Promise<string> {
    const couple = await this.coupleRepo
      .createQueryBuilder('couple')
      .leftJoinAndSelect('couple.user1', 'user1')
      .leftJoinAndSelect('couple.user2', 'user2')
      .where('couple.user1_id = :userId OR couple.user2_id = :userId', { userId })
      .getOne();

    if (!couple) {
      throw new NotFoundException(ExpenseMessages.NO_PARTNER);
    }

    return couple.user1.id === userId ? couple.user2.id : couple.user1.id;
  }
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';
import { MonthlyBudget } from './monthly-budget.entity';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.expenses)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Category, (category) => category.expenses)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'category_id' })
  categoryId: string;

  @ManyToOne(() => MonthlyBudget, (budget) => budget.expenses)
  @JoinColumn({ name: 'monthly_budget_id' })
  monthlyBudget: MonthlyBudget;

  @Index()
  @Column({ name: 'monthly_budget_id' })
  monthlyBudgetId: string;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ length: 255, nullable: true })
  note: string;

  @Index()
  @Column({ name: 'expense_date', type: 'date' })
  expenseDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

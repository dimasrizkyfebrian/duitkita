import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';
import { Expense } from './expense.entity';

@Entity('monthly_budgets')
@Unique(['userId', 'categoryId', 'year', 'month'])
export class MonthlyBudget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.monthlyBudgets)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Category, (category) => category.monthlyBudgets)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'category_id' })
  categoryId: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int' })
  month: number;

  @Column({ name: 'base_amount', type: 'bigint', default: 0 })
  baseAmount: number;

  @Column({ name: 'rollover_amount', type: 'bigint', default: 0 })
  rolloverAmount: number;

  @Column({ name: 'total_amount', type: 'bigint', default: 0 })
  totalAmount: number;

  @Column({ name: 'is_finalized', default: false })
  isFinalized: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Expense, (expense) => expense.monthlyBudget)
  expenses: Expense[];
}

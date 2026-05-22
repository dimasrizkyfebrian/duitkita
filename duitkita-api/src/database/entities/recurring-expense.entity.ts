import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';

export enum RecurringScheduleType {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

@Entity('recurring_expenses')
export class RecurringExpense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'category_id' })
  categoryId: string;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ length: 255, nullable: true })
  note?: string;

  @Column({
    type: 'enum',
    enum: RecurringScheduleType,
    name: 'schedule_type',
  })
  scheduleType: RecurringScheduleType;

  /** Weekly: 0–6 (Sun–Sat). Monthly: 1–31. */
  @Column({ name: 'schedule_day', type: 'int' })
  scheduleDay: number;

  @Index()
  @Column({ name: 'next_run_at', type: 'timestamp' })
  nextRunAt: Date;

  @Column({ name: 'last_run_at', type: 'timestamp', nullable: true })
  lastRunAt?: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

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

export enum BillReminderStatus {
  UPCOMING = 'upcoming',
  OVERDUE = 'overdue',
  DONE = 'done',
}

@Entity('bill_reminders')
export class BillReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ length: 120 })
  title: string;

  @Column({ type: 'bigint', nullable: true })
  amount?: number;

  @Index()
  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  @Column({ name: 'remind_before_days', type: 'int', default: 1 })
  remindBeforeDays: number;

  @Column({
    type: 'enum',
    enum: BillReminderStatus,
    default: BillReminderStatus.UPCOMING,
  })
  status: BillReminderStatus;

  @Column({ name: 'snoozed_until', type: 'date', nullable: true })
  snoozedUntil?: Date;

  @Column({ name: 'is_recurring', default: false })
  isRecurring: boolean;

  @Column({ name: 'recurring_rule', length: 64, nullable: true })
  recurringRule?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

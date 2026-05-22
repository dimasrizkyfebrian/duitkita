import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum NotificationType {
  RECURRING_EXPENSE = 'recurring_expense',
  BILL_REMINDER = 'bill_reminder',
  BUDGET_ALERT = 'budget_alert',
  PARTNER_ACTIVITY = 'partner_activity',
  WEEKLY_SUMMARY = 'weekly_summary',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ length: 160 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'payload_json', type: 'jsonb', nullable: true })
  payloadJson?: Record<string, unknown>;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryColumn({ name: 'user_id' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'budget_alert', default: true })
  budgetAlert: boolean;

  @Column({ name: 'partner_activity', default: true })
  partnerActivity: boolean;

  @Column({ name: 'weekly_summary', default: true })
  weeklySummary: boolean;

  @Column({ name: 'reminder_alert', default: true })
  reminderAlert: boolean;

  @Column({ name: 'recurring_alert', default: true })
  recurringAlert: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

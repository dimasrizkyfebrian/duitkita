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

export enum SecurityAuditEventType {
  REGISTER_SUCCESS = 'register_success',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  PASSWORD_CHANGED = 'password_changed',
  SESSION_REVOKED = 'session_revoked',
  SESSIONS_REVOKED_OTHERS = 'sessions_revoked_others',
  INVITATION_SENT = 'invitation_sent',
  INVITATION_ACCEPTED = 'invitation_accepted',
  INVITATION_REJECTED = 'invitation_rejected',
  INVITATION_CANCELLED = 'invitation_cancelled',
  PARTNER_LINKED = 'partner_linked',
  PARTNER_UNLINKED = 'partner_unlinked',
}

@Entity('security_audit_logs')
export class SecurityAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Index()
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: SecurityAuditEventType,
    name: 'event_type',
  })
  eventType: SecurityAuditEventType;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;

  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

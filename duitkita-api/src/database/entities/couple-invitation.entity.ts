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

export enum CoupleInvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Entity('couple_invitations')
export class CoupleInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'sender_user_id' })
  senderUser: User;

  @Index()
  @Column({ name: 'sender_user_id' })
  senderUserId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'receiver_user_id' })
  receiverUser: User;

  @Index()
  @Column({ name: 'receiver_user_id' })
  receiverUserId: string;

  @Column({
    type: 'enum',
    enum: CoupleInvitationStatus,
    default: CoupleInvitationStatus.PENDING,
  })
  status: CoupleInvitationStatus;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'responded_at', type: 'timestamp', nullable: true })
  respondedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

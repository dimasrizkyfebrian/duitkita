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

export enum ReportExportFormat {
  PDF = 'pdf',
}

export enum ReportExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('report_exports')
export class ReportExport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: ReportExportFormat })
  format: ReportExportFormat;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int' })
  month: number;

  @Column({ length: 16 })
  scope: string;

  @Column({
    type: 'enum',
    enum: ReportExportStatus,
    default: ReportExportStatus.PENDING,
  })
  status: ReportExportStatus;

  @Column({ name: 'file_path', length: 512, nullable: true })
  filePath?: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn({ name: 'requested_at' })
  requestedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('couples')
@Unique(['user1Id', 'user2Id'])
export class Couple {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user1_id' })
  user1: User;

  @Index()
  @Column({ name: 'user1_id' })
  user1Id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user2_id' })
  user2: User;

  @Index()
  @Column({ name: 'user2_id' })
  user2Id: string;

  @CreateDateColumn({ name: 'linked_at' })
  linkedAt: Date;
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity';
import { Couple } from '../../database/entities/couple.entity';
import { AuthModule } from '../auth/auth.module';
import { SecurityAuditModule } from '../security-audit/security-audit.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { avatarStorageProvider } from './storage/avatar-storage.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Couple]),
    AuthModule,
    SecurityAuditModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, avatarStorageProvider],
  exports: [UsersService],
})
export class UsersModule {}

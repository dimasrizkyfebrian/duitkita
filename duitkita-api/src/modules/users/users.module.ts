import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { SecurityAuditModule } from '../security-audit/security-audit.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), AuthModule, SecurityAuditModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}

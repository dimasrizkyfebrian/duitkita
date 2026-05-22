import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Couple } from '../../database/entities/couple.entity';
import { CoupleInvitation } from '../../database/entities/couple-invitation.entity';
import { User } from '../../database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { SecurityAuditModule } from '../security-audit/security-audit.module';
import { CouplesController } from './couples.controller';
import { CouplesService } from './couples.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Couple, CoupleInvitation, User]),
    AuthModule,
    SecurityAuditModule,
  ],
  controllers: [CouplesController],
  providers: [CouplesService],
  exports: [CouplesService],
})
export class CouplesModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Couple } from '../../database/entities/couple.entity';
import { User } from '../../database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { CouplesController } from './couples.controller';
import { CouplesService } from './couples.service';

@Module({
  imports: [TypeOrmModule.forFeature([Couple, User]), AuthModule],
  controllers: [CouplesController],
  providers: [CouplesService],
  exports: [CouplesService],
})
export class CouplesModule {}

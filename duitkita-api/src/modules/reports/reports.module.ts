import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonthlyBudget } from '../../database/entities/monthly-budget.entity';
import { Expense } from '../../database/entities/expense.entity';
import { Couple } from '../../database/entities/couple.entity';
import { User } from '../../database/entities/user.entity';
import { ReportExport } from '../../database/entities/report-export.entity';
import { AuthModule } from '../auth/auth.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportExportsService } from './report-exports.service';
import { reportExportStorageProvider } from './storage/report-export-storage.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([MonthlyBudget, Expense, Couple, User, ReportExport]),
    AuthModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ReportExportsService, reportExportStorageProvider],
})
export class ReportsModule {}

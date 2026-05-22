import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecurringExpense } from '../../database/entities/recurring-expense.entity';
import { Category } from '../../database/entities/category.entity';
import { AuthModule } from '../auth/auth.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RecurringExpensesController } from './recurring-expenses.controller';
import { RecurringExpensesService } from './recurring-expenses.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecurringExpense, Category]),
    AuthModule,
    ExpensesModule,
    NotificationsModule,
  ],
  controllers: [RecurringExpensesController],
  providers: [RecurringExpensesService],
  exports: [RecurringExpensesService],
})
export class RecurringExpensesModule {}

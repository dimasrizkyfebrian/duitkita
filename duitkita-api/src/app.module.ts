import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import * as Joi from 'joi';
import { User } from './database/entities/user.entity';
import { Couple } from './database/entities/couple.entity';
import { Category } from './database/entities/category.entity';
import { MonthlyBudget } from './database/entities/monthly-budget.entity';
import { Expense } from './database/entities/expense.entity';
import { Activity } from './database/entities/activity.entity';
import { CoupleInvitation } from './database/entities/couple-invitation.entity';
import { UserSession } from './database/entities/user-session.entity';
import { SecurityAuditLog } from './database/entities/security-audit-log.entity';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { CouplesModule } from './modules/couples/couples.module';
import { ReportsModule } from './modules/reports/reports.module';
import { UsersModule } from './modules/users/users.module';
import { ActivityModule } from './modules/activity/activity.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        TEST_DATABASE_URL: Joi.string().optional(),
        DB_SSL: Joi.boolean().optional(),
        DB_SSL_REJECT_UNAUTHORIZED: Joi.boolean().optional(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.string().default('7d'),
        JWT_REFRESH_SECRET: Joi.string().optional(),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string().default('development'),
        LOG_LEVEL: Joi.string().default('info'),
      }),
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: { colorize: true, singleLine: true },
              }
            : undefined,
        redact: ['req.headers.authorization'],
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL', '');
        const isLocalDatabase = /localhost|127\.0\.0\.1/.test(databaseUrl);
        const dbSslEnabled = configService.get<string>('DB_SSL')
          ? configService.get<string>('DB_SSL') === 'true'
          : !isLocalDatabase;
        const dbSslRejectUnauthorized =
          configService.get<string>('DB_SSL_REJECT_UNAUTHORIZED') === 'true';

        return {
          type: 'postgres' as const,
          url: databaseUrl,
          ssl: dbSslEnabled
            ? { rejectUnauthorized: dbSslRejectUnauthorized }
            : false,
          entities: [
            User,
            Couple,
            Category,
            MonthlyBudget,
            Expense,
            Activity,
            CoupleInvitation,
            UserSession,
            SecurityAuditLog,
          ],
          migrations: ['dist/migrations/*.js'],
          synchronize: false,
        };
      },
    }),
    AuthModule,
    CategoriesModule,
    BudgetsModule,
    ExpensesModule,
    CouplesModule,
    ReportsModule,
    UsersModule,
    ActivityModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  controllers: [AppController],
})
export class AppModule {}

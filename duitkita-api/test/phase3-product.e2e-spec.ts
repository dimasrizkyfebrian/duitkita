import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { RecurringScheduleType } from '../src/database/entities/recurring-expense.entity';
import { createE2eApp } from './helpers/e2e-app';
import { registerE2eUser, uniqueEmail, unwrapSuccess } from './helpers/e2e-auth';
import { runE2eMigrations, truncateE2eDatabase } from './helpers/e2e-db';

type EntityWithId = { id: string };
type RecurringView = EntityWithId & { nextRunAt: string; isActive: boolean };
type RunDueResult = {
  processed: number;
  succeeded: number;
  items: Array<{ recurringExpenseId: string; success: boolean; expenseId?: string }>;
};
type ReminderView = EntityWithId & { status: string; title: string };
type ForecastResponse = {
  projectedSpent: number;
  burnRatePerDay: number;
  confidenceLevel: string;
  keyDrivers: unknown[];
};
type HealthScoreResponse = {
  score: number;
  savingRate: number;
  budgetAdherence: number;
  insights: string[];
};
type NotificationList = {
  data: Array<{ id: string; isRead: boolean }>;
  unreadCount: number;
};

describe('Phase 3 product features (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    await runE2eMigrations();
    app = await createE2eApp();
  });

  beforeEach(async () => {
    await truncateE2eDatabase();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('runs recurring expense, reminder lifecycle, forecast, health-score, and notifications', async () => {
    const auth = await registerE2eUser(app, {
      email: uniqueEmail('phase3-e2e'),
      password: 'secret12345',
    });
    const token = auth.accessToken;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const dayOfMonth = now.getDate();
    const expenseDate = `${year}-${String(month).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;

    const category = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Utilities', icon: 'U' })
      .expect(201);
    const categoryData = unwrapSuccess<EntityWithId>(category.body);

    await request(app.getHttpServer())
      .post('/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: categoryData.id,
        year,
        month,
        baseAmount: 1000000,
      })
      .expect(201);

    const recurring = await request(app.getHttpServer())
      .post('/recurring-expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: categoryData.id,
        amount: 120000,
        note: 'Internet',
        scheduleType: RecurringScheduleType.MONTHLY,
        scheduleDay: dayOfMonth,
      })
      .expect(201);
    const recurringData = unwrapSuccess<RecurringView>(recurring.body);
    expect(recurringData.isActive).toBe(true);

    const runDue = await request(app.getHttpServer())
      .post('/recurring-expenses/run-due')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const runDueData = unwrapSuccess<RunDueResult>(runDue.body);
    expect(runDueData.succeeded).toBeGreaterThanOrEqual(1);

    const reminder = await request(app.getHttpServer())
      .post('/reminders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'PLN Bill',
        amount: 250000,
        dueDate: expenseDate,
        remindBeforeDays: 3,
      })
      .expect(201);
    const reminderData = unwrapSuccess<ReminderView>(reminder.body);

    await request(app.getHttpServer())
      .post(`/reminders/${reminderData.id}/mark-done`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(unwrapSuccess<ReminderView>(body).status).toBe('done');
      });

    await request(app.getHttpServer())
      .get(`/reports/forecast?year=${year}&month=${month}&scope=me`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        const data = unwrapSuccess<ForecastResponse>(body);
        expect(data.projectedSpent).toBeGreaterThanOrEqual(0);
        expect(data.confidenceLevel).toMatch(/low|medium|high/);
        expect(Array.isArray(data.keyDrivers)).toBe(true);
      });

    await request(app.getHttpServer())
      .get(`/reports/health-score?year=${year}&month=${month}&scope=me`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        const data = unwrapSuccess<HealthScoreResponse>(body);
        expect(data.score).toBeGreaterThanOrEqual(0);
        expect(data.score).toBeLessThanOrEqual(100);
        expect(data.insights.length).toBeGreaterThan(0);
      });

    await request(app.getHttpServer())
      .get('/notifications?limit=10&offset=0')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        const data = unwrapSuccess<NotificationList>(body);
        expect(data.unreadCount).toBeGreaterThanOrEqual(1);
        expect(data.data.length).toBeGreaterThanOrEqual(1);
      });
  });
});

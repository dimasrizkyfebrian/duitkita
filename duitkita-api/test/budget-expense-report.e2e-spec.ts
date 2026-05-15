import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp } from './helpers/e2e-app';
import { registerE2eUser, uniqueEmail, unwrapSuccess } from './helpers/e2e-auth';
import { runE2eMigrations, truncateE2eDatabase } from './helpers/e2e-db';

type EntityWithId = { id: string };
type BudgetResponse = EntityWithId;
type ExpenseResponse = EntityWithId & { monthlyBudgetId: string };
type MonthlyReportResponse = {
  totalSpent: number;
  categories: Array<{
    categoryId: string;
    totalSpent: number;
    remaining: number;
  }>;
};
type FinalizeResponse = { finalized: number };

describe('Budget expense report flow (e2e)', () => {
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

  it('creates budget and expense, reads report, then blocks writes after finalize', async () => {
    const auth = await registerE2eUser(app, {
      name: 'Budget E2E',
      email: uniqueEmail('budget-e2e'),
      password: 'secret12345',
    });
    const token = auth.accessToken;

    const category = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Food', icon: 'F' })
      .expect(201);
    const categoryData = unwrapSuccess<EntityWithId>(category.body);

    const budget = await request(app.getHttpServer())
      .post('/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: categoryData.id,
        year: 2025,
        month: 5,
        baseAmount: 500000,
      })
      .expect(201);
    const budgetData = unwrapSuccess<BudgetResponse>(budget.body);

    const expense = await request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: categoryData.id,
        amount: 85000,
        note: 'Dinner',
        expenseDate: '2025-05-14',
      })
      .expect(201);
    const expenseData = unwrapSuccess<ExpenseResponse>(expense.body);

    expect(expenseData.monthlyBudgetId).toBe(budgetData.id);

    await request(app.getHttpServer())
      .get('/reports/monthly?year=2025&month=5')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        const data = unwrapSuccess<MonthlyReportResponse>(body);
        expect(data.totalSpent).toBe(85000);
        expect(data.categories[0]).toEqual(
          expect.objectContaining({
            categoryId: categoryData.id,
            totalSpent: 85000,
            remaining: 415000,
          }),
        );
      });

    await request(app.getHttpServer())
      .post('/budgets/finalize?year=2025&month=5')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(unwrapSuccess<FinalizeResponse>(body).finalized).toBe(1);
      });

    await request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: categoryData.id,
        amount: 10000,
        note: 'Snack',
        expenseDate: '2025-05-15',
      })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/expenses/${expenseData.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 90000 })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/expenses/${expenseData.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});

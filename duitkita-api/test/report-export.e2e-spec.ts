import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp } from './helpers/e2e-app';
import { registerE2eUser, uniqueEmail, unwrapSuccess } from './helpers/e2e-auth';
import { runE2eMigrations, truncateE2eDatabase } from './helpers/e2e-db';

type EntityWithId = { id: string };
type ReportExportView = {
  id: string;
  status: string;
  format: string;
  downloadReady: boolean;
};

describe('Report PDF export (e2e)', () => {
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

  it('creates a PDF export and downloads it', async () => {
    const auth = await registerE2eUser(app, {
      email: uniqueEmail('export-e2e'),
      password: 'secret12345',
    });
    const token = auth.accessToken;

    const category = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Food', icon: 'F' })
      .expect(201);
    const categoryData = unwrapSuccess<EntityWithId>(category.body);

    await request(app.getHttpServer())
      .post('/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: categoryData.id,
        year: 2025,
        month: 5,
        baseAmount: 400000,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: categoryData.id,
        amount: 75000,
        note: 'Groceries',
        expenseDate: '2025-05-10',
      })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post('/reports/exports')
      .set('Authorization', `Bearer ${token}`)
      .send({ format: 'pdf', year: 2025, month: 5, scope: 'me' })
      .expect(201);

    const exportJob = unwrapSuccess<ReportExportView>(created.body);
    expect(exportJob.format).toBe('pdf');
    expect(exportJob.status).toBe('completed');
    expect(exportJob.downloadReady).toBe(true);

    const listed = await request(app.getHttpServer())
      .get('/reports/exports')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const jobs = unwrapSuccess<ReportExportView[]>(listed.body);
    expect(jobs.some((j) => j.id === exportJob.id)).toBe(true);

    const download = await request(app.getHttpServer())
      .get(`/reports/exports/${exportJob.id}/download`)
      .set('Authorization', `Bearer ${token}`)
      .responseType('blob')
      .expect(200)
      .expect('Content-Type', /application\/pdf/);

    const buffer = download.body as Buffer;
    expect(buffer.slice(0, 4).toString('utf8')).toBe('%PDF');
  });
});

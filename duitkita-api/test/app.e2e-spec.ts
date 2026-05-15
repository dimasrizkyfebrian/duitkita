import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp } from './helpers/e2e-app';
import { unwrapSuccess } from './helpers/e2e-auth';
import { runE2eMigrations, truncateE2eDatabase } from './helpers/e2e-db';

describe('AppController (e2e)', () => {
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

  it('/ (GET)', async () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect(({ body, headers }) => {
        const data = unwrapSuccess<{ status: string; app: string }>(body);
        expect(data.status).toBe('ok');
        expect(data.app).toBe('DuitKita API');
        expect(headers['x-request-id']).toBeDefined();
      });
  });
});

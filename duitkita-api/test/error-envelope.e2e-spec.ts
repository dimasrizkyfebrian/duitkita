import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp } from './helpers/e2e-app';
import { registerE2eUser, uniqueEmail, unwrapSuccess } from './helpers/e2e-auth';
import { runE2eMigrations, truncateE2eDatabase } from './helpers/e2e-db';

describe('Error envelope (e2e)', () => {
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

  it('returns a validation envelope with request id', async () => {
    const requestId = 'e2e-request-id-validation';

    await request(app.getHttpServer())
      .post('/auth/register')
      .set('x-request-id', requestId)
      .send({
        name: '',
        email: 'not-an-email',
        password: 'x',
        extra: 'blocked',
      })
      .expect(400)
      .expect(({ body, headers }) => {
        expect(headers['x-request-id']).toBe(requestId);
        expect(body).toEqual(
          expect.objectContaining({
            success: false,
            requestId,
            path: '/auth/register',
          }),
        );
        expect(body.error.code).toBe('VALIDATION_ERROR');
        expect(body.error.details).toEqual(expect.any(Array));
      });
  });

  it('returns a success envelope with request id', async () => {
    const requestId = 'e2e-request-id-success';

    await request(app.getHttpServer())
      .get('/')
      .set('x-request-id', requestId)
      .expect(200)
      .expect(({ body, headers }) => {
        expect(headers['x-request-id']).toBe(requestId);
        const data = unwrapSuccess<{ status: string }>(body);
        expect(body.requestId).toBe(requestId);
        expect(body.path).toBe('/');
        expect(data.status).toBe('ok');
      });
  });

  it('returns an unauthorized envelope', async () => {
    await request(app.getHttpServer())
      .get('/users/me')
      .expect(401)
      .expect(({ body }) => {
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('UNAUTHORIZED');
        expect(body.requestId).toBeDefined();
      });
  });

  it('returns not found and conflict envelopes', async () => {
    const email = uniqueEmail('envelope-conflict');
    const auth = await registerE2eUser(app, {
      name: 'Envelope E2E',
      email,
      password: 'secret12345',
    });

    await request(app.getHttpServer())
      .get('/categories/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .expect(404)
      .expect(({ body }) => {
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('NOT_FOUND');
      });

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Duplicate', email, password: 'secret12345' })
      .expect(409)
      .expect(({ body }) => {
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('CONFLICT');
      });
  });
});

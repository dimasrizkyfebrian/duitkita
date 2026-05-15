import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp } from './helpers/e2e-app';
import {
  registerE2eUser,
  uniqueEmail,
  unwrapSuccess,
  type AuthTokens,
} from './helpers/e2e-auth';
import { runE2eMigrations, truncateE2eDatabase } from './helpers/e2e-db';

describe('Auth sessions (e2e)', () => {
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

  it('rotates refresh tokens and revokes sessions after password change', async () => {
    const password = 'secret12345';
    const newPassword = 'newsecret12345';
    const register = await registerE2eUser(app, {
      name: 'Session E2E',
      email: uniqueEmail('session-e2e'),
      password,
    });

    const firstRefresh = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: register.refreshToken })
      .expect(200);

    const rotated = unwrapSuccess<AuthTokens>(firstRefresh.body);
    expect(rotated.refreshToken).toBeDefined();
    expect(rotated.refreshToken).not.toBe(register.refreshToken);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: register.refreshToken })
      .expect(401)
      .expect(({ body }) => {
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('UNAUTHORIZED');
      });

    await request(app.getHttpServer())
      .patch('/users/me/password')
      .set('Authorization', `Bearer ${rotated.accessToken}`)
      .send({ currentPassword: password, newPassword })
      .expect(204);

    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${rotated.accessToken}`)
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: rotated.refreshToken })
      .expect(401);
  });
});

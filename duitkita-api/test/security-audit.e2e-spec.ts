import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp } from './helpers/e2e-app';
import {
  loginE2eUser,
  registerE2eUser,
  uniqueEmail,
  unwrapSuccess,
} from './helpers/e2e-auth';
import { runE2eMigrations, truncateE2eDatabase } from './helpers/e2e-db';

describe('Security audit (e2e)', () => {
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

  it('records auth, session, password, and invitation audit events', async () => {
    const emailA = uniqueEmail('audit-a');
    const emailB = uniqueEmail('audit-b');
    const passwordA = 'secret12345';
    const newPasswordA = 'newsecret12345';

    const userA = await registerE2eUser(app, {
      name: 'Audit A',
      email: emailA,
      password: passwordA,
    });

    await expectAuditEvent(userA.accessToken, 'register_success');

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: emailA, password: 'wrong-password-xxx' })
      .expect(401);
    await expectAuditEvent(userA.accessToken, 'login_failure');

    const loginA = await loginE2eUser(app, emailA, passwordA);
    await expectAuditEvent(loginA.accessToken, 'login_success');

    await request(app.getHttpServer())
      .delete(`/auth/sessions/${userA.sessionId}`)
      .set('Authorization', `Bearer ${loginA.accessToken}`)
      .expect(204);
    await expectAuditEvent(loginA.accessToken, 'session_revoked');

    await request(app.getHttpServer())
      .patch('/users/me/password')
      .set('Authorization', `Bearer ${loginA.accessToken}`)
      .send({ currentPassword: passwordA, newPassword: newPasswordA })
      .expect(204);

    const reloginA = await loginE2eUser(app, emailA, newPasswordA);
    await expectAuditEvent(reloginA.accessToken, 'password_changed');

    const userB = await registerE2eUser(app, {
      name: 'Audit B',
      email: emailB,
      password: 'secret12345',
    });

    await request(app.getHttpServer())
      .post('/couples/invitations')
      .set('Authorization', `Bearer ${reloginA.accessToken}`)
      .send({ partnerEmail: emailB })
      .expect(201);
    await expectAuditEvent(reloginA.accessToken, 'invitation_sent');

    const incoming = await request(app.getHttpServer())
      .get('/couples/invitations/incoming')
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .expect(200);
    const incomingData = unwrapSuccess<Array<{ id: string }>>(incoming.body);

    await request(app.getHttpServer())
      .post(`/couples/invitations/${incomingData[0].id}/accept`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .expect(201);
    await expectAuditEvent(userB.accessToken, 'invitation_accepted');
  });

  async function expectAuditEvent(
    token: string,
    eventType: string,
  ): Promise<void> {
    const response = await request(app.getHttpServer())
      .get('/users/me/security-audit?limit=50&offset=0')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const audit = unwrapSuccess<{ data: Array<{ eventType: string }> }>(response.body);
    expect(audit.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ eventType })]),
    );
  }
});

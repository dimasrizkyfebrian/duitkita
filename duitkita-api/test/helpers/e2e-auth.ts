import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

export type E2eUser = {
  name: string;
  email: string;
  password: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
};

export type SuccessEnvelope<T> = {
  success: true;
  data: T;
  requestId: string;
  timestamp: string;
  path: string;
};

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export function unwrapSuccess<T>(body: SuccessEnvelope<T>): T {
  expect(body.success).toBe(true);
  expect(body.requestId).toBeDefined();
  expect(body.timestamp).toBeDefined();
  return body.data;
}

export async function registerE2eUser(
  app: INestApplication<App>,
  overrides: Partial<E2eUser> = {},
): Promise<AuthTokens> {
  const user = {
    name: overrides.name ?? 'E2E User',
    email: overrides.email ?? uniqueEmail('e2e-user'),
    password: overrides.password ?? 'secret12345',
  };

  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send(user)
    .expect(201);

  return unwrapSuccess<AuthTokens>(response.body as SuccessEnvelope<AuthTokens>);
}

export async function loginE2eUser(
  app: INestApplication<App>,
  email: string,
  password: string,
): Promise<AuthTokens> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return unwrapSuccess<AuthTokens>(response.body as SuccessEnvelope<AuthTokens>);
}

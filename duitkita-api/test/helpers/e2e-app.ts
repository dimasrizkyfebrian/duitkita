import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/configure-app';
import { setupE2eEnvironment } from './e2e-db';

export async function createE2eApp(): Promise<INestApplication<App>> {
  setupE2eEnvironment();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  configureApp(app, { enableCors: false, enableSecurityHeaders: false });
  await app.init();
  return app;
}

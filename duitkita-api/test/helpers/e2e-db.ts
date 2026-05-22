import * as dotenv from 'dotenv';
import type { DataSource } from 'typeorm';

dotenv.config({ quiet: true });

const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL;

const TRUNCATE_TABLES = [
  'report_exports',
  'notifications',
  'notification_preferences',
  'recurring_expenses',
  'bill_reminders',
  'security_audit_logs',
  'user_sessions',
  'couple_invitations',
  'activities',
  'expenses',
  'monthly_budgets',
  'categories',
  'couples',
  'users',
];

export function setupE2eEnvironment(): void {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error('TEST_DATABASE_URL is required for E2E tests');
  }

  assertSafeTestDatabaseUrl(testDatabaseUrl);

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.JWT_SECRET ??= 'e2e-access-secret';
  process.env.JWT_REFRESH_SECRET ??= 'e2e-refresh-secret';
  process.env.JWT_EXPIRES_IN ??= '15m';
  process.env.JWT_REFRESH_EXPIRES_IN ??= '1d';
  process.env.LOG_LEVEL ??= 'silent';
  process.env.REPORT_STORAGE_DRIVER ??= 'local';
  process.env.AVATAR_STORAGE_DRIVER ??= 'local';
}

export async function runE2eMigrations(): Promise<void> {
  setupE2eEnvironment();
  const { AppDataSource } = loadAppDataSource();

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  await AppDataSource.runMigrations();
  await AppDataSource.destroy();
}

export async function truncateE2eDatabase(): Promise<void> {
  setupE2eEnvironment();
  const { AppDataSource } = loadAppDataSource();

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  await AppDataSource.query(
    `TRUNCATE TABLE ${TRUNCATE_TABLES.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
  await AppDataSource.destroy();
}

function loadAppDataSource(): { AppDataSource: DataSource } {
  // Load lazily after setupE2eEnvironment points DATABASE_URL at TEST_DATABASE_URL.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../../src/config/database.config') as {
    AppDataSource: DataSource;
  };
}

function assertSafeTestDatabaseUrl(testDatabaseUrl: string): void {
  if (ORIGINAL_DATABASE_URL && ORIGINAL_DATABASE_URL === testDatabaseUrl) {
    throw new Error('TEST_DATABASE_URL must not equal DATABASE_URL');
  }

  const normalizedUrl = testDatabaseUrl.toLowerCase();
  const looksLocal =
    normalizedUrl.includes('localhost') || normalizedUrl.includes('127.0.0.1');
  const looksLikeTestDb = normalizedUrl.includes('test');

  if (!looksLocal && !looksLikeTestDb) {
    throw new Error(
      'Refusing to run E2E tests against a non-test database URL',
    );
  }
}

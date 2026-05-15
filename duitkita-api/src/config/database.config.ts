import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config({ quiet: true });

const databaseUrl = process.env.DATABASE_URL ?? '';
const isLocalDatabase = /localhost|127\.0\.0\.1/.test(databaseUrl);
const dbSslEnabled = process.env.DB_SSL
  ? process.env.DB_SSL === 'true'
  : !isLocalDatabase;
const dbSslRejectUnauthorized =
  process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  ssl: dbSslEnabled
    ? { rejectUnauthorized: dbSslRejectUnauthorized }
    : false,
  entities: ['src/database/entities/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});

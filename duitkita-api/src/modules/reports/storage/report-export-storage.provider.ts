import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  REPORT_EXPORT_STORAGE,
  type ReportExportStorage,
  type ReportExportStorageDriver,
} from './report-export-storage.interface';
import { LocalReportExportStorage } from './local-report-export.storage';
import { SupabaseReportExportStorage } from './supabase-report-export.storage';

export function resolveReportExportStorageDriver(
  configService: ConfigService,
): ReportExportStorageDriver {
  const explicit = configService.get<string>('REPORT_STORAGE_DRIVER');
  if (explicit === 'local' || explicit === 'supabase') {
    return explicit;
  }

  const supabaseUrl = configService.get<string>('SUPABASE_URL');
  const serviceKey = configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
  if (supabaseUrl && serviceKey) {
    return 'supabase';
  }

  return 'local';
}

export const reportExportStorageProvider: Provider = {
  provide: REPORT_EXPORT_STORAGE,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): ReportExportStorage => {
    const driver = resolveReportExportStorageDriver(configService);
    if (driver === 'supabase') {
      return new SupabaseReportExportStorage(configService);
    }
    return new LocalReportExportStorage(configService);
  },
};

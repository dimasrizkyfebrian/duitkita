import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { Readable } from 'stream';
import type { ConfigService } from '@nestjs/config';
import {
  buildReportExportStorageKey,
  type ReportExportStorage,
} from './report-export-storage.interface';

export class SupabaseReportExportStorage implements ReportExportStorage {
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor(configService: ConfigService) {
    const url = configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceRoleKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when REPORT_STORAGE_DRIVER=supabase',
      );
    }

    this.bucket = configService.get<string>('SUPABASE_EXPORT_BUCKET', 'report-exports');
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async saveFromFile(
    userId: string,
    exportId: string,
    localPdfPath: string,
  ): Promise<string> {
    const storageKey = buildReportExportStorageKey(userId, exportId);
    const fileBuffer = await readFile(localPdfPath);

    const { error } = await this.client.storage.from(this.bucket).upload(storageKey, fileBuffer, {
      contentType: 'application/pdf',
      upsert: true,
      cacheControl: '3600',
    });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    return storageKey;
  }

  async openReadStream(storageKey: string): Promise<Readable> {
    const { data, error } = await this.client.storage.from(this.bucket).download(storageKey);

    if (error || !data) {
      throw new Error(error?.message ?? 'Supabase download failed');
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    return Readable.from(buffer);
  }

  async exists(storageKey: string): Promise<boolean> {
    const parts = storageKey.split('/');
    const fileName = parts.pop();
    const folder = parts.join('/');
    if (!fileName) return false;

    const { data, error } = await this.client.storage.from(this.bucket).list(folder, {
      search: fileName,
      limit: 1,
    });

    if (error) return false;
    return (data ?? []).some((item) => item.name === fileName);
  }
}

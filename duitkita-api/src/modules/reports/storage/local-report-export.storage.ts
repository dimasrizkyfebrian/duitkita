import { createReadStream, existsSync } from 'fs';
import { copyFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import type { ConfigService } from '@nestjs/config';
import {
  buildReportExportStorageKey,
  type ReportExportStorage,
} from './report-export-storage.interface';

export class LocalReportExportStorage implements ReportExportStorage {
  private readonly exportRoot: string;

  constructor(configService: ConfigService) {
    this.exportRoot = configService.get<string>(
      'REPORT_EXPORT_DIR',
      join(process.cwd(), 'storage', 'exports'),
    );
  }

  private resolvePath(storageKey: string): string {
    return join(this.exportRoot, storageKey);
  }

  async saveFromFile(
    userId: string,
    exportId: string,
    localPdfPath: string,
  ): Promise<string> {
    const storageKey = buildReportExportStorageKey(userId, exportId);
    const destination = this.resolvePath(storageKey);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(localPdfPath, destination);
    return storageKey;
  }

  async openReadStream(storageKey: string) {
    return createReadStream(this.resolvePath(storageKey));
  }

  async exists(storageKey: string): Promise<boolean> {
    return existsSync(this.resolvePath(storageKey));
  }
}

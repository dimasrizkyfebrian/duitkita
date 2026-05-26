import { Storage, type Bucket } from '@google-cloud/storage';
import { Readable } from 'stream';
import type { ConfigService } from '@nestjs/config';
import {
  buildReportExportStorageKey,
  type ReportExportStorage,
} from './report-export-storage.interface';

export class GcsReportExportStorage implements ReportExportStorage {
  private readonly bucket: Bucket;

  constructor(configService: ConfigService) {
    const projectId = configService.get<string>('GCS_PROJECT_ID');
    const keyFilename = configService.get<string>('GCS_KEYFILE');
    const bucketName = configService.get<string>('GCS_EXPORT_BUCKET');

    if (!bucketName) {
      throw new Error('GCS_EXPORT_BUCKET is required when REPORT_STORAGE_DRIVER=gcs');
    }

    const storageOptions: ConstructorParameters<typeof Storage>[0] = {};
    if (projectId) storageOptions.projectId = projectId;
    if (keyFilename) storageOptions.keyFilename = keyFilename;

    const storage = new Storage(storageOptions);
    this.bucket = storage.bucket(bucketName);
  }

  async saveFromFile(
    userId: string,
    exportId: string,
    localPdfPath: string,
  ): Promise<string> {
    const storageKey = buildReportExportStorageKey(userId, exportId);

    await this.bucket.upload(localPdfPath, {
      destination: storageKey,
      contentType: 'application/pdf',
      resumable: false,
      metadata: { cacheControl: 'private, max-age=3600' },
    });

    return storageKey;
  }

  openReadStream(storageKey: string): Promise<Readable> {
    const stream = this.bucket.file(storageKey).createReadStream();
    return Promise.resolve(stream);
  }

  async exists(storageKey: string): Promise<boolean> {
    const [exists] = await this.bucket.file(storageKey).exists();
    return exists;
  }
}

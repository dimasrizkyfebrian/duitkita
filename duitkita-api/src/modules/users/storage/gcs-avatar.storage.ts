import { Storage, type Bucket } from '@google-cloud/storage';
import { Readable } from 'stream';
import type { ConfigService } from '@nestjs/config';
import {
  buildAvatarStorageKey,
  type AvatarStorage,
} from './avatar-storage.interface';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export class GcsAvatarStorage implements AvatarStorage {
  private readonly bucket: Bucket;

  constructor(configService: ConfigService) {
    const projectId = configService.get<string>('GCS_PROJECT_ID');
    const keyFilename = configService.get<string>('GCS_KEYFILE');
    const bucketName = configService.get<string>('GCS_AVATAR_BUCKET');

    if (!bucketName) {
      throw new Error('GCS_AVATAR_BUCKET is required when AVATAR_STORAGE_DRIVER=gcs');
    }

    const storageOptions: ConstructorParameters<typeof Storage>[0] = {};
    if (projectId) storageOptions.projectId = projectId;
    if (keyFilename) storageOptions.keyFilename = keyFilename;

    const storage = new Storage(storageOptions);
    this.bucket = storage.bucket(bucketName);
  }

  async save(userId: string, buffer: Buffer, contentType: string): Promise<string> {
    const extension = MIME_TO_EXT[contentType] ?? 'jpg';
    const storageKey = buildAvatarStorageKey(userId, extension);
    const file = this.bucket.file(storageKey);

    await file.save(buffer, {
      contentType,
      resumable: false,
      metadata: { cacheControl: 'public, max-age=3600' },
    });

    return storageKey;
  }

  async delete(storageKey: string): Promise<void> {
    await this.bucket.file(storageKey).delete({ ignoreNotFound: true });
  }

  openReadStream(storageKey: string): Promise<Readable> {
    const stream = this.bucket.file(storageKey).createReadStream();
    return Promise.resolve(stream);
  }

  async exists(storageKey: string): Promise<boolean> {
    const [exists] = await this.bucket.file(storageKey).exists();
    return exists;
  }

  getContentType(storageKey: string): string {
    const ext = storageKey.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }
}

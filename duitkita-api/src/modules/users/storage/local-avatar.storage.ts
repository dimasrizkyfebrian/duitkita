import { createReadStream, existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
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

export class LocalAvatarStorage implements AvatarStorage {
  private readonly avatarRoot: string;

  constructor(configService: ConfigService) {
    this.avatarRoot = configService.get<string>(
      'AVATAR_STORAGE_DIR',
      join(process.cwd(), 'storage', 'avatars'),
    );
  }

  private resolvePath(storageKey: string): string {
    return join(this.avatarRoot, storageKey);
  }

  async save(userId: string, buffer: Buffer, contentType: string): Promise<string> {
    const extension = MIME_TO_EXT[contentType] ?? 'jpg';
    const storageKey = buildAvatarStorageKey(userId, extension);
    const destination = this.resolvePath(storageKey);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, buffer);
    return storageKey;
  }

  async delete(storageKey: string): Promise<void> {
    const path = this.resolvePath(storageKey);
    await unlink(path).catch(() => undefined);
  }

  async openReadStream(storageKey: string) {
    return createReadStream(this.resolvePath(storageKey));
  }

  async exists(storageKey: string): Promise<boolean> {
    return existsSync(this.resolvePath(storageKey));
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

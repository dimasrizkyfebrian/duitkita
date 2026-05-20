import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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

export class SupabaseAvatarStorage implements AvatarStorage {
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor(configService: ConfigService) {
    const url = configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceRoleKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when AVATAR_STORAGE_DRIVER=supabase',
      );
    }

    this.bucket = configService.get<string>('SUPABASE_AVATAR_BUCKET', 'avatars');
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async save(userId: string, buffer: Buffer, contentType: string): Promise<string> {
    const extension = MIME_TO_EXT[contentType] ?? 'jpg';
    const storageKey = buildAvatarStorageKey(userId, extension);

    const { error } = await this.client.storage.from(this.bucket).upload(storageKey, buffer, {
      contentType,
      upsert: true,
      cacheControl: '3600',
    });

    if (error) {
      throw new Error(`Supabase avatar upload failed: ${error.message}`);
    }

    return storageKey;
  }

  async delete(storageKey: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([storageKey]);
    if (error) {
      throw new Error(`Supabase avatar delete failed: ${error.message}`);
    }
  }

  async openReadStream(storageKey: string): Promise<Readable> {
    const { data, error } = await this.client.storage.from(this.bucket).download(storageKey);

    if (error || !data) {
      throw new Error(error?.message ?? 'Supabase avatar download failed');
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

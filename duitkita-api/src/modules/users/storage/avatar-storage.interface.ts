import type { Readable } from 'stream';

export const AVATAR_STORAGE = Symbol('AVATAR_STORAGE');

export type AvatarStorageDriver = 'local' | 'supabase';

export function buildAvatarStorageKey(userId: string, extension: string): string {
  return `${userId}/avatar.${extension}`;
}

export interface AvatarStorage {
  save(userId: string, buffer: Buffer, contentType: string): Promise<string>;
  delete(storageKey: string): Promise<void>;
  openReadStream(storageKey: string): Promise<Readable>;
  exists(storageKey: string): Promise<boolean>;
  getContentType(storageKey: string): string;
}

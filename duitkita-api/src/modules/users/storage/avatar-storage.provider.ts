import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AVATAR_STORAGE,
  type AvatarStorage,
  type AvatarStorageDriver,
} from './avatar-storage.interface';
import { LocalAvatarStorage } from './local-avatar.storage';
import { SupabaseAvatarStorage } from './supabase-avatar.storage';
import { GcsAvatarStorage } from './gcs-avatar.storage';

export function resolveAvatarStorageDriver(
  configService: ConfigService,
): AvatarStorageDriver {
  const explicit = configService.get<string>('AVATAR_STORAGE_DRIVER');
  if (explicit === 'local' || explicit === 'supabase' || explicit === 'gcs') {
    return explicit;
  }

  const reportDriver = configService.get<string>('REPORT_STORAGE_DRIVER');
  if (reportDriver === 'local' || reportDriver === 'supabase' || reportDriver === 'gcs') {
    return reportDriver;
  }

  const supabaseUrl = configService.get<string>('SUPABASE_URL');
  const serviceKey = configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
  if (supabaseUrl && serviceKey) {
    return 'supabase';
  }

  return 'local';
}

export const avatarStorageProvider: Provider = {
  provide: AVATAR_STORAGE,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): AvatarStorage => {
    const driver = resolveAvatarStorageDriver(configService);
    switch (driver) {
      case 'gcs':
        return new GcsAvatarStorage(configService);
      case 'supabase':
        return new SupabaseAvatarStorage(configService);
      default:
        return new LocalAvatarStorage(configService);
    }
  },
};

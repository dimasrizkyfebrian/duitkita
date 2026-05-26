import type { Readable } from 'stream';

export const REPORT_EXPORT_STORAGE = Symbol('REPORT_EXPORT_STORAGE');

export type ReportExportStorageDriver = 'local' | 'supabase' | 'gcs';

/** Object key stored in report_exports.file_path (e.g. {userId}/{exportId}.pdf). */
export function buildReportExportStorageKey(userId: string, exportId: string): string {
  return `${userId}/${exportId}.pdf`;
}

export interface ReportExportStorage {
  saveFromFile(
    userId: string,
    exportId: string,
    localPdfPath: string,
  ): Promise<string>;

  openReadStream(storageKey: string): Promise<Readable>;

  exists(storageKey: string): Promise<boolean>;
}

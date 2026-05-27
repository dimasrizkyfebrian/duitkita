import api from "@/lib/api";
import { API_ROUTES } from "@/lib/constants";
import type { ReportExportView, CreateReportExportRequest } from "@/types";

export async function createReportExport(
  payload: CreateReportExportRequest,
): Promise<ReportExportView> {
  const res = await api.post<ReportExportView>(API_ROUTES.reports.exports, payload);
  return res.data;
}

export async function fetchReportExports(): Promise<ReportExportView[]> {
  const res = await api.get<ReportExportView[]>(API_ROUTES.reports.exports);
  return Array.isArray(res.data) ? res.data : [];
}

export async function downloadReportExport(id: string): Promise<Blob> {
  const res = await api.get(API_ROUTES.reports.exportDownload(id), {
    responseType: "blob",
  });
  return res.data as Blob;
}

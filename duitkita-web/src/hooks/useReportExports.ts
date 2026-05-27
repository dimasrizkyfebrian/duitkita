import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/lib/constants";
import { apiErrorToast } from "@/lib/utils";
import {
  createReportExport,
  fetchReportExports,
  downloadReportExport,
} from "@/lib/services/report-export.service";
import type { CreateReportExportRequest, ReportExportView } from "@/types";

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function useReportExports() {
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: QUERY_KEYS.reportExports(),
    queryFn: fetchReportExports,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateReportExportRequest) => createReportExport(payload),
    onSuccess: (newExport) => {
      qc.setQueryData(
        QUERY_KEYS.reportExports(),
        (old: ReportExportView[] | undefined) => [newExport, ...(old ?? [])],
      );
      toast.success("Laporan PDF berhasil dibuat");
    },
    onError: (err: unknown) => {
      toast.error(...apiErrorToast(err, "Gagal membuat laporan PDF"));
    },
  });

  const downloadMutation = useMutation({
    mutationFn: ({ id, filename }: { id: string; filename: string }) =>
      downloadReportExport(id).then((blob) => triggerBrowserDownload(blob, filename)),
    onError: (err: unknown) => {
      toast.error(...apiErrorToast(err, "Gagal mengunduh laporan"));
    },
  });

  return {
    exports: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    createExport: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    downloadExport: downloadMutation.mutateAsync,
    isDownloading: downloadMutation.isPending,
    downloadingId: downloadMutation.variables?.id ?? null,
  };
}

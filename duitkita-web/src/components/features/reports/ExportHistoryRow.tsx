"use client";

import { Clock, CheckCircle2, XCircle, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MONTH_NAMES } from "@/lib/utils";
import type { ReportExportView } from "@/types";

interface ExportHistoryRowProps {
  export: ReportExportView;
  onDownload: () => void;
  isDownloading: boolean;
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function StatusIcon({ status }: { status: ReportExportView["status"] }) {
  if (status === "completed")
    return <CheckCircle2 size={14} className="text-success shrink-0" />;
  if (status === "failed")
    return <XCircle size={14} className="text-destructive shrink-0" />;
  return <Clock size={14} className="text-warning shrink-0 animate-pulse" />;
}

export function ExportHistoryRow({
  export: exp,
  onDownload,
  isDownloading,
}: ExportHistoryRowProps) {
  const expired = isExpired(exp.expiresAt);
  const scopeLabel = exp.scope === "both" ? "Berdua" : "Saya";
  const monthLabel = MONTH_NAMES[exp.month - 1] ?? "";

  return (
    <div className="flex items-center gap-3 py-2">
      <StatusIcon status={exp.status} />

      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          {monthLabel} {exp.year} &ndash; {scopeLabel}
        </p>
        <p className="text-xs text-muted-foreground">
          {exp.status === "completed" && exp.expiresAt
            ? expired
              ? "Sudah kedaluwarsa"
              : `Berlaku hingga ${new Date(exp.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`
            : exp.status === "failed"
              ? `Gagal: ${exp.errorMessage ?? "Terjadi kesalahan"}`
              : "Sedang diproses..."}
        </p>
      </div>

      {exp.downloadReady && !expired ? (
        <Button
          size="sm"
          variant="outline"
          onClick={onDownload}
          disabled={isDownloading}
          className="shrink-0"
        >
          {isDownloading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}
        </Button>
      ) : expired ? (
        <span className="text-[10px] text-muted-foreground shrink-0">
          Kedaluwarsa
        </span>
      ) : null}
    </div>
  );
}

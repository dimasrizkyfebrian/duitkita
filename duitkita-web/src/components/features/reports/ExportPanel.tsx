"use client";

import { useState } from "react";
import { FileText, ChevronDown, ChevronUp, Plus, Loader2 } from "lucide-react";
import { MONTH_NAMES } from "@/lib/utils";
import { useReportExports } from "@/hooks/useReportExports";
import { ExportHistoryRow } from "./ExportHistoryRow";

interface ExportPanelProps {
  year: number;
  month: number;
  hasPartner: boolean | undefined;
}

export function ExportPanel({ year, month, hasPartner }: ExportPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [exportScope, setExportScope] = useState<"me" | "both">("me");

  const { exports, isLoading, createExport, isCreating, downloadExport, downloadingId } =
    useReportExports();

  const monthLabel = MONTH_NAMES[month - 1] ?? "";

  async function handleCreate() {
    await createExport({ format: "pdf", year, month, scope: exportScope });
  }

  function handleDownload(exp: (typeof exports)[number]) {
    const filename = `laporan-${monthLabel.toLowerCase()}-${year}-${exp.scope}.pdf`;
    downloadExport({ id: exp.id, filename });
  }

  return (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <FileText size={13} className="text-purple-400" />
          <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Ekspor PDF</span>
        </div>
        {expanded ? (
          <ChevronUp size={15} className="text-white/35" />
        ) : (
          <ChevronDown size={15} className="text-white/35" />
        )}
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {hasPartner && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-white/[0.06] rounded-xl">
              {(["me", "both"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setExportScope(s)}
                  className={`text-xs font-medium py-1.5 rounded-lg transition-colors ${
                    exportScope === s
                      ? "bg-white/[0.12] text-white"
                      : "text-white/40"
                  }`}
                >
                  {s === "me" ? "Saya" : "Berdua"}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #8b2be2 0%, #e91e8c 100%)" }}
          >
            {isCreating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            Buat Laporan {monthLabel} {year}
          </button>

          {isLoading ? (
            <div className="space-y-2 pt-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : exports.length > 0 ? (
            <div className="border-t border-border pt-3 space-y-1">
              <p className="text-xs text-muted-foreground mb-2">Riwayat ekspor</p>
              {exports.slice(0, 10).map((exp) => (
                <ExportHistoryRow
                  key={exp.id}
                  export={exp}
                  onDownload={() => handleDownload(exp)}
                  isDownloading={downloadingId === exp.id}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

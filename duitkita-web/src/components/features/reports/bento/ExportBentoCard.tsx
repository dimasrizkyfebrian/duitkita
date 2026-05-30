"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Plus, Loader2, Download, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MONTH_NAMES } from "@/lib/utils";
import { useReportExports } from "@/hooks/useReportExports";
import type { ReportExportView } from "@/types";

interface ExportBentoCardProps {
  year: number;
  month: number;
  hasPartner: boolean | undefined;
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function StatusIcon({ status }: { status: ReportExportView["status"] }) {
  if (status === "completed") return <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />;
  if (status === "failed") return <XCircle size={12} className="text-red-400 shrink-0" />;
  return <Clock size={12} className="text-amber-400 shrink-0 animate-pulse" />;
}

export function ExportBentoCard({ year, month, hasPartner }: ExportBentoCardProps) {
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.35 }}
      className="glass-card glass-card-accent rounded-3xl p-5"
    >
      <div className="flex items-center gap-4 flex-wrap">
        {/* Label */}
        <div className="flex items-center gap-2 shrink-0">
          <FileText size={14} className="text-purple-400" />
          <span className="text-xs font-semibold desktop-text uppercase tracking-wider">Ekspor PDF</span>
        </div>

        {/* Scope toggle */}
        {hasPartner && (
          <div className="flex gap-1 p-1 bg-white/[0.05] rounded-xl shrink-0">
            {(["me", "both"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setExportScope(s)}
                className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                  exportScope === s
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                {s === "me" ? "Saya" : "Berdua"}
              </button>
            ))}
          </div>
        )}

        {/* Create button */}
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={isCreating}
          className="shrink-0 h-8 text-xs"
        >
          {isCreating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Buat {monthLabel} {year}
        </Button>

        {/* Export history inline */}
        {isLoading ? (
          <div className="flex gap-2 flex-1 min-w-0">
            {[0, 1].map((i) => <div key={i} className="h-8 w-40 bg-white/[0.05] animate-pulse rounded-lg" />)}
          </div>
        ) : exports.length > 0 ? (
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            {exports.slice(0, 5).map((exp) => {
              const expired = isExpired(exp.expiresAt);
              const scopeLabel = exp.scope === "both" ? "Berdua" : "Saya";
              const mLabel = MONTH_NAMES[exp.month - 1] ?? "";
              return (
                <div
                  key={exp.id}
                  className="flex items-center gap-2 bg-white/[0.04] rounded-xl px-2.5 py-1.5 shrink-0"
                >
                  <StatusIcon status={exp.status} />
                  <span className="text-[10px] desktop-text-muted">
                    {mLabel} {exp.year} · {scopeLabel}
                  </span>
                  {exp.downloadReady && !expired ? (
                    <button
                      onClick={() => handleDownload(exp)}
                      disabled={downloadingId === exp.id}
                      className="text-white/50 hover:text-white/80 transition-colors disabled:opacity-50"
                    >
                      {downloadingId === exp.id ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <Download size={10} />
                      )}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

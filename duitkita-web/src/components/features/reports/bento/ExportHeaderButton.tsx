"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  Loader2,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MONTH_NAMES } from "@/lib/utils";
import { useReportExports } from "@/hooks/useReportExports";
import type { ReportExportView } from "@/types";

interface ExportHeaderButtonProps {
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

export function ExportHeaderButton({ year, month, hasPartner }: ExportHeaderButtonProps) {
  const [open, setOpen] = useState(false);
  const [exportScope, setExportScope] = useState<"me" | "both">("me");
  const ref = useRef<HTMLDivElement>(null);

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

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const pendingCount = exports.filter((e) => e.status === "pending").length;
  const readyCount = exports.filter(
    (e) => e.downloadReady && !isExpired(e.expiresAt),
  ).length;

  return (
    <div ref={ref} className="relative shrink-0">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200 text-sm font-medium ${
          open
            ? "bg-white/[0.1] border-white/20 text-white"
            : "bg-white/[0.05] border-white/[0.08] text-white/60 hover:text-white/80 hover:bg-white/[0.08]"
        }`}
      >
        <FileText size={13} />
        <span>Ekspor</span>
        {readyCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-white flex items-center justify-center">
            {readyCount}
          </span>
        )}
        {pendingCount > 0 && (
          <Loader2 size={11} className="animate-spin text-amber-400" />
        )}
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-80 rounded-2xl p-4 z-50 border border-white/[0.12] shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
          style={{ background: "oklch(0.20 0.055 280 / 0.97)", backdropFilter: "blur(24px) saturate(150%)" }}
          >
            {/* Panel header */}
            <div className="flex items-center gap-2 mb-4">
              <FileText size={13} className="text-purple-400" />
              <span className="text-xs font-semibold desktop-text uppercase tracking-wider">
                Ekspor PDF
              </span>
              <span className="desktop-text-dim text-xs ml-auto">
                {monthLabel} {year}
              </span>
            </div>

            {/* Scope toggle + create */}
            <div className="flex items-center gap-2 mb-4">
              {hasPartner && (
                <div className="flex gap-1 p-1 bg-white/[0.05] rounded-xl">
                  {(["me", "both"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setExportScope(s)}
                      className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                        exportScope === s
                          ? "bg-white/10 text-white"
                          : "text-white/40 hover:text-white/60"
                      }`}
                    >
                      {s === "me" ? "Saya" : "Berdua"}
                    </button>
                  ))}
                </div>
              )}
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={isCreating}
                className="flex-1 h-8 text-xs"
              >
                {isCreating ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Plus size={12} />
                )}
                Buat {monthLabel} {year}
              </Button>
            </div>

            {/* Export history */}
            {isLoading ? (
              <div className="space-y-2">
                {[0, 1].map((i) => (
                  <div key={i} className="h-9 bg-white/[0.04] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : exports.length > 0 ? (
              <div className="space-y-1">
                <p className="text-[10px] desktop-text-dim mb-2 uppercase tracking-wider">
                  Riwayat ekspor
                </p>
                {exports.slice(0, 6).map((exp) => {
                  const expired = isExpired(exp.expiresAt);
                  const scopeLabel = exp.scope === "both" ? "Berdua" : "Saya";
                  const mLabel = MONTH_NAMES[exp.month - 1] ?? "";
                  return (
                    <div
                      key={exp.id}
                      className="flex items-center gap-2.5 bg-white/[0.03] rounded-xl px-3 py-2 hover:bg-white/[0.05] transition-colors"
                    >
                      <StatusIcon status={exp.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/80">
                          {mLabel} {exp.year} &ndash; {scopeLabel}
                        </p>
                        {exp.status === "completed" && exp.expiresAt && (
                          <p className="text-[10px] desktop-text-dim">
                            {expired
                              ? "Kedaluwarsa"
                              : `Berlaku hingga ${new Date(exp.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`}
                          </p>
                        )}
                        {exp.status === "failed" && (
                          <p className="text-[10px] text-red-400/70">
                            {exp.errorMessage ?? "Terjadi kesalahan"}
                          </p>
                        )}
                        {exp.status === "pending" && (
                          <p className="text-[10px] text-amber-400/70">Sedang diproses…</p>
                        )}
                      </div>
                      {exp.downloadReady && !expired && (
                        <button
                          onClick={() => handleDownload(exp)}
                          disabled={downloadingId === exp.id}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.12] transition-colors disabled:opacity-40"
                        >
                          {downloadingId === exp.id ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <Download size={11} />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs desktop-text-dim text-center py-3">
                Belum ada riwayat ekspor
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

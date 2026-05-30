"use client";

import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import {
  cn,
  formatCurrency,
  formatCurrencyShort,
  getAlertBg,
} from "@/lib/utils";
import {
  ALERT_DANGER_THRESHOLD,
  ALERT_WARNING_THRESHOLD,
} from "@/lib/constants";
import type { AlertStatus } from "@/types";

interface ReportSummaryCardProps {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  percentageUsed: number;
}

function statusFromPct(pct: number): AlertStatus {
  if (pct >= 100) return "over";
  if (pct >= ALERT_DANGER_THRESHOLD) return "danger";
  if (pct >= ALERT_WARNING_THRESHOLD) return "warning";
  return "ok";
}

function getProgressColor(status: AlertStatus) {
  if (status === "ok") return "#10b981";
  if (status === "warning") return "#f59e0b";
  return "#ef4444";
}

function getSpentColor(status: AlertStatus) {
  if (status === "ok") return "text-emerald-400";
  if (status === "warning") return "text-amber-400";
  return "text-red-400";
}

export function ReportSummaryCard({
  totalBudget,
  totalSpent,
  totalRemaining,
  percentageUsed,
}: ReportSummaryCardProps) {
  const status = statusFromPct(percentageUsed);
  const progressColor = getProgressColor(status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-2xl p-4 space-y-4 border border-white/[0.08] overflow-hidden relative"
      style={{ background: "linear-gradient(135deg, rgba(139,43,226,0.18) 0%, rgba(30,10,60,0.6) 100%)" }}
    >
      {/* Decorative orb */}
      <div
        className="absolute -top-6 -right-6 w-28 h-28 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(139,43,226,0.25) 0%, transparent 70%)" }}
      />

      <div className="flex items-center gap-2 relative">
        <BarChart3 size={13} className="text-purple-400" />
        <h3 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
          Ringkasan Bulan Ini
        </h3>
      </div>

      {/* 3 metric blocks */}
      <div className="grid grid-cols-3 gap-2 relative">
        {[
          { label: "Anggaran", value: totalBudget, className: "text-white/80" },
          { label: "Terpakai", value: totalSpent, className: getSpentColor(status) },
          { label: "Sisa", value: totalRemaining, className: "text-white/70" },
        ].map((m) => (
          <div key={m.label} className="bg-white/[0.06] rounded-xl px-2 py-2.5 text-center">
            <p className="text-[10px] text-white/40 mb-1">{m.label}</p>
            <p
              className={cn("text-sm font-bold truncate", m.className)}
              title={formatCurrency(m.value)}
            >
              {formatCurrencyShort(m.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Progress + badge */}
      <div className="space-y-2 relative">
        <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: progressColor, filter: `drop-shadow(0 0 4px ${progressColor}80)` }}
            initial={{ width: "0%" }}
            animate={{ width: `${Math.min(percentageUsed, 100).toFixed(1)}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full", getAlertBg(status))}>
            {percentageUsed.toFixed(0)}% terpakai
          </span>
          <span className="text-[10px] text-white/35">
            dari {formatCurrencyShort(totalBudget)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

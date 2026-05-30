"use client";

import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { cn, formatCurrency, formatCurrencyShort, getAlertBg } from "@/lib/utils";
import { ALERT_DANGER_THRESHOLD, ALERT_WARNING_THRESHOLD } from "@/lib/constants";
import type { AlertStatus } from "@/types";

interface SummaryBentoCardProps {
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

export function SummaryBentoCard({
  totalBudget,
  totalSpent,
  totalRemaining,
  percentageUsed,
}: SummaryBentoCardProps) {
  const status = statusFromPct(percentageUsed);
  const progressColor = getProgressColor(status);
  const progressWidth = `${Math.min(percentageUsed, 100).toFixed(1)}%`;

  const metrics = [
    { label: "Anggaran", value: totalBudget, dim: true },
    { label: "Terpakai", value: totalSpent, dim: false },
    { label: "Sisa", value: totalRemaining, dim: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="glass-card glass-card-accent rounded-3xl p-5 flex flex-col gap-4 h-full"
    >
      <div className="flex items-center gap-2">
        <BarChart3 size={14} className="text-purple-400" />
        <h3 className="text-xs font-semibold desktop-text uppercase tracking-wider">
          Ringkasan Bulan Ini
        </h3>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white/[0.04] rounded-2xl p-3 space-y-1">
            <p className="text-[11px] desktop-text-dim">{m.label}</p>
            <p
              className={cn("text-base font-bold truncate", m.dim ? "desktop-text-muted" : "text-white")}
              title={formatCurrency(m.value)}
            >
              {formatCurrencyShort(m.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5 mt-auto">
        <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: progressColor, filter: `drop-shadow(0 0 4px ${progressColor}80)` }}
            initial={{ width: "0%" }}
            animate={{ width: progressWidth }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", getAlertBg(status))}>
            {percentageUsed.toFixed(0)}% terpakai
          </span>
          <span className="desktop-text-dim text-[11px]">
            dari {formatCurrencyShort(totalBudget)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

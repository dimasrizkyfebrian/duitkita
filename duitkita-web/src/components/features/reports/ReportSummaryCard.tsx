"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
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

export function ReportSummaryCard({
  totalBudget,
  totalSpent,
  totalRemaining,
  percentageUsed,
}: ReportSummaryCardProps) {
  const items = [
    { label: "Anggaran", value: totalBudget },
    { label: "Terpakai", value: totalSpent },
    { label: "Sisa", value: totalRemaining },
  ];
  const status = statusFromPct(percentageUsed);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="bg-card rounded-2xl shadow-sm p-4 space-y-3"
    >
      <div className="flex items-center">
        {items.map((item, i) => (
          <Fragment key={item.label}>
            <div className="flex-1 flex flex-col items-center gap-0.5">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p
                className="text-base font-bold text-foreground"
                title={formatCurrency(item.value)}
              >
                {formatCurrencyShort(item.value)}
              </p>
            </div>
            {i < items.length - 1 && (
              <Separator orientation="vertical" className="h-8" />
            )}
          </Fragment>
        ))}
      </div>
      <div className="flex items-center justify-center">
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            getAlertBg(status),
          )}
        >
          {percentageUsed.toFixed(0)}% terpakai
        </span>
      </div>
    </motion.div>
  );
}

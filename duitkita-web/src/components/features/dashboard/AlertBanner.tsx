"use client";

import { AlertTriangle, X } from "lucide-react";
import { motion } from "framer-motion";
import { getAlertBg, getAlertLabel } from "@/lib/utils";
import type { MonthlyBudget } from "@/types";

interface AlertBannerProps {
  budget: MonthlyBudget;
  onDismiss: () => void;
}

export function AlertBanner({ budget, onDismiss }: AlertBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scaleY: 0.9 }}
      animate={{ opacity: 1, scaleY: 1 }}
      exit={{ opacity: 0, scaleY: 0.9 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 ${getAlertBg(budget.alertStatus)}`}
    >
      <AlertTriangle size={16} className="shrink-0 animate-pulse-once" />
      <p className="flex-1 text-sm leading-snug">
        Anggaran <span className="font-semibold">{budget.category.name}</span>{" "}
        {getAlertLabel(budget.alertStatus).toLowerCase()}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Tutup notifikasi"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

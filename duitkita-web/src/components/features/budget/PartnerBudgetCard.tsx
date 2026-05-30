"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import {
  cn,
  formatCurrencyShort,
  getAlertBg,
  getAlertColor,
  getAlertLabel,
  getProgressGradient,
} from "@/lib/utils";
import type { MonthlyBudget } from "@/types";

interface PartnerBudgetCardProps {
  budget: MonthlyBudget;
  index: number;
}

export const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export function PartnerBudgetCard({ budget, index }: PartnerBudgetCardProps) {
  const pct = budget.percentageUsed;
  const isOver = budget.alertStatus === "over";

  return (
    <motion.li variants={itemVariants} className="px-3 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg w-9 h-9 flex items-center justify-center bg-white/[0.08] rounded-xl shrink-0">
            {budget.category.icon ?? budget.category.name[0].toUpperCase()}
          </span>
          <span className="text-sm font-medium text-white truncate">
            {budget.category.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {budget.isFinalized && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-white/[0.08] text-white/50">
              <Lock size={10} />
              Dikunci
            </span>
          )}
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              getAlertBg(budget.alertStatus),
            )}
          >
            {getAlertLabel(budget.alertStatus)}
          </span>
        </div>
      </div>

      <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: getProgressGradient(budget.alertStatus) }}
          initial={{ width: "0%" }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.05 }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-white/45">
          {formatCurrencyShort(budget.totalSpent)} /{" "}
          {formatCurrencyShort(budget.totalAmount)}
        </p>
        <p
          className={cn(
            "text-xs font-medium",
            isOver ? getAlertColor("over") : "text-white/45",
          )}
        >
          {pct.toFixed(0)}%
        </p>
      </div>

      {budget.rolloverAmount > 0 && (
        <p className="text-xs text-white/35">
          + {formatCurrencyShort(budget.rolloverAmount)} saldo bulan lalu
        </p>
      )}
    </motion.li>
  );
}

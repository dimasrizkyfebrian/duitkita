"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { CountUp } from "@/components/ui/count-up";
import {
  getAlertBg,
  getAlertLabel,
  getProgressGradient,
  formatCurrencyShort,
  cn,
} from "@/lib/utils";
import type { MonthlyBudget } from "@/types";
import { desktopItemVariants } from "./BudgetDesktopCard";

interface BudgetDesktopPartnerCardProps {
  budget: MonthlyBudget;
  index: number;
}

export function BudgetDesktopPartnerCard({ budget, index }: BudgetDesktopPartnerCardProps) {
  const pct = budget.percentageUsed;
  const isOver = budget.alertStatus === "over";
  const spotlightColor = isOver
    ? "rgba(220, 38, 38, 0.14)"
    : budget.alertStatus === "danger" || budget.alertStatus === "warning"
      ? "rgba(217, 119, 6, 0.14)"
      : "rgba(139, 43, 226, 0.15)";

  return (
    <motion.div
      custom={index}
      variants={desktopItemVariants}
      initial="hidden"
      animate="visible"
    >
      <SpotlightCard
        className="glass-card rounded-2xl p-4 space-y-3.5 h-full flex flex-col"
        spotlightColor={spotlightColor}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl w-12 h-12 flex items-center justify-center bg-white/[0.08] rounded-xl shrink-0 select-none">
              {budget.category.icon ?? budget.category.name[0].toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {budget.category.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span
                  className={cn(
                    "inline-block text-[10px] font-medium px-2 py-0.5 rounded-full",
                    getAlertBg(budget.alertStatus),
                  )}
                >
                  {getAlertLabel(budget.alertStatus)}
                </span>
                {budget.isFinalized && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                    <Lock size={9} />
                    Dikunci
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Spent amount */}
        <div className="flex-1">
          <p className="text-2xl font-bold text-white leading-none">
            <CountUp value={budget.totalSpent} formatter={formatCurrencyShort} duration={0.8} />
          </p>
          <p className="text-xs text-white/35 mt-1">
            dari {formatCurrencyShort(budget.totalAmount)}
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: getProgressGradient(budget.alertStatus) }}
              initial={{ width: "0%" }}
              animate={{ width: `${Math.min(pct, 100)}%` }}
              transition={{ duration: 0.7, ease: "easeOut", delay: index * 0.05 }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-white/35">{pct.toFixed(0)}% terpakai</p>
            {isOver && (
              <p className="text-[11px] text-red-400 font-medium">
                Over {formatCurrencyShort(Math.abs(budget.remaining))}
              </p>
            )}
          </div>
        </div>

        {budget.rolloverAmount > 0 && (
          <p className="text-[11px] text-white/30">
            + {formatCurrencyShort(budget.rolloverAmount)} saldo lalu
          </p>
        )}
      </SpotlightCard>
    </motion.div>
  );
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import {
  getAlertBg,
  getAlertLabel,
  getAlertColor,
  formatCurrencyShort,
  cn,
} from "@/lib/utils";
import { BudgetListSkeleton } from "./DashboardSkeleton";
import type { MonthlyBudget } from "@/types";

interface BudgetListProps {
  budgets: MonthlyBudget[];
  isLoading: boolean;
}

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
};

function getProgressGradient(status: string): string {
  switch (status) {
    case "ok":      return "linear-gradient(90deg, #8b2be2, #a855f7)";
    case "warning": return "linear-gradient(90deg, #d97706, #fbbf24)";
    case "danger":  return "linear-gradient(90deg, #ea580c, #f97316)";
    case "over":    return "linear-gradient(90deg, #dc2626, #f87171)";
    default:        return "linear-gradient(90deg, #8b2be2, #a855f7)";
  }
}

export function BudgetList({ budgets, isLoading }: BudgetListProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wide">
          Anggaran Bulan Ini
        </h2>
        <Link href="/expenses" className="text-xs text-purple-300 font-medium">
          Pengeluaran →
        </Link>
      </div>

      {isLoading ? (
        <BudgetListSkeleton />
      ) : budgets.length === 0 ? (
        <div className="glass-card rounded-2xl text-center py-8 space-y-3">
          <p className="text-sm text-white/45">Belum ada anggaran bulan ini.</p>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-white/15 text-white/70 hover:bg-white/[0.08] hover:text-white"
          >
            <Link href="/budget">Atur Anggaran</Link>
          </Button>
        </div>
      ) : (
        <motion.ul
          variants={listVariants}
          initial="hidden"
          animate="visible"
          className="space-y-2.5"
        >
          {budgets.map((budget, index) => {
            const pct = budget.percentageUsed;
            const isOver = budget.alertStatus === "over";

            return (
              <motion.li key={budget.id} variants={itemVariants}>
                <SpotlightCard
                  className={cn(
                    "glass-card rounded-2xl p-3.5",
                    budget.isFinalized && "opacity-55"
                  )}
                  spotlightColor={
                    isOver
                      ? "rgba(239, 68, 68, 0.15)"
                      : "rgba(139, 43, 226, 0.18)"
                  }
                >
                  {/* Row 1: icon + name + badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base w-8 h-8 flex items-center justify-center bg-white/[0.07] rounded-xl shrink-0 border border-white/[0.06]">
                        {budget.category.icon ?? budget.category.name[0].toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-white/90 truncate">
                        {budget.category.name}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                        getAlertBg(budget.alertStatus)
                      )}
                    >
                      {getAlertLabel(budget.alertStatus)}
                    </span>
                  </div>

                  {/* Row 2: gradient progress bar */}
                  <div className="relative h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ background: getProgressGradient(budget.alertStatus) }}
                      initial={{ width: "0%" }}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{
                        duration: 0.8,
                        ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
                        delay: 0.1 + index * 0.07,
                      }}
                    />
                  </div>

                  {/* Row 3: amounts + percentage */}
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[11px] text-white/40">
                      {formatCurrencyShort(budget.totalSpent)}{" "}
                      <span className="text-white/25">/</span>{" "}
                      {formatCurrencyShort(budget.totalAmount)}
                    </p>
                    <p
                      className={cn(
                        "text-[11px] font-semibold",
                        isOver ? getAlertColor("over") : "text-white/50"
                      )}
                    >
                      {pct.toFixed(0)}%
                    </p>
                  </div>
                </SpotlightCard>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </section>
  );
}

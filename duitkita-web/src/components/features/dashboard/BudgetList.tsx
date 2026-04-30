"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  getAlertBg,
  getAlertLabel,
  getAlertColor,
  getProgressColor,
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
  visible: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export function BudgetList({ budgets, isLoading }: BudgetListProps) {
  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-3">
        Anggaran Bulan Ini
      </h2>

      {isLoading ? (
        <BudgetListSkeleton />
      ) : budgets.length === 0 ? (
        <div className="text-center py-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Belum ada anggaran bulan ini.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/budget">Atur Anggaran</Link>
          </Button>
        </div>
      ) : (
        <motion.ul
          variants={listVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {budgets.map((budget, index) => {
            const pct = budget.percentageUsed;
            const isOver = budget.alertStatus === "over";

            return (
              <motion.li
                key={budget.id}
                variants={itemVariants}
                className={cn("space-y-1.5", budget.isFinalized && "opacity-60")}
              >
                {/* Row 1: icon + name + badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg w-8 h-8 flex items-center justify-center bg-muted rounded-xl shrink-0">
                      {budget.category.icon ??
                        budget.category.name[0].toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">
                      {budget.category.name}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-xs font-medium px-2 py-0.5 rounded-full",
                      getAlertBg(budget.alertStatus),
                    )}
                  >
                    {getAlertLabel(budget.alertStatus)}
                  </span>
                </div>

                {/* Row 2: animated progress bar */}
                <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full",
                      getProgressColor(budget.alertStatus),
                    )}
                    initial={{ width: "0%" }}
                    animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{
                      duration: 0.6,
                      ease: "easeOut",
                      delay: index * 0.05,
                    }}
                  />
                </div>

                {/* Row 3: amounts + percentage */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {formatCurrencyShort(budget.totalSpent)} /{" "}
                    {formatCurrencyShort(budget.totalAmount)}
                  </p>
                  <p
                    className={cn(
                      "text-xs font-medium",
                      isOver
                        ? getAlertColor("over")
                        : "text-muted-foreground",
                    )}
                  >
                    {pct.toFixed(0)}%
                  </p>
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </section>
  );
}

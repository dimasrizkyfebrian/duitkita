"use client";

import { motion } from "framer-motion";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  getAlertBg,
  getAlertLabel,
  getAlertColor,
  getProgressColor,
  formatCurrencyShort,
  cn,
} from "@/lib/utils";
import type { MonthlyBudget } from "@/types";

interface BudgetCardProps {
  budget: MonthlyBudget;
  index: number;
  isFinalized: boolean;
  onEdit: (budget: MonthlyBudget) => void;
  onDelete: (budget: MonthlyBudget) => void;
}

export const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export function BudgetCard({
  budget,
  index,
  isFinalized,
  onEdit,
  onDelete,
}: BudgetCardProps) {
  const pct = budget.percentageUsed;
  const isOver = budget.alertStatus === "over";

  return (
    <motion.li variants={itemVariants} className="px-3 py-3 space-y-2">
      {/* Row 1: icon + name + badge + menu */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg w-9 h-9 flex items-center justify-center bg-muted rounded-xl shrink-0">
            {budget.category.icon ?? budget.category.name[0].toUpperCase()}
          </span>
          <span className="text-sm font-medium text-foreground truncate">
            {budget.category.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              getAlertBg(budget.alertStatus),
            )}
          >
            {getAlertLabel(budget.alertStatus)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreVertical size={14} />
                <span className="sr-only">Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onEdit(budget)}
                disabled={isFinalized}
                className="gap-2"
              >
                <Pencil size={14} />
                Edit anggaran
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(budget)}
                disabled={isFinalized}
                variant="destructive"
                className="gap-2"
              >
                <Trash2 size={14} />
                Hapus anggaran
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
          transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.05 }}
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
            isOver ? getAlertColor("over") : "text-muted-foreground",
          )}
        >
          {pct.toFixed(0)}%
        </p>
      </div>

      {/* Row 4: rollover info */}
      {budget.rolloverAmount > 0 && (
        <p className="text-xs text-muted-foreground">
          + {formatCurrencyShort(budget.rolloverAmount)} saldo bulan lalu
        </p>
      )}
    </motion.li>
  );
}

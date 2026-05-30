"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ListOrdered, MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getAlertBg,
  getAlertLabel,
  getAlertColor,
  getProgressGradient,
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
          <span className="text-lg w-9 h-9 flex items-center justify-center bg-white/[0.08] rounded-xl shrink-0">
            {budget.category.icon ?? budget.category.name[0].toUpperCase()}
          </span>
          <span className="text-sm font-medium text-white truncate">
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
              <button className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors">
                <MoreVertical size={14} />
                <span className="sr-only">Menu</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[180px] border-white/[0.1]"
              style={{ background: "rgba(15, 5, 40, 0.95)", backdropFilter: "blur(20px) saturate(180%)" }}
            >
              <DropdownMenuItem asChild className="gap-2">
                <Link href={`/budget/${budget.id}`}>
                  <ListOrdered size={14} />
                  Lihat pengeluaran
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
      <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: getProgressGradient(budget.alertStatus) }}
          initial={{ width: "0%" }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.05 }}
        />
      </div>

      {/* Row 3: amounts + percentage */}
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

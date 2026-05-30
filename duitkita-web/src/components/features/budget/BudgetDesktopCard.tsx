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

interface BudgetDesktopCardProps {
  budget: MonthlyBudget;
  index: number;
  isFinalized: boolean;
  onEdit: (budget: MonthlyBudget) => void;
  onDelete: (budget: MonthlyBudget) => void;
}

export const desktopItemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] as [number,number,number,number], delay: i * 0.04 },
  }),
};

export function BudgetDesktopCard({
  budget,
  index,
  isFinalized,
  onEdit,
  onDelete,
}: BudgetDesktopCardProps) {
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
        {/* Header: icon + name + status + menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl w-12 h-12 flex items-center justify-center bg-white/[0.08] rounded-xl shrink-0 select-none">
              {budget.category.icon ?? budget.category.name[0].toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {budget.category.name}
              </p>
              <span
                className={cn(
                  "inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-0.5",
                  getAlertBg(budget.alertStatus),
                )}
              >
                {getAlertLabel(budget.alertStatus)}
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.08] text-white/40 hover:text-white/70 transition-colors shrink-0">
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

        {/* Spent amount (prominent) */}
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

        {/* Rollover */}
        {budget.rolloverAmount > 0 && (
          <p className="text-[11px] text-white/30">
            + {formatCurrencyShort(budget.rolloverAmount)} saldo lalu
          </p>
        )}
      </SpotlightCard>
    </motion.div>
  );
}

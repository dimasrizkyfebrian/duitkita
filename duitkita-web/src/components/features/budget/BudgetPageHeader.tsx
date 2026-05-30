"use client";

import { Fragment } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  formatCurrency,
  formatCurrencyShort,
  getMonthName,
} from "@/lib/utils";

interface BudgetPageHeaderProps {
  year: number;
  month: number;
  totalBudget: number;
  totalSpent: number;
  isFinalized: boolean;
  hasBudgets: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onFinalize: () => void;
  isFinalizing: boolean;
}

export function BudgetPageHeader({
  year,
  month,
  totalBudget,
  totalSpent,
  isFinalized,
  hasBudgets,
  onPrevMonth,
  onNextMonth,
  onFinalize,
  isFinalizing,
}: BudgetPageHeaderProps) {
  const now = new Date();
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;
  const isFutureMonth =
    year > now.getFullYear() ||
    (year === now.getFullYear() && month > now.getMonth() + 1);

  const totalRemaining = totalBudget - totalSpent;

  const items = [
    { label: "Anggaran", value: totalBudget },
    { label: "Terpakai", value: totalSpent },
    { label: "Sisa", value: totalRemaining },
  ];

  return (
    <div className="space-y-3">
      {/* Month navigator + overflow menu */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrevMonth}
          aria-label="Bulan sebelumnya"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-white">
          {getMonthName(month)} {year}
        </span>
        <div className="flex items-center">
          <button
            onClick={onNextMonth}
            disabled={isCurrentMonth || isFutureMonth}
            aria-label="Bulan berikutnya"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors disabled:text-white/20 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Menu lainnya"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <MoreVertical size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="border-white/[0.1]"
              style={{ background: "rgba(15, 5, 40, 0.95)", backdropFilter: "blur(20px) saturate(180%)" }}
            >
              <DropdownMenuItem
                onClick={onFinalize}
                disabled={isFinalized || isFinalizing || !hasBudgets}
                className="gap-2"
              >
                {isFinalizing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Lock size={14} />
                )}
                {isFinalized ? "Sudah Dikunci" : "Kunci Bulan Ini"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary card */}
      <div className="glass-card rounded-2xl p-4 flex items-center">
        {items.map((item, i) => (
          <Fragment key={item.label}>
            <div className="flex-1 flex flex-col items-center gap-0.5">
              <p className="text-xs text-white/45">{item.label}</p>
              <p
                className="text-base font-bold text-white"
                title={formatCurrency(item.value)}
              >
                {formatCurrencyShort(item.value)}
              </p>
            </div>
            {i < items.length - 1 && (
              <div className="w-px h-8 bg-white/[0.12] shrink-0" />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

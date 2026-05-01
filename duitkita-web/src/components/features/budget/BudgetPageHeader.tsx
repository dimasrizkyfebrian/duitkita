"use client";

import { ChevronLeft, ChevronRight, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrencyShort, getMonthName } from "@/lib/utils";

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

  return (
    <div className="space-y-3">
      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onPrevMonth}
          aria-label="Bulan sebelumnya"
        >
          <ChevronLeft size={18} />
        </Button>
        <span className="text-sm font-semibold text-foreground">
          {getMonthName(month)} {year}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onNextMonth}
          disabled={isCurrentMonth || isFutureMonth}
          aria-label="Bulan berikutnya"
        >
          <ChevronRight size={18} />
        </Button>
      </div>

      {/* Summary strip */}
      <div className="bg-card rounded-2xl p-4 flex items-center justify-around">
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-xs text-muted-foreground">Total Anggaran</p>
          <p className="text-base font-semibold text-foreground">
            {formatCurrencyShort(totalBudget)}
          </p>
        </div>
        <Separator orientation="vertical" className="h-8" />
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-xs text-muted-foreground">Terpakai</p>
          <p className="text-base font-semibold text-foreground">
            {formatCurrencyShort(totalSpent)}
          </p>
        </div>
      </div>

      {/* Finalize button */}
      {isFinalized ? (
        <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground">
          <Lock size={12} />
          <span>Anggaran bulan ini sudah dikunci</span>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={onFinalize}
          disabled={isFinalizing || !hasBudgets}
        >
          {isFinalizing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Lock size={14} />
          )}
          Kunci Bulan Ini
        </Button>
      )}
    </div>
  );
}

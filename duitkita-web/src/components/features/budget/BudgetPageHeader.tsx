"use client";

import { Fragment } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
      <div className="grid grid-cols-[auto_1fr_auto] items-center">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onPrevMonth}
          aria-label="Bulan sebelumnya"
        >
          <ChevronLeft size={18} />
        </Button>
        <span className="text-sm font-semibold text-foreground text-center">
          {getMonthName(month)} {year}
        </span>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onNextMonth}
            disabled={isCurrentMonth || isFutureMonth}
            aria-label="Bulan berikutnya"
          >
            <ChevronRight size={18} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Menu lainnya">
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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

      {/* Summary card — 3 columns */}
      <div className="bg-card rounded-2xl shadow-sm p-4 flex items-center">
        {items.map((item, i) => (
          <Fragment key={item.label}>
            <div className="flex-1 flex flex-col items-center gap-0.5">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p
                className="text-base font-bold text-foreground"
                title={formatCurrency(item.value)}
              >
                {formatCurrencyShort(item.value)}
              </p>
            </div>
            {i < items.length - 1 && (
              <Separator orientation="vertical" className="h-8" />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

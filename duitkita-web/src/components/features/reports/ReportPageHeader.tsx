"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { getMonthName } from "@/lib/utils";

interface ReportPageHeaderProps {
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export function ReportPageHeader({
  year,
  month,
  onPrevMonth,
  onNextMonth,
}: ReportPageHeaderProps) {
  const now = new Date();
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;
  const isFutureMonth =
    year > now.getFullYear() ||
    (year === now.getFullYear() && month > now.getMonth() + 1);

  return (
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
      <button
        onClick={onNextMonth}
        disabled={isCurrentMonth || isFutureMonth}
        aria-label="Bulan berikutnya"
        className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors disabled:text-white/20 disabled:cursor-not-allowed"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

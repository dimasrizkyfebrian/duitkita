"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  );
}

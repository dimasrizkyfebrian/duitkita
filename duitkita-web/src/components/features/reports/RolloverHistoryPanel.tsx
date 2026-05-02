"use client";

import { Loader2 } from "lucide-react";
import { useRolloverHistory } from "@/hooks/useReports";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrencyShort, getMonthName } from "@/lib/utils";

interface RolloverHistoryPanelProps {
  categoryId: string;
}

export function RolloverHistoryPanel({
  categoryId,
}: RolloverHistoryPanelProps) {
  const { data, isLoading, isError, refetch } = useRolloverHistory(categoryId);

  if (isLoading) {
    return (
      <div className="px-3 pb-3 pt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 size={12} className="animate-spin" />
        Memuat riwayat…
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-2 w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-3 pb-3 pt-1 text-center">
        <p className="text-xs text-muted-foreground">
          Gagal memuat riwayat.{" "}
          <button
            onClick={() => refetch()}
            className="text-primary font-medium"
          >
            Coba lagi
          </button>
        </p>
      </div>
    );
  }

  const months = data?.months ?? [];

  if (months.length === 0) {
    return (
      <div className="px-3 pb-3 pt-1 text-center">
        <p className="text-xs text-muted-foreground">
          Belum ada riwayat rollover
        </p>
      </div>
    );
  }

  return (
    <div className="px-3 pb-3 pt-1 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Riwayat 6 Bulan
      </p>
      <ul className="divide-y divide-border bg-muted/30 rounded-xl overflow-hidden">
        {months.map((m) => {
          const isOver = m.leftover < 0;
          return (
            <li
              key={`${m.year}-${m.month}`}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-2.5 py-1.5 text-xs"
            >
              <span className="text-muted-foreground tabular-nums">
                {getMonthName(m.month).slice(0, 3)} {String(m.year).slice(-2)}
              </span>
              <span className="text-muted-foreground truncate">
                {formatCurrencyShort(m.totalSpent)} /{" "}
                {formatCurrencyShort(m.totalAmount)}
              </span>
              <span
                className={cn(
                  "font-medium tabular-nums",
                  isOver ? "text-danger" : "text-success",
                )}
              >
                {isOver ? "" : "+"}
                {formatCurrencyShort(m.leftover)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency, formatCurrencyShort, MONTH_NAMES } from "@/lib/utils";
import type { TrendItem } from "@/types";

interface TrendChartProps {
  trend: TrendItem[];
  isLoading: boolean;
}

const config: ChartConfig = {
  totalSpent: { label: "Pengeluaran", color: "var(--chart-1)" },
};

function shortMonth(month: number): string {
  return MONTH_NAMES[month - 1]?.slice(0, 3) ?? "";
}

export function TrendChart({ trend, isLoading }: TrendChartProps) {
  const data = useMemo(
    () =>
      trend.map((t) => ({
        label: shortMonth(t.month),
        totalSpent: t.totalSpent,
        totalBudget: t.totalBudget,
      })),
    [trend],
  );

  const hasData = data.some((d) => d.totalSpent > 0 || d.totalBudget > 0);

  return (
    <section className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-3">
      <h2 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
        Tren 6 Bulan Terakhir
      </h2>

      {isLoading || !hasData ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <div className="w-10 h-10 bg-white/[0.08] rounded-full flex items-center justify-center">
            <BarChart3 size={18} className="text-white/30" />
          </div>
          <p className="text-xs text-white/35">
            {isLoading ? "Memuat tren…" : "Belum ada data tren"}
          </p>
        </div>
      ) : (
        <ChartContainer config={config} className="h-44 w-full">
          <BarChart data={data} margin={{ left: 4, right: 4, top: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              fontSize={11}
              tick={{ fill: "rgba(255,255,255,0.4)" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatCurrencyShort(v)}
              fontSize={10}
              width={40}
              tick={{ fill: "rgba(255,255,255,0.35)" }}
            />
            <ChartTooltip
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {config[name as keyof typeof config]?.label ?? name}
                      </span>
                      <span className="font-mono font-medium tabular-nums">
                        {formatCurrency(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar
              dataKey="totalSpent"
              fill="var(--color-totalSpent)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      )}
    </section>
  );
}

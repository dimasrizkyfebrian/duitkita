"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency, formatCurrencyShort, MONTH_NAMES } from "@/lib/utils";
import type { TrendItem } from "@/types";

interface TrendBentoCardProps {
  trend: TrendItem[];
  isLoading: boolean;
}

const chartConfig: ChartConfig = {
  totalSpent: { label: "Pengeluaran", color: "var(--chart-1)" },
};

function shortMonth(month: number): string {
  return MONTH_NAMES[month - 1]?.slice(0, 3) ?? "";
}

export function TrendBentoCard({ trend, isLoading }: TrendBentoCardProps) {
  const data = useMemo(
    () => trend.map((t) => ({ label: shortMonth(t.month), totalSpent: t.totalSpent })),
    [trend],
  );
  const hasData = data.some((d) => d.totalSpent > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.15 }}
      className="glass-card glass-card-accent rounded-3xl p-5 flex flex-col"
    >
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={14} className="text-purple-400" />
        <h3 className="text-xs font-semibold desktop-text uppercase tracking-wider">
          Tren 6 Bulan Terakhir
        </h3>
      </div>

      {isLoading || !hasData ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
            <BarChart3 size={18} className="text-white/30" />
          </div>
          <p className="text-xs desktop-text-dim">
            {isLoading ? "Memuat tren…" : "Belum ada data tren"}
          </p>
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-44 w-full">
          <BarChart data={data} margin={{ left: 4, right: 4, top: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              fontSize={11}
              tick={{ fill: "rgba(255,255,255,0.45)" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatCurrencyShort(v)}
              fontSize={10}
              width={44}
              tick={{ fill: "rgba(255,255,255,0.35)" }}
            />
            <ChartTooltip
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                      </span>
                      <span className="font-mono font-medium tabular-nums">
                        {formatCurrency(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="totalSpent" fill="var(--color-totalSpent)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartContainer>
      )}
    </motion.div>
  );
}

"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { PieChart as PieIcon } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency, formatCurrencyShort, getCategoryColor } from "@/lib/utils";
import type { CategoryReportItem } from "@/types";

interface DistributionBentoCardProps {
  categories: CategoryReportItem[];
  totalSpent: number;
}

export function DistributionBentoCard({ categories, totalSpent }: DistributionBentoCardProps) {
  const data = useMemo(() => {
    const merged = new Map<string, { value: number; fill: string }>();
    for (const c of categories.filter((c) => c.totalSpent > 0)) {
      const existing = merged.get(c.categoryName);
      if (existing) {
        existing.value += c.totalSpent;
      } else {
        merged.set(c.categoryName, { value: c.totalSpent, fill: getCategoryColor(c.categoryId) });
      }
    }
    return Array.from(merged.entries()).map(([name, { value, fill }]) => ({ name, value, fill }));
  }, [categories]);

  const config = useMemo<ChartConfig>(() => {
    const out: ChartConfig = {};
    for (const item of data) out[item.name] = { label: item.name, color: item.fill };
    return out;
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
      className="glass-card glass-card-accent rounded-3xl p-5 flex flex-col"
    >
      <div className="flex items-center gap-2 mb-3">
        <PieIcon size={14} className="text-purple-400" />
        <h3 className="text-xs font-semibold desktop-text uppercase tracking-wider">
          Distribusi Kategori
        </h3>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center flex-1 justify-center">
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
            <PieIcon size={18} className="text-white/30" />
          </div>
          <p className="text-xs desktop-text-dim">Belum ada pengeluaran</p>
        </div>
      ) : (
        <>
          <div className="relative">
            <ChartContainer config={config} className="aspect-square h-44 w-full">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name) => (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="text-muted-foreground">{name}</span>
                          <span className="font-mono font-medium tabular-nums">
                            {formatCurrency(Number(value))}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={72}
                  paddingAngle={data.length > 1 ? 2 : 0}
                  strokeWidth={0}
                  startAngle={90}
                  endAngle={-270}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[10px] desktop-text-dim">Total</p>
              <p className="text-sm font-bold text-white">{formatCurrencyShort(totalSpent)}</p>
            </div>
          </div>

          <ul className="grid grid-cols-1 gap-y-1.5 mt-2">
            {data.slice(0, 5).map((item) => {
              const pct = totalSpent > 0 ? (item.value / totalSpent) * 100 : 0;
              return (
                <li key={item.name} className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                  <span className="text-xs desktop-text-muted truncate flex-1">{item.name}</span>
                  <span className="text-xs text-white/50 shrink-0 font-medium">
                    {formatCurrencyShort(item.value)}
                  </span>
                  <span className="text-[10px] desktop-text-dim shrink-0 w-8 text-right">
                    {pct.toFixed(0)}%
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </motion.div>
  );
}

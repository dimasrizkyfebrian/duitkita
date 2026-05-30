"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  formatCurrency,
  formatCurrencyShort,
  getCategoryColor,
} from "@/lib/utils";
import type { CategoryReportItem } from "@/types";

interface CategoryDistributionChartProps {
  categories: CategoryReportItem[];
  totalSpent: number;
}

export function CategoryDistributionChart({
  categories,
  totalSpent,
}: CategoryDistributionChartProps) {
  const data = useMemo(() => {
    const merged = new Map<string, { value: number; fill: string }>();
    for (const c of categories.filter((c) => c.totalSpent > 0)) {
      const existing = merged.get(c.categoryName);
      if (existing) {
        existing.value += c.totalSpent;
      } else {
        merged.set(c.categoryName, {
          value: c.totalSpent,
          fill: getCategoryColor(c.categoryId),
        });
      }
    }
    return Array.from(merged.entries()).map(([name, { value, fill }]) => ({
      name,
      value,
      fill,
    }));
  }, [categories]);

  const config = useMemo<ChartConfig>(() => {
    const out: ChartConfig = {};
    for (const item of data) {
      out[item.name] = { label: item.name, color: item.fill };
    }
    return out;
  }, [data]);

  return (
    <section className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-3">
      <h2 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
        Distribusi per Kategori
      </h2>

      {data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <div className="w-10 h-10 bg-white/[0.08] rounded-full flex items-center justify-center">
            <PieIcon size={18} className="text-white/30" />
          </div>
          <p className="text-xs text-white/35">
            Belum ada pengeluaran bulan ini
          </p>
        </div>
      ) : (
        <div className="relative">
          <ChartContainer config={config} className="aspect-square h-56 w-full">
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
                innerRadius={64}
                outerRadius={84}
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
            <p className="text-[10px] text-white/40">Total</p>
            <p className="text-base font-bold text-white">
              {formatCurrencyShort(totalSpent)}
            </p>
          </div>
        </div>
      )}

      {data.length > 0 && (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {data.map((item) => {
            const pct = totalSpent > 0 ? (item.value / totalSpent) * 100 : 0;
            return (
              <li key={item.name} className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="text-xs text-white/70 truncate">
                  {item.name}
                </span>
                <span className="text-xs text-white/40 ml-auto shrink-0">
                  {pct.toFixed(0)}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

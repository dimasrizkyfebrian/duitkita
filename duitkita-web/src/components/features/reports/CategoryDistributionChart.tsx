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
  const data = useMemo(
    () =>
      categories
        .filter((c) => c.totalSpent > 0)
        .map((c) => ({
          name: c.categoryName,
          value: c.totalSpent,
          fill: getCategoryColor(c.categoryId),
        })),
    [categories],
  );

  const config = useMemo<ChartConfig>(() => {
    const out: ChartConfig = {};
    for (const item of data) {
      out[item.name] = { label: item.name, color: item.fill };
    }
    return out;
  }, [data]);

  return (
    <section className="bg-card rounded-2xl p-4 space-y-3">
      <h2 className="text-sm font-semibold text-foreground">
        Distribusi per Kategori
      </h2>

      {data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
            <PieIcon size={18} className="text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
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
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-base font-bold text-foreground">
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
                <span className="text-xs text-foreground truncate">
                  {item.name}
                </span>
                <span className="text-xs text-muted-foreground ml-auto shrink-0">
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

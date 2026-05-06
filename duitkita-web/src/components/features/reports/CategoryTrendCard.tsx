"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChevronDown, TrendingDown, TrendingUp } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  cn,
  formatCurrency,
  formatCurrencyShort,
  getCategoryColor,
  MONTH_NAMES,
} from "@/lib/utils";
import type { CategoryTrend } from "@/types";

interface CategoryTrendCardProps {
  category: CategoryTrend;
  isExpanded: boolean;
  onToggle: () => void;
}

function shortMonth(month: number): string {
  return MONTH_NAMES[month - 1]?.slice(0, 3) ?? "";
}

export function CategoryTrendCard({
  category,
  isExpanded,
  onToggle,
}: CategoryTrendCardProps) {
  const color = getCategoryColor(category.categoryId);

  const data = useMemo(
    () =>
      category.trend.map((t) => ({
        label: shortMonth(t.month),
        totalSpent: t.totalSpent,
      })),
    [category.trend],
  );

  const totalSpent = data.reduce((s, d) => s + d.totalSpent, 0);

  // Delta vs previous month (last point vs second-to-last)
  let delta: { pct: number; up: boolean } | null = null;
  if (data.length >= 2) {
    const last = data[data.length - 1].totalSpent;
    const prev = data[data.length - 2].totalSpent;
    if (prev > 0) {
      const pct = ((last - prev) / prev) * 100;
      delta = { pct, up: pct >= 0 };
    }
  }

  const config: ChartConfig = {
    totalSpent: { label: "Pengeluaran", color },
  };

  return (
    <li className="bg-card rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-3 text-left hover:bg-muted/40 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <span className="text-base w-9 h-9 flex items-center justify-center bg-muted rounded-xl shrink-0">
            {category.categoryIcon ?? category.categoryName[0].toUpperCase()}
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {category.categoryName}
            </p>
            <p className="text-xs text-muted-foreground">
              Total 6 bln · {formatCurrencyShort(totalSpent)}
            </p>
          </div>

          {/* Sparkline */}
          <div className="shrink-0" aria-hidden="true">
            <LineChart
              width={80}
              height={36}
              data={data}
              margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
            >
              <Line
                type="monotone"
                dataKey="totalSpent"
                stroke={color}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {delta ? (
              <span
                className={cn(
                  "text-xs font-medium tabular-nums flex items-center gap-0.5",
                  delta.up ? "text-danger" : "text-success",
                )}
              >
                {delta.up ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                {Math.abs(delta.pct).toFixed(0)}%
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
            <ChevronDown
              size={14}
              className={cn(
                "text-muted-foreground transition-transform",
                isExpanded && "rotate-180",
              )}
            />
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="full-chart"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-4">
              <ChartContainer config={config} className="h-40 w-full">
                <LineChart
                  data={data}
                  margin={{ left: 4, right: 4, top: 8, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={6}
                    fontSize={11}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => formatCurrencyShort(v)}
                    fontSize={10}
                    width={40}
                  />
                  <ChartTooltip
                    cursor={{ stroke: color, strokeOpacity: 0.4 }}
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <div className="flex w-full items-center justify-between gap-4">
                            <span className="text-muted-foreground">
                              {name}
                            </span>
                            <span className="font-mono font-medium tabular-nums">
                              {formatCurrency(Number(value))}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="totalSpent"
                    stroke={color}
                    strokeWidth={2}
                    dot={{ r: 3, fill: color }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

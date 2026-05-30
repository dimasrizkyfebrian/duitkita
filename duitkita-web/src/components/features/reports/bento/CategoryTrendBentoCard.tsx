"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart as LineIcon, ChevronDown, TrendingDown, TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
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

interface CategoryTrendBentoCardProps {
  trends: CategoryTrend[] | undefined;
  isLoading: boolean;
}

const VISIBLE_LIMIT = 5;

function shortMonth(month: number): string {
  return MONTH_NAMES[month - 1]?.slice(0, 3) ?? "";
}

function TrendRow({
  category,
  isExpanded,
  onToggle,
}: {
  category: CategoryTrend & { _total: number };
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const color = getCategoryColor(category.categoryId);
  const data = useMemo(
    () => category.trend.map((t) => ({ label: shortMonth(t.month), totalSpent: t.totalSpent })),
    [category.trend],
  );

  let delta: { pct: number; up: boolean } | null = null;
  if (data.length >= 2) {
    const last = data[data.length - 1].totalSpent;
    const prev = data[data.length - 2].totalSpent;
    if (prev > 0) {
      const pct = ((last - prev) / prev) * 100;
      delta = { pct, up: pct >= 0 };
    }
  }

  const config: ChartConfig = { totalSpent: { label: "Pengeluaran", color } };

  return (
    <li className="bg-white/[0.03] rounded-2xl overflow-hidden border border-white/[0.06]">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-sm w-8 h-8 flex items-center justify-center rounded-xl shrink-0"
            style={{ backgroundColor: `${color}22`, color }}
          >
            {category.categoryIcon ?? category.categoryName[0].toUpperCase()}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/90 truncate">{category.categoryName}</p>
            <p className="text-[10px] desktop-text-dim">
              6 bln · {formatCurrencyShort(category._total)}
            </p>
          </div>
          <div className="shrink-0" aria-hidden="true">
            <LineChart width={72} height={28} data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
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
                  "text-[10px] font-medium tabular-nums flex items-center gap-0.5",
                  delta.up ? "text-red-400" : "text-emerald-400",
                )}
              >
                {delta.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {Math.abs(delta.pct).toFixed(0)}%
              </span>
            ) : (
              <span className="text-[10px] desktop-text-dim">—</span>
            )}
            <ChevronDown
              size={12}
              className={cn("text-white/30 transition-transform", isExpanded && "rotate-180")}
            />
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="chart"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden border-t border-white/[0.06]"
          >
            <div className="p-3">
              <ChartContainer config={config} className="h-36 w-full">
                <LineChart data={data} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={6}
                    fontSize={10}
                    tick={{ fill: "rgba(255,255,255,0.4)" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => formatCurrencyShort(v)}
                    fontSize={9}
                    width={38}
                    tick={{ fill: "rgba(255,255,255,0.3)" }}
                  />
                  <ChartTooltip
                    cursor={{ stroke: color, strokeOpacity: 0.4 }}
                    content={
                      <ChartTooltipContent
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

export function CategoryTrendBentoCard({ trends, isLoading }: CategoryTrendBentoCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(() => {
    return [...(trends ?? [])]
      .map((c) => ({ ...c, _total: c.trend.reduce((s, t) => s + t.totalSpent, 0) }))
      .sort((a, b) => b._total - a._total);
  }, [trends]);

  const visible = showAll ? sorted : sorted.slice(0, VISIBLE_LIMIT);
  const hasMore = sorted.length > VISIBLE_LIMIT;
  const hasAnyData = sorted.some((c) => c._total > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.25 }}
      className="glass-card glass-card-accent rounded-3xl p-5 flex flex-col"
    >
      <div className="flex items-center gap-2 mb-4">
        <LineIcon size={14} className="text-purple-400" />
        <h3 className="text-xs font-semibold desktop-text uppercase tracking-wider">
          Tren per Kategori — 6 Bulan
        </h3>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 4].map((i) => (
            <div key={i} className="h-12 bg-white/[0.04] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : !hasAnyData ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center flex-1 justify-center">
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
            <LineIcon size={18} className="text-white/30" />
          </div>
          <p className="text-xs desktop-text-dim">Belum cukup data tren</p>
        </div>
      ) : (
        <>
          <ul className="space-y-1.5">
            {visible.map((category) => (
              <TrendRow
                key={category.categoryId}
                category={category}
                isExpanded={expandedId === category.categoryId}
                onToggle={() => setExpandedId((c) => (c === category.categoryId ? null : category.categoryId))}
              />
            ))}
          </ul>
          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="w-full text-center text-xs font-medium text-primary py-2 mt-2 hover:text-primary/80 transition-colors"
            >
              {showAll ? "Sembunyikan" : `Lihat semua (${sorted.length} kategori)`}
            </button>
          )}
        </>
      )}
    </motion.div>
  );
}

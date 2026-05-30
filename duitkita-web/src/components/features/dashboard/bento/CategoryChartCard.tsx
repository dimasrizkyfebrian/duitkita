"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Cell, Pie, PieChart } from "recharts";
import { PieChart as PieIcon, ArrowRight } from "lucide-react";
import { formatCurrencyShort, getCategoryColor } from "@/lib/utils";
import type { CategoryReportItem } from "@/types";

interface CategoryChartCardProps {
  categories: CategoryReportItem[];
  totalSpent: number;
  isLoading: boolean;
}

export function BentoCategoryChartCard({ categories, totalSpent, isLoading }: CategoryChartCardProps) {
  const data = useMemo(() => {
    return categories
      .filter((c) => c.totalSpent > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5)
      .map((c) => ({
        name: c.categoryName,
        value: c.totalSpent,
        fill: getCategoryColor(c.categoryId),
        pct: totalSpent > 0 ? ((c.totalSpent / totalSpent) * 100).toFixed(0) : "0",
      }));
  }, [categories, totalSpent]);

  if (isLoading) {
    return (
      <div className="glass-card rounded-3xl p-5 col-span-2 flex gap-4">
        <div className="w-32 h-32 bg-white/10 rounded-full animate-pulse shrink-0" />
        <div className="flex-1 space-y-2 py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-white/10 rounded animate-pulse" style={{ width: `${80 - i * 10}%` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.15 }}
      className="glass-card glass-card-accent rounded-3xl p-5 col-span-2 flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PieIcon size={14} className="text-purple-400" />
          <h3 className="text-xs font-semibold desktop-text uppercase tracking-wider">
            Kategori Pengeluaran
          </h3>
        </div>
        <Link href="/reports" className="text-white/35 hover:text-white/70 transition-colors">
          <ArrowRight size={14} />
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center flex-1 py-6">
          <p className="desktop-text-dim text-sm">Belum ada pengeluaran bulan ini</p>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          {/* Donut chart */}
          <div className="w-28 h-28 shrink-0">
            <PieChart width={112} height={112}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={34}
                outerRadius={52}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} stroke="none" />
                ))}
              </Pie>
            </PieChart>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2 min-w-0">
            {data.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="desktop-text-muted text-xs truncate flex-1">{item.name}</span>
                <span className="text-white/60 text-xs font-medium shrink-0">
                  {formatCurrencyShort(item.value)}
                </span>
                <span className="desktop-text-dim text-[10px] shrink-0 w-8 text-right">
                  {item.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

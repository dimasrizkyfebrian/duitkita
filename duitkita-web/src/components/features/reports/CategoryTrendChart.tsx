"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LineChart as LineIcon } from "lucide-react";
import { CategoryTrendCard } from "./CategoryTrendCard";
import { ReportCategoryTrendSkeleton } from "./ReportSkeleton";
import type { CategoryTrend } from "@/types";

interface CategoryTrendChartProps {
  trends: CategoryTrend[] | undefined;
  isLoading: boolean;
}

const VISIBLE_LIMIT = 6;

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

export function CategoryTrendChart({
  trends,
  isLoading,
}: CategoryTrendChartProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(() => {
    const data = trends ?? [];
    return [...data]
      .map((c) => ({
        ...c,
        _total: c.trend.reduce((s, t) => s + t.totalSpent, 0),
      }))
      .sort((a, b) => b._total - a._total);
  }, [trends]);

  const hasAnyData = sorted.some((c) => c._total > 0);
  const visible = showAll ? sorted : sorted.slice(0, VISIBLE_LIMIT);
  const hasMore = sorted.length > VISIBLE_LIMIT;

  function toggleExpanded(id: string) {
    setExpandedId((curr) => (curr === id ? null : id));
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground px-1">
        Tren per Kategori — 6 Bulan
      </h2>

      {isLoading ? (
        <ReportCategoryTrendSkeleton />
      ) : !hasAnyData ? (
        <div className="bg-card rounded-2xl flex flex-col items-center gap-2 py-8 text-center">
          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
            <LineIcon size={18} className="text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            Belum cukup data untuk menampilkan tren
          </p>
        </div>
      ) : (
        <>
          <motion.ul
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            {visible.map((category) => (
              <CategoryTrendCard
                key={category.categoryId}
                category={category}
                isExpanded={expandedId === category.categoryId}
                onToggle={() => toggleExpanded(category.categoryId)}
              />
            ))}
          </motion.ul>

          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="w-full text-center text-xs font-medium text-primary py-2"
            >
              {showAll
                ? "Sembunyikan"
                : `Lihat semua (${sorted.length} kategori)`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

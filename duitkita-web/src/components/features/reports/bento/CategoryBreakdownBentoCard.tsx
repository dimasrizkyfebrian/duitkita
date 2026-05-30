"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Layers, ChevronDown, Inbox } from "lucide-react";
import {
  cn,
  formatCurrencyShort,
  getAlertBg,
  getAlertLabel,
  getProgressColor,
  getCategoryColor,
} from "@/lib/utils";
import { RolloverHistoryPanel } from "@/components/features/reports/RolloverHistoryPanel";
import type { CategoryReportItem } from "@/types";

interface CategoryBreakdownBentoCardProps {
  categories: CategoryReportItem[];
  expandedCategoryId: string | null;
  onToggle: (id: string) => void;
}

function CategoryRow({
  category,
  index,
  isExpanded,
  onToggle,
}: {
  category: CategoryReportItem;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const color = getCategoryColor(category.categoryId);
  const pct = category.percentageUsed;

  return (
    <li className="bg-white/[0.03] rounded-2xl overflow-hidden border border-white/[0.05]">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-3 space-y-2 text-left hover:bg-white/[0.04] transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-sm w-8 h-8 flex items-center justify-center rounded-xl shrink-0"
              style={{ backgroundColor: `${color}22`, color }}
            >
              {category.categoryIcon ?? category.categoryName[0].toUpperCase()}
            </span>
            <span className="text-xs font-medium text-white/90 truncate">
              {category.categoryName}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", getAlertBg(category.alertStatus))}>
              {getAlertLabel(category.alertStatus)}
            </span>
            <ChevronDown
              size={13}
              className={cn("text-white/30 transition-transform", isExpanded && "rotate-180")}
            />
          </div>
        </div>

        <div className="relative h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
          <motion.div
            className={cn("absolute inset-y-0 left-0 rounded-full", getProgressColor(category.alertStatus))}
            initial={{ width: "0%" }}
            animate={{ width: `${Math.min(pct, 100)}%` }}
            transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.04 }}
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[10px] desktop-text-dim">
            {formatCurrencyShort(category.totalSpent)} / {formatCurrencyShort(category.totalAmount)}
          </p>
          <p className="text-[10px] font-medium desktop-text-muted">{pct.toFixed(0)}%</p>
        </div>

        {category.rolloverAmount > 0 && (
          <p className="text-[10px] desktop-text-dim">
            + {formatCurrencyShort(category.rolloverAmount)} saldo bulan lalu
          </p>
        )}
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="rollover"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden border-t border-white/[0.06]"
          >
            <RolloverHistoryPanel categoryId={category.categoryId} />
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export function CategoryBreakdownBentoCard({
  categories,
  expandedCategoryId,
  onToggle,
}: CategoryBreakdownBentoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
      className="glass-card glass-card-accent rounded-3xl p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Layers size={14} className="text-purple-400" />
        <h3 className="text-xs font-semibold desktop-text uppercase tracking-wider">
          Detail per Kategori
        </h3>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
            <Inbox size={18} className="text-white/30" />
          </div>
          <p className="text-xs desktop-text-dim">Belum ada anggaran bulan ini</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {categories.map((category, i) => (
            <CategoryRow
              key={category.categoryId}
              category={category}
              index={i}
              isExpanded={expandedCategoryId === category.categoryId}
              onToggle={() => onToggle(category.categoryId)}
            />
          ))}
        </ul>
      )}
    </motion.div>
  );
}

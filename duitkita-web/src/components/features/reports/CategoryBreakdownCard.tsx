"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import {
  cn,
  formatCurrencyShort,
  getAlertBg,
  getAlertLabel,
  getProgressColor,
} from "@/lib/utils";
import type { CategoryReportItem } from "@/types";
import { RolloverHistoryPanel } from "./RolloverHistoryPanel";

interface CategoryBreakdownCardProps {
  category: CategoryReportItem;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export function CategoryBreakdownCard({
  category,
  index,
  isExpanded,
  onToggle,
}: CategoryBreakdownCardProps) {
  const pct = category.percentageUsed;

  return (
    <motion.li variants={itemVariants}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-3 space-y-2 text-left hover:bg-muted/40 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg w-9 h-9 flex items-center justify-center bg-muted rounded-xl shrink-0">
              {category.categoryIcon ??
                category.categoryName[0].toUpperCase()}
            </span>
            <span className="text-sm font-medium text-foreground truncate">
              {category.categoryName}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                getAlertBg(category.alertStatus),
              )}
            >
              {getAlertLabel(category.alertStatus)}
            </span>
            <ChevronDown
              size={16}
              className={cn(
                "text-muted-foreground transition-transform",
                isExpanded && "rotate-180",
              )}
            />
          </div>
        </div>

        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              getProgressColor(category.alertStatus),
            )}
            initial={{ width: "0%" }}
            animate={{ width: `${Math.min(pct, 100)}%` }}
            transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.05 }}
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {formatCurrencyShort(category.totalSpent)} /{" "}
            {formatCurrencyShort(category.totalAmount)}
          </p>
          <p className="text-xs font-medium text-muted-foreground">
            {pct.toFixed(0)}%
          </p>
        </div>

        {category.rolloverAmount > 0 && (
          <p className="text-xs text-muted-foreground">
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
            className="overflow-hidden"
          >
            <RolloverHistoryPanel categoryId={category.categoryId} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

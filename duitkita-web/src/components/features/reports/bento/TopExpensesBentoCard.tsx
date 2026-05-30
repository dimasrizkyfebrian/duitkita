"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Receipt, Trophy } from "lucide-react";
import { formatCurrency, formatDate, getCategoryColor } from "@/lib/utils";
import type { CategoryReportItem, TopExpense } from "@/types";

interface TopExpensesBentoCardProps {
  categories: CategoryReportItem[];
}

interface FlatExpense extends TopExpense {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
}

export function TopExpensesBentoCard({ categories }: TopExpensesBentoCardProps) {
  const top = useMemo<FlatExpense[]>(() => {
    const flat: FlatExpense[] = categories.flatMap((c) =>
      c.topExpenses.map((e) => ({
        ...e,
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        categoryIcon: c.categoryIcon,
      })),
    );
    flat.sort((a, b) => b.amount - a.amount);
    return flat.slice(0, 5);
  }, [categories]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
      className="glass-card glass-card-accent rounded-3xl p-5 flex flex-col h-full"
    >
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={14} className="text-purple-400" />
        <h3 className="text-xs font-semibold desktop-text uppercase tracking-wider">
          Top 5 Pengeluaran
        </h3>
      </div>

      {top.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center flex-1 justify-center">
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
            <Receipt size={18} className="text-white/30" />
          </div>
          <p className="text-xs desktop-text-dim">Belum ada pengeluaran</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 flex-1">
          {top.map((expense, i) => {
            const color = getCategoryColor(expense.categoryId);
            return (
              <motion.li
                key={expense.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.2 + i * 0.05 }}
                className="flex items-center gap-3 bg-white/[0.03] rounded-2xl px-3 py-2.5 hover:bg-white/[0.06] transition-colors"
              >
                <span
                  className="text-base w-9 h-9 flex items-center justify-center rounded-xl shrink-0 text-sm"
                  style={{ backgroundColor: `${color}22`, color }}
                >
                  {expense.categoryIcon ?? expense.categoryName[0].toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white/90 truncate leading-tight">
                    {expense.note ?? expense.categoryName}
                  </p>
                  <p className="text-[10px] desktop-text-dim mt-0.5">
                    {expense.categoryName} · {formatDate(expense.expenseDate)}
                  </p>
                </div>
                <p className="text-sm font-bold text-white/80 tabular-nums shrink-0 text-right">
                  {formatCurrency(expense.amount)}
                </p>
              </motion.li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}

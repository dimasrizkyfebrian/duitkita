"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Receipt } from "lucide-react";
import { formatCurrency, formatDate, getCategoryColor } from "@/lib/utils";
import type { CategoryReportItem, TopExpense } from "@/types";

interface TopExpensesListProps {
  categories: CategoryReportItem[];
}

interface FlatExpense extends TopExpense {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
}

export function TopExpensesList({ categories }: TopExpensesListProps) {
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
    <section className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-3">
      <h2 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
        Top 5 Pengeluaran
      </h2>

      {top.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <div className="w-10 h-10 bg-white/[0.08] rounded-full flex items-center justify-center">
            <Receipt size={18} className="text-white/30" />
          </div>
          <p className="text-xs text-white/35">Belum ada pengeluaran</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {top.map((expense, i) => {
            const color = getCategoryColor(expense.categoryId);
            return (
              <motion.li
                key={expense.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.06] rounded-2xl px-3 py-2.5"
              >
                <span
                  className="text-sm w-9 h-9 flex items-center justify-center rounded-xl shrink-0"
                  style={{ backgroundColor: `${color}22`, color }}
                >
                  {expense.categoryIcon ?? expense.categoryName[0].toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white/90 truncate">
                    {expense.note ?? expense.categoryName}
                  </p>
                  <p className="text-xs text-white/40">
                    {expense.categoryName} · {formatDate(expense.expenseDate)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-white/80 tabular-nums shrink-0">
                  {formatCurrency(expense.amount)}
                </p>
              </motion.li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

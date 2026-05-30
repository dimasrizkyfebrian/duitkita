"use client";

import { motion } from "framer-motion";
import { ExpenseListItem } from "./ExpenseListItem";
import { formatDate } from "@/lib/utils";
import type { Expense } from "@/types";

interface ExpenseListProps {
  expenses: Expense[];
  showActions: boolean;
  groupByDay?: boolean;
  containerClassName?: string;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
}

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.floor(
    (startOfDay(now) - startOfDay(d)) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Hari ini";
  if (diffDays === 1) return "Kemarin";
  return formatDate(iso);
}

export function ExpenseList({
  expenses,
  showActions,
  groupByDay = true,
  containerClassName,
  onEdit,
  onDelete,
}: ExpenseListProps) {
  if (!groupByDay) {
    return (
      <motion.ul
        variants={listVariants}
        initial="hidden"
        animate="visible"
        className={containerClassName ?? "rounded-2xl divide-y divide-white/[0.07] overflow-hidden"}
        style={containerClassName ? undefined : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {expenses.map((expense) => (
          <ExpenseListItem
            key={expense.id}
            expense={expense}
            showActions={showActions}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </motion.ul>
    );
  }

  // Group by expense date
  const groups = new Map<string, { label: string; items: Expense[] }>();
  for (const e of expenses) {
    const k = dayKey(e.expenseDate);
    const existing = groups.get(k);
    if (existing) {
      existing.items.push(e);
    } else {
      groups.set(k, { label: dayLabel(e.expenseDate), items: [e] });
    }
  }

  return (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      {Array.from(groups.entries()).map(([key, group]) => (
        <section
          key={key}
          className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wide">
              {group.label}
            </p>
          </div>
          <ul className="divide-y divide-white/[0.07]">
            {group.items.map((expense) => (
              <ExpenseListItem
                key={expense.id}
                expense={expense}
                showActions={showActions}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </section>
      ))}
    </motion.div>
  );
}

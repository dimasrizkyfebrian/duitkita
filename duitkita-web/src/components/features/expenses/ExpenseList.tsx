"use client";

import { motion } from "framer-motion";
import { ExpenseListItem } from "./ExpenseListItem";
import { formatDate } from "@/lib/utils";
import type { Expense } from "@/types";

interface ExpenseListProps {
  expenses: Expense[];
  showActions: boolean;
  groupByDay?: boolean;
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
  onEdit,
  onDelete,
}: ExpenseListProps) {
  if (!groupByDay) {
    return (
      <motion.ul
        variants={listVariants}
        initial="hidden"
        animate="visible"
        className="bg-card rounded-2xl divide-y divide-border overflow-hidden"
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
          className="bg-card rounded-2xl overflow-hidden"
        >
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {group.label}
            </p>
          </div>
          <ul className="divide-y divide-border">
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

"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { formatCurrencyShort, formatCurrency } from "@/lib/utils";
import { SummaryCardSkeleton } from "./DashboardSkeleton";

interface SummaryCardProps {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  isLoading: boolean;
}

const stats = (budget: number, spent: number, remaining: number) => [
  { label: "Anggaran", value: budget },
  { label: "Terpakai", value: spent },
  { label: "Sisa", value: remaining },
];

export function SummaryCard({
  totalBudget,
  totalSpent,
  totalRemaining,
  isLoading,
}: SummaryCardProps) {
  if (isLoading) return <SummaryCardSkeleton />;

  const items = stats(totalBudget, totalSpent, totalRemaining);

  return (
    <motion.div
      key="summary-card"
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
      className="bg-card rounded-2xl shadow-lg p-4"
    >
      <div className="flex items-center">
        {items.map((item, i) => (
          <Fragment key={item.label}>
            <div className="flex-1 flex flex-col items-center gap-0.5">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p
                className="text-base font-bold text-foreground"
                title={formatCurrency(item.value)}
              >
                {formatCurrencyShort(item.value)}
              </p>
            </div>
            {i < items.length - 1 && (
              <Separator orientation="vertical" className="h-8" />
            )}
          </Fragment>
        ))}
      </div>
    </motion.div>
  );
}

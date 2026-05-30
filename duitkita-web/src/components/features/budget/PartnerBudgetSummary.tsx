"use client";

import { Fragment } from "react";
import {
  formatCurrency,
  formatCurrencyShort,
  getMonthName,
} from "@/lib/utils";

interface PartnerBudgetSummaryProps {
  year: number;
  month: number;
  totalBudget: number;
  totalSpent: number;
}

export function PartnerBudgetSummary({
  year,
  month,
  totalBudget,
  totalSpent,
}: PartnerBudgetSummaryProps) {
  const totalRemaining = totalBudget - totalSpent;
  const items = [
    { label: "Anggaran", value: totalBudget },
    { label: "Terpakai", value: totalSpent },
    { label: "Sisa", value: totalRemaining },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-white/45 text-center">
        Anggaran pasangan · {getMonthName(month)} {year}
      </p>
      <div className="glass-card rounded-2xl p-4 flex items-center">
        {items.map((item, i) => (
          <Fragment key={item.label}>
            <div className="flex-1 flex flex-col items-center gap-0.5">
              <p className="text-xs text-white/45">{item.label}</p>
              <p
                className="text-base font-bold text-white"
                title={formatCurrency(item.value)}
              >
                {formatCurrencyShort(item.value)}
              </p>
            </div>
            {i < items.length - 1 && (
              <div className="w-px h-8 bg-white/[0.12] shrink-0" />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

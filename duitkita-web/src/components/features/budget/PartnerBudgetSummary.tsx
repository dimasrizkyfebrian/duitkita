"use client";

import { Fragment } from "react";
import {
  formatCurrency,
  formatCurrencyShort,
  getMonthName,
} from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

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
      <p className="text-xs font-medium text-muted-foreground text-center">
        Anggaran pasangan · {getMonthName(month)} {year}
      </p>
      <div className="bg-card rounded-2xl shadow-sm p-4 flex items-center">
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
    </div>
  );
}

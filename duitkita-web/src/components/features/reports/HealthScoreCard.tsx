"use client";

import { Activity } from "lucide-react";
import type { FinancialHealthScore } from "@/types";

interface HealthScoreCardProps {
  healthScore: FinancialHealthScore | null | undefined;
  isLoading: boolean;
}

export function HealthScoreCard({ healthScore, isLoading }: HealthScoreCardProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl p-4 space-y-2">
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        <div className="h-6 w-20 bg-muted rounded animate-pulse" />
        <div className="h-3 w-48 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!healthScore) return null;

  return (
    <section className="bg-card rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Activity size={14} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Health Score</h3>
      </div>

      <div className="flex items-end gap-2">
        <p className="text-3xl font-bold text-foreground">{healthScore.score}</p>
        <p className="text-sm text-muted-foreground pb-1">/ 100</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Metric label="Saving" value={healthScore.savingRate} />
        <Metric label="Adherence" value={healthScore.budgetAdherence} />
        <Metric label="Volatility" value={healthScore.expenseVolatility} />
      </div>

      {healthScore.insights.length > 0 && (
        <ul className="space-y-1">
          {healthScore.insights.slice(0, 2).map((insight) => (
            <li key={insight} className="text-xs text-muted-foreground">
              • {insight}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/40 rounded-xl px-2 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}%</p>
    </div>
  );
}

"use client";

import { TrendingUp } from "lucide-react";
import { formatCurrencyShort } from "@/lib/utils";
import type { SpendingForecast } from "@/types";

interface ForecastCardProps {
  forecast: SpendingForecast | null | undefined;
  isLoading: boolean;
  noPartner: boolean;
}

export function ForecastCard({ forecast, isLoading, noPartner }: ForecastCardProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl p-4 space-y-2">
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        <div className="h-6 w-20 bg-muted rounded animate-pulse" />
        <div className="h-3 w-40 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (noPartner) {
    return (
      <div className="bg-card rounded-2xl p-4">
        <p className="text-sm text-muted-foreground">
          Forecast partner/both belum tersedia karena akun belum terhubung.
        </p>
      </div>
    );
  }

  if (!forecast) return null;

  return (
    <section className="bg-card rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp size={14} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Forecast Bulan Ini</h3>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-muted/40 rounded-xl px-2 py-2">
          <p className="text-[11px] text-muted-foreground">Projected</p>
          <p className="text-sm font-semibold text-foreground">
            {formatCurrencyShort(forecast.projectedSpent)}
          </p>
        </div>
        <div className="bg-muted/40 rounded-xl px-2 py-2">
          <p className="text-[11px] text-muted-foreground">Remaining</p>
          <p className="text-sm font-semibold text-foreground">
            {formatCurrencyShort(forecast.projectedRemaining)}
          </p>
        </div>
        <div className="bg-muted/40 rounded-xl px-2 py-2">
          <p className="text-[11px] text-muted-foreground">Burn/day</p>
          <p className="text-sm font-semibold text-foreground">
            {formatCurrencyShort(forecast.burnRatePerDay)}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Confidence: <span className="font-medium">{forecast.confidenceLevel}</span>
      </p>
      {forecast.keyDrivers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Driver utama: {forecast.keyDrivers.slice(0, 2).map((d) => d.categoryName).join(", ")}
        </p>
      )}
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { formatCurrencyShort } from "@/lib/utils";
import type { SpendingForecast } from "@/types";

interface ForecastBentoCardProps {
  forecast: SpendingForecast | null | undefined;
  isLoading: boolean;
  noPartner: boolean;
}

function getConfidenceColor(level: string) {
  if (level === "high") return "#10b981";
  if (level === "medium") return "#f59e0b";
  return "#ef4444";
}

export function ForecastBentoCard({ forecast, isLoading, noPartner }: ForecastBentoCardProps) {
  if (isLoading) {
    return (
      <div className="glass-card rounded-3xl p-5 flex flex-col gap-3 h-full">
        <div className="h-4 w-28 bg-white/10 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-14 bg-white/10 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (noPartner) {
    return (
      <div className="glass-card rounded-3xl p-5 flex items-center justify-center h-full">
        <p className="desktop-text-dim text-xs text-center">
          Hubungkan akun pasangan untuk melihat forecast
        </p>
      </div>
    );
  }

  const metrics = forecast
    ? [
        { label: "Projected", value: formatCurrencyShort(forecast.projectedSpent) },
        { label: "Remaining", value: formatCurrencyShort(forecast.projectedRemaining) },
        { label: "Burn/day", value: formatCurrencyShort(forecast.burnRatePerDay) },
      ]
    : [];

  const confidenceColor = forecast ? getConfidenceColor(forecast.confidenceLevel) : "#64748b";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
      className="glass-card glass-card-accent rounded-3xl p-5 flex flex-col gap-3 h-full"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-purple-400" />
          <h3 className="text-xs font-semibold desktop-text uppercase tracking-wider">Forecast</h3>
        </div>
        {forecast && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ color: confidenceColor, backgroundColor: `${confidenceColor}20` }}
          >
            {forecast.confidenceLevel}
          </span>
        )}
      </div>

      {forecast ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            {metrics.map((m) => (
              <div key={m.label} className="bg-white/[0.04] rounded-2xl px-2 py-3 text-center">
                <p className="text-[10px] desktop-text-dim">{m.label}</p>
                <p className="text-sm font-bold text-white mt-1">{m.value}</p>
              </div>
            ))}
          </div>

          {forecast.keyDrivers.length > 0 && (
            <div className="mt-auto">
              <p className="text-[10px] desktop-text-dim mb-1.5">Driver utama</p>
              <div className="flex flex-wrap gap-1">
                {forecast.keyDrivers.slice(0, 3).map((d) => (
                  <span
                    key={d.categoryName}
                    className="text-[10px] bg-white/[0.06] text-white/60 px-2 py-0.5 rounded-full"
                  >
                    {d.categoryName}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center flex-1">
          <p className="desktop-text-dim text-xs">Tidak ada data forecast</p>
        </div>
      )}
    </motion.div>
  );
}

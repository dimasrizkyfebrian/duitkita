"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { formatCurrencyShort } from "@/lib/utils";
import type { SpendingForecast } from "@/types";

interface ForecastCardProps {
  forecast: SpendingForecast | null | undefined;
  isLoading: boolean;
  noPartner: boolean;
}

function getConfidenceColor(level: string) {
  if (level === "high") return { text: "text-emerald-400", bg: "bg-emerald-400/10" };
  if (level === "medium") return { text: "text-amber-400", bg: "bg-amber-400/10" };
  return { text: "text-red-400", bg: "bg-red-400/10" };
}

export function ForecastCard({ forecast, isLoading, noPartner }: ForecastCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-3">
        <div className="h-3 w-28 bg-white/10 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-12 bg-white/10 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (noPartner) {
    return (
      <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4">
        <p className="text-sm text-white/40">
          Forecast belum tersedia — hubungkan akun pasangan terlebih dahulu.
        </p>
      </div>
    );
  }

  if (!forecast) return null;

  const conf = getConfidenceColor(forecast.confidenceLevel);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.08 }}
      className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={13} className="text-purple-400" />
          <h3 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
            Forecast Bulan Ini
          </h3>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${conf.text} ${conf.bg}`}>
          {forecast.confidenceLevel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Projected", value: forecast.projectedSpent },
          { label: "Remaining", value: forecast.projectedRemaining },
          { label: "Burn/day", value: forecast.burnRatePerDay },
        ].map((m) => (
          <div key={m.label} className="bg-white/[0.06] rounded-xl px-2 py-2.5 text-center">
            <p className="text-[10px] text-white/40">{m.label}</p>
            <p className="text-sm font-bold text-white/90 mt-0.5">
              {formatCurrencyShort(m.value)}
            </p>
          </div>
        ))}
      </div>

      {forecast.keyDrivers.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-white/35 uppercase tracking-wider">Driver utama</p>
          <div className="flex flex-wrap gap-1.5">
            {forecast.keyDrivers.slice(0, 3).map((d) => (
              <span
                key={d.categoryName}
                className="text-[10px] bg-white/[0.07] text-white/60 px-2.5 py-1 rounded-full"
              >
                {d.categoryName}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.section>
  );
}

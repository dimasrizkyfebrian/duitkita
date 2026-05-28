"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { TrendingUp, ArrowRight, Flame } from "lucide-react";
import { formatCurrency, formatCurrencyShort } from "@/lib/utils";
import type { SpendingForecast } from "@/types";

interface ForecastCardProps {
  forecast: SpendingForecast | null | undefined;
  isLoading: boolean;
}

const CONFIDENCE_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: "Akurasi Tinggi", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
  medium: { label: "Akurasi Sedang", color: "#eab308", bg: "rgba(234,179,8,0.15)" },
  low: { label: "Akurasi Rendah", color: "#f97316", bg: "rgba(249,115,22,0.15)" },
};

export function BentoForecastCard({ forecast, isLoading }: ForecastCardProps) {
  if (isLoading) {
    return (
      <div className="glass-card rounded-3xl p-5 flex flex-col gap-3">
        <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
        <div className="h-8 w-40 bg-white/10 rounded animate-pulse" />
        <div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
      </div>
    );
  }

  const confidence = forecast?.confidenceLevel ?? "low";
  const style = CONFIDENCE_STYLES[confidence];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
      className="glass-card glass-card-accent rounded-3xl p-5 flex flex-col"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-pink-400" />
          <h3 className="text-xs font-semibold desktop-text uppercase tracking-wider">
            Proyeksi
          </h3>
        </div>
        <Link href="/reports" className="text-white/35 hover:text-white/70 transition-colors">
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <p className="desktop-text-dim text-xs mb-1">Perkiraan akhir bulan</p>
        <p className="text-2xl font-bold text-white mb-0.5">
          {forecast ? formatCurrencyShort(forecast.projectedSpent) : "–"}
        </p>
        <p className="desktop-text-muted text-xs">
          Sisa: {forecast ? formatCurrency(forecast.projectedRemaining) : "–"}
        </p>
      </div>

      {/* Burn rate */}
      <div className="mt-3 bg-white/[0.04] rounded-2xl px-3 py-2.5 flex items-center gap-2">
        <Flame size={13} className="text-orange-400 shrink-0" />
        <div>
          <p className="desktop-text-dim text-[10px]">Burn rate / hari</p>
          <p className="text-white/80 text-xs font-semibold">
            {forecast ? formatCurrencyShort(forecast.burnRatePerDay) : "–"}
          </p>
        </div>
        <span
          className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ color: style.color, background: style.bg }}
        >
          {style.label}
        </span>
      </div>

      {/* Top drivers */}
      {forecast && forecast.keyDrivers.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {forecast.keyDrivers.slice(0, 2).map((driver) => (
            <div key={driver.categoryId} className="flex items-center justify-between">
              <p className="text-white/55 text-xs truncate mr-2">{driver.categoryName}</p>
              <span className="text-white/40 text-[10px] shrink-0">
                {driver.shareOfSpend.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

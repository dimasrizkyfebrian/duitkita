"use client";

import { motion } from "framer-motion";
import { formatCurrencyShort, formatCurrency, cn } from "@/lib/utils";
import { CountUp } from "@/components/ui/count-up";
import { BorderGlow } from "@/components/ui/border-glow";
import { SummaryCardSkeleton } from "./DashboardSkeleton";

interface SummaryCardProps {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  isLoading: boolean;
}

export function SummaryCard({
  totalBudget,
  totalSpent,
  totalRemaining,
  isLoading,
}: SummaryCardProps) {
  if (isLoading) return <SummaryCardSkeleton />;

  const spentPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const isOver = totalRemaining < 0;

  const progressColor =
    spentPct >= 100 ? "bg-red-400" :
    spentPct >= 80  ? "bg-amber-400" :
    "bg-purple-400";

  const glowColor =
    spentPct >= 100 ? "0 72 60" :
    spentPct >= 80  ? "38 80 58" :
    "270 55 72";

  const glowColors: [string, string, string] =
    spentPct >= 100 ? ["#f87171", "#dc2626", "#fca5a5"] :
    spentPct >= 80  ? ["#fbbf24", "#d97706", "#fde68a"] :
    ["#c084fc", "#f472b6", "#8b5cf6"];

  return (
    <motion.div
      key="summary-card"
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
    >
      <BorderGlow
        glowColor={glowColor}
        colors={glowColors}
        backgroundColor="rgba(20, 8, 50, 0.80)"
        borderRadius={16}
        glowRadius={32}
        edgeSensitivity={25}
        coneSpread={22}
        fillOpacity={0.4}
        animated
        style={{ borderRadius: 16 }}
      >
        <div className="p-4 space-y-3">
          {/* Hero: total budget + progress */}
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium">
              Anggaran Bulan Ini
            </p>
            <p
              className="text-2xl font-bold text-white mt-1 leading-none"
              title={formatCurrency(totalBudget)}
            >
              <CountUp value={totalBudget} formatter={formatCurrencyShort} duration={1.0} />
            </p>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full", progressColor)}
                initial={{ width: "0%" }}
                animate={{ width: `${Math.min(spentPct, 100)}%` }}
                transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] as [number,number,number,number], delay: 0.3 }}
              />
            </div>
            <p className="text-[11px] text-white/35 mt-1">{spentPct.toFixed(0)}% digunakan</p>
          </div>

          {/* Bento: 2-col sub-stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.05] rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Terpakai</p>
              <p className="text-base font-semibold text-white mt-0.5" title={formatCurrency(totalSpent)}>
                <CountUp value={totalSpent} formatter={formatCurrencyShort} duration={0.9} />
              </p>
            </div>
            <div className="bg-white/[0.05] rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Sisa</p>
              <p
                className={cn("text-base font-semibold mt-0.5", isOver ? "text-red-300" : "text-white")}
                title={formatCurrency(totalRemaining)}
              >
                <CountUp value={totalRemaining} formatter={formatCurrencyShort} duration={0.9} />
              </p>
            </div>
          </div>
        </div>
      </BorderGlow>
    </motion.div>
  );
}

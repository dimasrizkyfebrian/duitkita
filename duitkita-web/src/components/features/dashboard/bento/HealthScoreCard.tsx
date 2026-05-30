"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import type { FinancialHealthScore } from "@/types";

interface HealthScoreCardProps {
  healthScore: FinancialHealthScore | null | undefined;
  isLoading: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Sangat Sehat";
  if (score >= 60) return "Cukup Baik";
  if (score >= 40) return "Perlu Perhatian";
  return "Kritis";
}

// Draw SVG arc for the score ring
function ScoreArc({ score }: { score: number }) {
  const radius = 44;
  const cx = 60;
  const cy = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <svg width="120" height="120" className="rotate-[-90deg]">
      {/* Track */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="8"
      />
      {/* Progress */}
      <motion.circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
      />
    </svg>
  );
}

export function BentoHealthScoreCard({ healthScore, isLoading }: HealthScoreCardProps) {
  if (isLoading) {
    return (
      <div className="glass-card rounded-3xl p-5 flex flex-col gap-3">
        <div className="h-4 w-28 bg-white/10 rounded animate-pulse" />
        <div className="h-24 w-24 bg-white/10 rounded-full animate-pulse mx-auto" />
        <div className="h-3 w-20 bg-white/10 rounded animate-pulse mx-auto" />
      </div>
    );
  }

  const score = healthScore?.score ?? 0;
  const color = getScoreColor(score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.05 }}
      className="glass-card glass-card-accent rounded-3xl p-5 flex flex-col"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-purple-400" />
          <h3 className="text-xs font-semibold desktop-text uppercase tracking-wider">
            Health Score
          </h3>
        </div>
        <Link href="/reports" className="text-white/35 hover:text-white/70 transition-colors">
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Score arc */}
      <div className="relative flex items-center justify-center my-2">
        <ScoreArc score={score} />
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-bold text-white">{score}</span>
          <span className="text-[10px] desktop-text-dim -mt-0.5">/ 100</span>
        </div>
      </div>

      <p className="text-center text-xs font-medium mb-3" style={{ color }}>
        {getScoreLabel(score)}
      </p>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-1.5 mt-auto">
        {[
          { label: "Saving", value: healthScore?.savingRate ?? 0 },
          { label: "Adherence", value: healthScore?.budgetAdherence ?? 0 },
          { label: "Volatility", value: healthScore?.expenseVolatility ?? 0 },
        ].map((m) => (
          <div key={m.label} className="bg-white/[0.04] rounded-xl p-2 text-center">
            <p className="text-[10px] desktop-text-dim">{m.label}</p>
            <p className="text-xs font-semibold text-white/80 mt-0.5">{m.value}%</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

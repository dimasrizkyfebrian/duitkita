"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";
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

function ScoreArc({ score }: { score: number }) {
  const radius = 40;
  const cx = 52;
  const cy = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <svg width="104" height="104" className="rotate-[-90deg]">
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
      <motion.circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
      />
    </svg>
  );
}

export function HealthScoreCard({ healthScore, isLoading }: HealthScoreCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-3">
        <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
        <div className="flex items-center gap-4">
          <div className="h-24 w-24 bg-white/10 rounded-full animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-20 bg-white/10 rounded animate-pulse" />
            <div className="h-2.5 w-32 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-10 bg-white/10 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!healthScore) return null;

  const score = healthScore.score;
  const color = getScoreColor(score);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.05 }}
      className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-4"
    >
      <div className="flex items-center gap-2">
        <Activity size={13} className="text-purple-400" />
        <h3 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
          Health Score
        </h3>
      </div>

      {/* Arc ring + label */}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <ScoreArc score={score} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{score}</span>
            <span className="text-[10px] text-white/35 -mt-0.5">/ 100</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-2" style={{ color }}>
            {getScoreLabel(score)}
          </p>
          {healthScore.insights.slice(0, 2).map((insight) => (
            <p key={insight} className="text-[11px] text-white/40 leading-relaxed">
              • {insight}
            </p>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Saving", value: healthScore.savingRate },
          { label: "Adherence", value: healthScore.budgetAdherence },
          { label: "Volatility", value: healthScore.expenseVolatility },
        ].map((m) => (
          <div key={m.label} className="bg-white/[0.06] rounded-xl px-2 py-2 text-center">
            <p className="text-[10px] text-white/40">{m.label}</p>
            <p className="text-sm font-semibold text-white/80 mt-0.5">{m.value}%</p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

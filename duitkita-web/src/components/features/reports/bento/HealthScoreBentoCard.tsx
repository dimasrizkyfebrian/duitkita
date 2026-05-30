"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import type { FinancialHealthScore } from "@/types";

interface HealthScoreBentoCardProps {
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
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
      <motion.circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={color}
        strokeWidth="7"
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

export function HealthScoreBentoCard({ healthScore, isLoading }: HealthScoreBentoCardProps) {
  if (isLoading) {
    return (
      <div className="glass-card rounded-3xl p-5 flex flex-col gap-3 h-full">
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
      className="glass-card glass-card-accent rounded-3xl p-5 flex flex-col h-full"
    >
      <div className="flex items-center gap-2 mb-3">
        <Activity size={14} className="text-purple-400" />
        <h3 className="text-xs font-semibold desktop-text uppercase tracking-wider">Health Score</h3>
      </div>

      <div className="relative flex items-center justify-center my-1">
        <ScoreArc score={score} />
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-bold text-white">{score}</span>
          <span className="text-[10px] desktop-text-dim -mt-0.5">/ 100</span>
        </div>
      </div>

      <p className="text-center text-xs font-medium mb-3" style={{ color }}>
        {getScoreLabel(score)}
      </p>

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

      {healthScore?.insights && healthScore.insights.length > 0 && (
        <ul className="mt-3 space-y-1">
          {healthScore.insights.slice(0, 2).map((insight, i) => (
            <li key={i} className="text-[10px] desktop-text-dim leading-relaxed">
              • {insight}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

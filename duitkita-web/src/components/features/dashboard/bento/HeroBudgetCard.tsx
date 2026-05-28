"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { useAppStore } from "@/stores/app.store";
import { useAuthStore } from "@/stores/auth.store";
import { formatCurrency, getMonthName, getRemainingDays } from "@/lib/utils";
import type { MonthlyBudget } from "@/types";

interface HeroBudgetCardProps {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  isLoading: boolean;
  budgets: MonthlyBudget[];
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Selamat pagi";
  if (hour >= 12 && hour < 15) return "Selamat siang";
  if (hour >= 15 && hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function getStatusColor(pct: number): string {
  if (pct >= 100) return "#ef4444";
  if (pct >= 80) return "#f97316";
  if (pct >= 60) return "#eab308";
  return "#10b981";
}

export function HeroBudgetCard({
  totalBudget,
  totalSpent,
  totalRemaining,
  isLoading,
  budgets,
}: HeroBudgetCardProps) {
  const user = useAuthStore((s) => s.user);
  const { activeYear, activeMonth, setActiveMonth } = useAppStore();
  const remainingDays = getRemainingDays();
  const pct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const statusColor = getStatusColor(pct);
  const isOver = totalSpent > totalBudget;

  function prevMonth() {
    const m = activeMonth === 1 ? 12 : activeMonth - 1;
    const y = activeMonth === 1 ? activeYear - 1 : activeYear;
    setActiveMonth(y, m);
  }
  function nextMonth() {
    const m = activeMonth === 12 ? 1 : activeMonth + 1;
    const y = activeMonth === 12 ? activeYear + 1 : activeYear;
    setActiveMonth(y, m);
  }

  const isCurrentMonth =
    activeYear === new Date().getFullYear() &&
    activeMonth === new Date().getMonth() + 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="glass-card glass-card-accent rounded-3xl p-6 col-span-2 relative overflow-hidden"
    >
      {/* Decorative orbs */}
      <div
        className="absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #e91e8c 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-12 -left-8 w-40 h-40 rounded-full opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, #8b2be2 0%, transparent 70%)" }}
      />

      {/* Header row */}
      <div className="flex items-start justify-between mb-5 relative z-10">
        <div>
          <p className="text-white/55 text-sm font-medium">
            {getGreeting()}{user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋
          </p>
          <p className="text-white/40 text-xs mt-0.5">
            {isCurrentMonth ? `Sisa ${remainingDays} hari lagi` : `${getMonthName(activeMonth)} ${activeYear}`}
          </p>
        </div>

        {/* Month selector */}
        <div className="flex items-center gap-1 bg-white/[0.07] rounded-xl px-2 py-1.5 border border-white/[0.08]">
          <button
            onClick={prevMonth}
            className="p-0.5 rounded-lg text-white/40 hover:text-white/80 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-white/70 text-xs font-medium min-w-[80px] text-center">
            {getMonthName(activeMonth)} {activeYear}
          </span>
          <button
            onClick={nextMonth}
            className="p-0.5 rounded-lg text-white/40 hover:text-white/80 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Budget display */}
      <div className="relative z-10 mb-5">
        <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">
          Total Anggaran {getMonthName(activeMonth)}
        </p>
        {isLoading ? (
          <div className="h-10 w-56 bg-white/10 rounded-xl animate-pulse mb-1" />
        ) : (
          <p className="text-4xl font-bold text-white leading-none">
            {formatCurrency(totalBudget)}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative z-10 mb-4">
        <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
            className="h-full rounded-full"
            style={{ backgroundColor: statusColor }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            {isOver ? (
              <TrendingUp size={12} className="text-red-400" />
            ) : (
              <TrendingDown size={12} className="text-emerald-400" />
            )}
            <span className="text-xs font-medium" style={{ color: statusColor }}>
              {pct.toFixed(0)}% terpakai
            </span>
          </div>
          <span className="text-white/40 text-xs">
            {budgets.length} kategori
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="relative z-10 grid grid-cols-2 gap-3">
        <div className="bg-white/[0.05] rounded-2xl px-4 py-3 border border-white/[0.06]">
          <p className="text-white/45 text-xs font-medium mb-1">Terpakai</p>
          {isLoading ? (
            <div className="h-5 w-24 bg-white/10 rounded animate-pulse" />
          ) : (
            <p className="text-white font-semibold text-base">{formatCurrency(totalSpent)}</p>
          )}
        </div>
        <div className="bg-white/[0.05] rounded-2xl px-4 py-3 border border-white/[0.06]">
          <p className="text-white/45 text-xs font-medium mb-1">
            {isOver ? "Melebihi" : "Sisa"}
          </p>
          {isLoading ? (
            <div className="h-5 w-24 bg-white/10 rounded animate-pulse" />
          ) : (
            <p
              className="font-semibold text-base"
              style={{ color: isOver ? "#ef4444" : "#10b981" }}
            >
              {formatCurrency(Math.abs(totalRemaining))}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

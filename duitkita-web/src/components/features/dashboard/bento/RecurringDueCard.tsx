"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { RefreshCw, ArrowRight, Calendar } from "lucide-react";
import { formatCurrencyShort } from "@/lib/utils";
import { useRecurringExpenses } from "@/hooks/useRecurringExpenses";
import { format, parseISO, isAfter, addDays } from "date-fns";
import { id } from "date-fns/locale";

export function BentoRecurringDueCard() {
  const { recurringExpenses, isLoading } = useRecurringExpenses();

  const now = new Date();
  const upcoming = recurringExpenses
    .filter((r) => r.isActive)
    .sort((a, b) => new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime())
    .slice(0, 3);

  function getDueBadge(nextRunAt: string) {
    const runDate = parseISO(nextRunAt);
    if (!isAfter(runDate, now)) return { label: "Jatuh tempo", color: "#ef4444", bg: "rgba(239,68,68,0.15)" };
    if (!isAfter(runDate, addDays(now, 3))) return { label: "Segera", color: "#f97316", bg: "rgba(249,115,22,0.15)" };
    return { label: format(runDate, "d MMM", { locale: id }), color: "#10b981", bg: "rgba(16,185,129,0.10)" };
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.25 }}
      className="glass-card glass-card-accent rounded-3xl p-5 flex flex-col"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <RefreshCw size={14} className="text-purple-400" />
          <h3 className="text-xs font-semibold desktop-text uppercase tracking-wider">
            Pengeluaran Rutin
          </h3>
        </div>
        <Link href="/recurring" className="text-white/35 hover:text-white/70 transition-colors">
          <ArrowRight size={14} />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2.5 flex-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 bg-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : upcoming.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-3 gap-2">
          <Calendar size={24} className="text-white/20" />
          <p className="desktop-text-dim text-xs text-center">Belum ada pengeluaran rutin aktif</p>
        </div>
      ) : (
        <div className="flex-1 space-y-2">
          {upcoming.map((item) => {
            const badge = getDueBadge(item.nextRunAt);
            return (
              <div
                key={item.id}
                className="bg-white/[0.04] border border-white/[0.06] rounded-2xl px-3 py-2.5 flex items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-xs font-medium truncate">{item.categoryName}</p>
                  <p className="desktop-text-dim text-[10px] mt-0.5">
                    {formatCurrencyShort(item.amount)}
                  </p>
                </div>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
                  style={{ color: badge.color, background: badge.bg }}
                >
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

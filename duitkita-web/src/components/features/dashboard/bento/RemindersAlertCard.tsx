"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Bell, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { formatCurrencyShort } from "@/lib/utils";
import { useReminders } from "@/hooks/useReminders";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";

export function BentoRemindersAlertCard() {
  const { reminders, isLoading } = useReminders("overdue");
  const overdueCount = reminders.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
      className="glass-card glass-card-accent rounded-3xl p-5 flex flex-col"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell size={14} className={overdueCount > 0 ? "text-red-400" : "text-purple-400"} />
          <h3 className="text-xs font-semibold desktop-text uppercase tracking-wider">
            Pengingat
          </h3>
          {overdueCount > 0 && (
            <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded-full">
              {overdueCount}
            </span>
          )}
        </div>
        <Link href="/reminders" className="text-white/35 hover:text-white/70 transition-colors">
          <ArrowRight size={14} />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2.5 flex-1">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 bg-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : overdueCount === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-3 gap-2">
          <CheckCircle2 size={24} className="text-emerald-400/60" />
          <p className="desktop-text-dim text-xs text-center">Semua tagihan sudah beres!</p>
        </div>
      ) : (
        <div className="flex-1 space-y-2">
          {reminders.slice(0, 3).map((reminder) => (
            <div
              key={reminder.id}
              className="bg-red-500/10 border border-red-500/20 rounded-2xl px-3 py-2.5 flex items-center gap-2"
            >
              <AlertCircle size={13} className="text-red-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white/80 text-xs font-medium truncate">{reminder.title}</p>
                <p className="text-red-400/70 text-[10px] mt-0.5">
                  {format(parseISO(reminder.dueDate), "d MMM", { locale: id })}
                  {reminder.amount != null && ` · ${formatCurrencyShort(reminder.amount)}`}
                </p>
              </div>
            </div>
          ))}
          {overdueCount > 3 && (
            <Link href="/reminders" className="block text-center text-white/35 text-[10px] hover:text-white/60 transition-colors">
              +{overdueCount - 3} lainnya
            </Link>
          )}
        </div>
      )}
    </motion.div>
  );
}

"use client";

import Link from "next/link";
import { BellRing, ChevronRight } from "lucide-react";

export function RemindersShortcutCard() {
  return (
    <Link
      href="/reminders"
      className="flex items-center gap-3 p-4 glass-card rounded-2xl hover:bg-white/[0.08] transition-colors"
    >
      <div className="size-9 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
        <BellRing size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Pengingat Tagihan</p>
        <p className="text-xs text-muted-foreground">
          Lihat upcoming, overdue, dan tandai selesai
        </p>
      </div>
      <ChevronRight size={16} className="text-white/30 shrink-0" />
    </Link>
  );
}

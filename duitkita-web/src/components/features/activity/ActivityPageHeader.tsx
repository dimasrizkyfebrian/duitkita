"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function ActivityPageHeader() {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/dashboard"
        aria-label="Kembali ke dashboard"
        className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.1] transition-colors shrink-0"
      >
        <ChevronLeft size={17} />
      </Link>
      <h1 className="text-xl font-bold text-white">Aktivitas</h1>
    </div>
  );
}

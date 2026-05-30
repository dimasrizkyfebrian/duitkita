"use client";

import Link from "next/link";
import { Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { getMonthName, getRemainingDays, cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { useAppStore } from "@/stores/app.store";

interface DashboardHeaderProps {
  userName: string;
  year: number;
  month: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Selamat pagi";
  if (hour >= 12 && hour < 15) return "Selamat siang";
  if (hour >= 15 && hour < 18) return "Selamat sore";
  return "Selamat malam";
}

const MIN_YEAR = 2020;

export function DashboardHeader({ userName, year, month }: DashboardHeaderProps) {
  const remainingDays = getRemainingDays();
  const { unreadCount } = useNotifications();
  const setActiveMonth = useAppStore((s) => s.setActiveMonth);

  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const isMinMonth = year === MIN_YEAR && month === 1;

  function handlePrev() {
    if (isMinMonth) return;
    const m = month === 1 ? 12 : month - 1;
    const y = month === 1 ? year - 1 : year;
    setActiveMonth(y, m);
  }

  function handleNext() {
    if (isCurrentMonth) return;
    const m = month === 12 ? 1 : month + 1;
    const y = month === 12 ? year + 1 : year;
    setActiveMonth(y, m);
  }

  return (
    <div
      className="relative overflow-hidden px-5"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 1.5rem)",
        paddingBottom: "2.5rem",
      }}
    >
      {/* Decorative orbs */}
      <div
        className="absolute -top-10 -left-10 w-52 h-52 rounded-full blur-3xl pointer-events-none"
        style={{ background: "rgba(139, 43, 226, 0.18)" }}
      />
      <div
        className="absolute top-0 right-0 w-36 h-36 rounded-full blur-3xl pointer-events-none"
        style={{ background: "rgba(233, 30, 140, 0.12)" }}
      />

      {/* Content */}
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-white/55 text-sm font-medium">{getGreeting()} 👋</p>
          <p className="text-white font-bold text-2xl leading-tight mt-0.5">
            {userName.split(" ")[0]}
          </p>

          {/* Month navigation */}
          <div className="flex items-center gap-1.5 mt-2">
            <button
              onClick={handlePrev}
              disabled={isMinMonth}
              className={cn(
                "p-0.5 rounded-md transition-colors",
                isMinMonth
                  ? "text-white/15 cursor-not-allowed"
                  : "text-white/40 hover:text-white/70 active:bg-white/[0.08]"
              )}
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft size={14} />
            </button>

            <p className="text-white/50 text-sm">
              {getMonthName(month)} {year}
              {isCurrentMonth && (
                <span className="text-white/30"> · Sisa {remainingDays} hari</span>
              )}
            </p>

            <button
              onClick={handleNext}
              disabled={isCurrentMonth}
              className={cn(
                "p-0.5 rounded-md transition-colors",
                isCurrentMonth
                  ? "text-white/15 cursor-not-allowed"
                  : "text-white/40 hover:text-white/70 active:bg-white/[0.08]"
              )}
              aria-label="Bulan selanjutnya"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <Link
          href="/notifications"
          className="relative mt-0.5 p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
          aria-label="Notifikasi"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-pink-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}

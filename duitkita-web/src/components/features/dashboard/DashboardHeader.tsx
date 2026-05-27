"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { getMonthName, getRemainingDays } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";

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

export function DashboardHeader({ userName, year, month }: DashboardHeaderProps) {
  const remainingDays = getRemainingDays();
  const { unreadCount } = useNotifications();

  return (
    <div
      className="bg-gradient-to-br from-primary to-primary-dark h-36 px-4 flex items-start justify-between"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 2rem)' }}
    >
      <div>
        <p className="text-primary-foreground text-lg font-semibold">
          {getGreeting()}, {userName} 👋
        </p>
        <p className="text-primary-foreground/70 text-sm mt-1">
          {getMonthName(month)} {year} · Sisa {remainingDays} hari
        </p>
      </div>

      <Link
        href="/notifications"
        className="relative mt-1 p-1.5 rounded-xl text-primary-foreground/80 hover:text-primary-foreground transition-colors"
        aria-label="Notifikasi"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground text-[10px] font-medium rounded-full flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Link>
    </div>
  );
}

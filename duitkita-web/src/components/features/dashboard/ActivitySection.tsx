"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  getInitials,
  formatCurrencyShort,
  formatRelativeTime,
  cn,
} from "@/lib/utils";
import { ActivitySectionSkeleton } from "./DashboardSkeleton";
import type { Activity } from "@/types";

interface ActivitySectionProps {
  activities: Activity[];
  currentUserId: string;
  isLoading: boolean;
}

function getActionLabel(
  action: Activity["action"],
  entityType: Activity["entityType"],
): string {
  if (entityType === "budget") {
    if (action === "created") return "membuat anggaran";
    if (action === "updated") return "mengubah anggaran";
    return "menghapus anggaran";
  }
  if (action === "created") return "mencatat";
  if (action === "updated") return "mengubah";
  return "menghapus";
}

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

function renderActivityItem(activity: Activity, currentUserId: string) {
  const isOwn = activity.actorId === currentUserId;
  const actorLabel = isOwn ? "Kamu" : activity.actorName;
  const amount = activity.meta.amount;
  const categoryName = activity.meta.categoryName ?? activity.entityType;

  return (
    <motion.li
      key={activity.id}
      variants={itemVariants}
      className="flex items-center gap-3"
    >
      <Avatar className="w-9 h-9 shrink-0">
        <AvatarFallback
          className={cn(
            "text-xs font-semibold",
            isOwn
              ? "bg-primary/10 text-primary"
              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
          )}
        >
          {getInitials(activity.actorName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug truncate">
          <span className="font-medium">{actorLabel}</span>{" "}
          {getActionLabel(activity.action, activity.entityType)}{" "}
          <span className="font-medium">{categoryName}</span>
          {amount != null && (
            <span className="text-muted-foreground">
              {" "}
              · {formatCurrencyShort(amount)}
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatRelativeTime(activity.createdAt)}
        </p>
      </div>
    </motion.li>
  );
}

export function ActivitySection({
  activities,
  currentUserId,
  isLoading,
}: ActivitySectionProps) {
  const safeActivities: Activity[] = (() => {
    if (Array.isArray(activities)) return activities;
    if (activities && typeof activities === "object" && "data" in (activities as Record<string, unknown>)) {
      const nested = (activities as unknown as { data: unknown }).data;
      if (Array.isArray(nested)) return nested as Activity[];
    }
    return [];
  })();

  if (isLoading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">
            Aktivitas Terbaru
          </h2>
          <Link href="/activity" className="text-xs text-primary font-medium">
            Lihat semua
          </Link>
        </div>
        <ActivitySectionSkeleton />
      </section>
    );
  }

  if (safeActivities.length === 0) {
    return (
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">
            Aktivitas Terbaru
          </h2>
          <Link href="/activity" className="text-xs text-primary font-medium">
            Lihat semua
          </Link>
        </div>
        <p className="text-sm text-muted-foreground py-2">
          Belum ada aktivitas. Mulai catat pengeluaran pertama!
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-foreground">
          Aktivitas Terbaru
        </h2>
        <Link href="/activity" className="text-xs text-primary font-medium">
          Lihat semua
        </Link>
      </div>
      <motion.ul
        variants={listVariants}
        initial="hidden"
        animate="visible"
        className="space-y-3"
      >
        {safeActivities.map((a) => renderActivityItem(a, currentUserId))}
      </motion.ul>
    </section>
  );
}

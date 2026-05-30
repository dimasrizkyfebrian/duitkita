"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useAuthStore } from "@/stores/auth.store";
import { QUERY_KEYS } from "@/lib/constants";
import { cn, formatCurrencyShort, formatRelativeTime } from "@/lib/utils";
import { ActivitySectionSkeleton } from "./DashboardSkeleton";
import type { Activity, Partner } from "@/types";

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

export function ActivitySection({
  activities,
  currentUserId,
  isLoading,
}: ActivitySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const partner = qc.getQueryData<Partner>(QUERY_KEYS.partner());
  const currentUserHasAvatar = currentUser?.hasAvatar ?? false;
  const partnerHasAvatar = partner?.hasAvatar ?? false;

  const safeActivities: Activity[] = (() => {
    if (Array.isArray(activities)) return activities;
    if (activities && typeof activities === "object" && "data" in (activities as Record<string, unknown>)) {
      const nested = (activities as unknown as { data: unknown }).data;
      if (Array.isArray(nested)) return nested as Activity[];
    }
    return [];
  })();

  return (
    <section className="space-y-2">
      {/* Collapsible header — Bank Jago style */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full glass-card rounded-2xl px-4 py-3.5 flex items-center justify-between active:bg-white/[0.08] transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">Aktivitas Terbaru</span>
          {!isExpanded && safeActivities.length > 0 && (
            <span className="text-[10px] text-white/40 bg-white/[0.06] px-2 py-0.5 rounded-full">
              {safeActivities.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/activity"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-purple-300 font-medium"
          >
            Lihat semua
          </Link>
          <ChevronDown
            size={15}
            className={cn(
              "text-white/35 transition-transform duration-300",
              isExpanded && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="activity-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="glass-card rounded-2xl px-4 py-3">
              {isLoading ? (
                <ActivitySectionSkeleton />
              ) : safeActivities.length === 0 ? (
                <p className="text-sm text-white/40 py-2 text-center">
                  Belum ada aktivitas. Mulai catat pengeluaran pertama!
                </p>
              ) : (
                <motion.ul
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  {safeActivities.slice(0, 5).map((activity) => {
                    const isOwn = activity.actorId === currentUserId;
                    const actorLabel = isOwn ? "Kamu" : activity.actorName;
                    const amount = activity.meta.amount;
                    const categoryName = activity.meta.categoryName ?? activity.entityType;
                    const actorHasAvatar = isOwn ? currentUserHasAvatar : partnerHasAvatar;

                    return (
                      <motion.li
                        key={activity.id}
                        variants={itemVariants}
                        className="flex items-center gap-3"
                      >
                        <UserAvatar
                          userId={activity.actorId}
                          name={activity.actorName}
                          hasAvatar={actorHasAvatar}
                          className="w-8 h-8 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/80 leading-snug truncate">
                            <span className="font-medium text-white">{actorLabel}</span>{" "}
                            {getActionLabel(activity.action, activity.entityType)}{" "}
                            <span className="font-medium text-white">{categoryName}</span>
                            {amount != null && (
                              <span className="text-white/50"> · {formatCurrencyShort(amount)}</span>
                            )}
                          </p>
                          <p className="text-[11px] text-white/35 mt-0.5">
                            {formatRelativeTime(activity.createdAt)}
                          </p>
                        </div>
                      </motion.li>
                    );
                  })}
                </motion.ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

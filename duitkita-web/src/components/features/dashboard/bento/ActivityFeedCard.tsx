"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { QUERY_KEYS } from "@/lib/constants";
import { formatCurrencyShort, formatRelativeTime } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/UserAvatar";
import type { Activity, Partner } from "@/types";

interface ActivityFeedCardProps {
  activities: Activity[];
  isLoading: boolean;
}

function getActionLabel(action: Activity["action"], entityType: Activity["entityType"]): string {
  if (entityType === "budget") {
    if (action === "created") return "membuat anggaran";
    if (action === "updated") return "mengubah anggaran";
    return "menghapus anggaran";
  }
  if (action === "created") return "mencatat";
  if (action === "updated") return "mengubah";
  return "menghapus";
}

export function BentoActivityFeedCard({ activities, isLoading }: ActivityFeedCardProps) {
  const currentUser = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const partner = qc.getQueryData<Partner>(QUERY_KEYS.partner());
  const currentUserHasAvatar = currentUser?.hasAvatar ?? false;
  const partnerHasAvatar = partner?.hasAvatar ?? false;

  const safeActivities = Array.isArray(activities) ? activities : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.08 }}
      className="glass-card glass-card-accent rounded-3xl p-5 row-span-3 flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-purple-400" />
          <h3 className="text-xs font-semibold desktop-text uppercase tracking-wider">
            Aktivitas Terkini
          </h3>
        </div>
        <Link
          href="/activity"
          className="flex items-center gap-1 text-white/35 hover:text-white/70 transition-colors text-[11px]"
        >
          Semua <ArrowRight size={11} />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4 flex-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-white/10 rounded animate-pulse w-3/4" />
                <div className="h-2.5 bg-white/10 rounded animate-pulse w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : safeActivities.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="desktop-text-dim text-sm text-center">
            Belum ada aktivitas.<br />Mulai catat pengeluaran!
          </p>
        </div>
      ) : (
        <ul className="space-y-3 flex-1 overflow-y-auto scrollbar-hide">
          {safeActivities.slice(0, 10).map((activity, i) => {
            const isOwn = activity.actorId === currentUser?.id;
            const actorLabel = isOwn ? "Kamu" : activity.actorName;
            const amount = activity.meta.amount;
            const categoryName = activity.meta.categoryName ?? activity.entityType;
            const actorHasAvatar = isOwn ? currentUserHasAvatar : partnerHasAvatar;

            return (
              <motion.li
                key={activity.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
                className="flex items-center gap-3"
              >
                <UserAvatar
                  userId={activity.actorId}
                  name={activity.actorName}
                  hasAvatar={actorHasAvatar}
                  className="w-8 h-8 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white/75 text-xs leading-snug">
                    <span className="font-medium text-white/90">{actorLabel}</span>{" "}
                    {getActionLabel(activity.action, activity.entityType)}{" "}
                    <span className="font-medium text-white/90">{categoryName}</span>
                    {amount != null && (
                      <span className="text-white/45"> · {formatCurrencyShort(amount)}</span>
                    )}
                  </p>
                  <p className="text-white/35 text-[10px] mt-0.5">
                    {formatRelativeTime(activity.createdAt)}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}

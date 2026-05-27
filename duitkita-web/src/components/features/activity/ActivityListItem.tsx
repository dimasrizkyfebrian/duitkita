"use client";

import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useAuthStore } from "@/stores/auth.store";
import { QUERY_KEYS } from "@/lib/constants";
import {
  formatCurrencyShort,
  formatRelativeTime,
} from "@/lib/utils";
import type { Activity, Partner } from "@/types";

interface ActivityListItemProps {
  activity: Activity;
  currentUserId: string;
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

export const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export function ActivityListItem({
  activity,
  currentUserId,
}: ActivityListItemProps) {
  const currentUser = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const partner = qc.getQueryData<Partner>(QUERY_KEYS.partner());

  const isOwn = activity.actorId === currentUserId;
  const actorLabel = isOwn ? "Kamu" : activity.actorName;
  const amount = activity.meta.amount;
  const categoryName = activity.meta.categoryName ?? activity.entityType;
  const actorHasAvatar = isOwn
    ? (currentUser?.hasAvatar ?? false)
    : (partner?.hasAvatar ?? false);

  return (
    <motion.li
      variants={itemVariants}
      className="flex items-center gap-3 px-4 py-2.5"
    >
      <UserAvatar
        userId={activity.actorId}
        name={activity.actorName}
        hasAvatar={actorHasAvatar}
        className="w-9 h-9 shrink-0"
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">
          <span className="font-medium">{actorLabel}</span>{" "}
          {getActionLabel(activity.action, activity.entityType)}{" "}
          <span className="font-medium">{categoryName}</span>
          {activity.meta.note ? (
            <span className="text-muted-foreground"> · {activity.meta.note}</span>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatRelativeTime(activity.createdAt)}
        </p>
      </div>

      {amount != null && (
        <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">
          {formatCurrencyShort(amount)}
        </span>
      )}
    </motion.li>
  );
}

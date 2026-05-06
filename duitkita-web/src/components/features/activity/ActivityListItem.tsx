"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  cn,
  formatCurrencyShort,
  formatRelativeTime,
  getInitials,
} from "@/lib/utils";
import type { Activity } from "@/types";

interface ActivityListItemProps {
  activity: Activity;
  currentUserId: string;
}

function getActionLabel(action: Activity["action"]): string {
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
  const isOwn = activity.actorId === currentUserId;
  const actorLabel = isOwn ? "Kamu" : activity.actorName;
  const amount = activity.meta.amount;
  const categoryName = activity.meta.categoryName ?? activity.entityType;

  return (
    <motion.li
      variants={itemVariants}
      className="flex items-center gap-3 px-4 py-2.5"
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
        <p className="text-sm text-foreground leading-snug">
          <span className="font-medium">{actorLabel}</span>{" "}
          {getActionLabel(activity.action)}{" "}
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

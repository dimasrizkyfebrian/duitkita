"use client";

import {
  RefreshCw,
  Bell,
  AlertTriangle,
  Heart,
  BarChart2,
  type LucideIcon,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { Notification, NotificationType } from "@/types";

const TYPE_CONFIG: Record<NotificationType, { icon: LucideIcon; color: string; bg: string }> = {
  recurring_expense: { icon: RefreshCw, color: "text-purple-400", bg: "bg-purple-500/15" },
  bill_reminder:     { icon: Bell,         color: "text-amber-400",  bg: "bg-amber-500/15"  },
  budget_alert:      { icon: AlertTriangle, color: "text-red-400",   bg: "bg-red-500/15"    },
  partner_activity:  { icon: Heart,        color: "text-pink-400",   bg: "bg-pink-500/15"   },
  weekly_summary:    { icon: BarChart2,    color: "text-blue-400",   bg: "bg-blue-500/15"   },
};

interface NotificationListItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
}

export function NotificationListItem({
  notification,
  onMarkRead,
}: NotificationListItemProps) {
  const config = TYPE_CONFIG[notification.type] ?? {
    icon: Bell,
    color: "text-purple-400",
    bg: "bg-purple-500/15",
  };
  const Icon = config.icon;

  function handleClick() {
    if (!notification.isRead) onMarkRead(notification.id);
  }

  return (
    <li>
      <button
        onClick={handleClick}
        className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03] ${
          !notification.isRead ? "bg-white/[0.04]" : ""
        }`}
      >
        <div className={`size-9 rounded-2xl ${config.bg} ${config.color} flex items-center justify-center shrink-0 mt-0.5`}>
          <Icon size={16} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/90 leading-snug">
            {notification.title}
          </p>
          <p className="text-xs text-white/50 mt-0.5 leading-relaxed line-clamp-2">
            {notification.body}
          </p>
          <p className="text-[10px] text-white/30 mt-1">
            {formatRelativeTime(notification.createdAt)}
          </p>
        </div>

        {!notification.isRead && (
          <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0 mt-2" />
        )}
      </button>
    </li>
  );
}

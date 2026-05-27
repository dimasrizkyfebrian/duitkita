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

const TYPE_CONFIG: Record<NotificationType, { icon: LucideIcon; label: string }> = {
  recurring_expense: { icon: RefreshCw, label: "Pengeluaran otomatis" },
  bill_reminder: { icon: Bell, label: "Pengingat tagihan" },
  budget_alert: { icon: AlertTriangle, label: "Peringatan anggaran" },
  partner_activity: { icon: Heart, label: "Aktivitas pasangan" },
  weekly_summary: { icon: BarChart2, label: "Ringkasan mingguan" },
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
    label: notification.type,
  };
  const Icon = config.icon;

  function handleClick() {
    if (!notification.isRead) {
      onMarkRead(notification.id);
    }
  }

  return (
    <li>
      <button
        onClick={handleClick}
        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
          notification.isRead ? "" : "bg-primary/5"
        }`}
      >
        <div className="size-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
          <Icon size={16} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug">
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
            {notification.body}
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            {formatRelativeTime(notification.createdAt)}
          </p>
        </div>

        {!notification.isRead && (
          <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
        )}
      </button>
    </li>
  );
}

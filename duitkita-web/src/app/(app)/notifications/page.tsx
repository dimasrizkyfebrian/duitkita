"use client";

import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationListItem } from "@/components/features/notifications/NotificationListItem";
import { Button } from "@/components/ui/button";

function NotificationSkeleton() {
  return (
    <div className="space-y-0.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3">
          <div className="size-9 rounded-2xl bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-2 py-0.5">
            <div className="h-3.5 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-3 w-full bg-muted animate-pulse rounded" />
            <div className="h-2.5 w-1/4 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    isLoading,
    isError,
    refetch,
    markRead,
    markAllRead,
    isMarkingAll,
  } = useNotifications();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full pt-safe-top pb-6"
    >
      <div className="px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Notifikasi</h1>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllRead()}
            disabled={isMarkingAll}
            className="text-xs text-primary"
          >
            Tandai semua dibaca
          </Button>
        )}
      </div>

      {isLoading && <NotificationSkeleton />}

      {isError && !isLoading && (
        <div className="text-center py-10 px-4">
          <p className="text-sm text-muted-foreground">Gagal memuat notifikasi.</p>
          <button
            onClick={refetch}
            className="text-xs text-primary mt-1 font-medium"
          >
            Coba lagi
          </button>
        </div>
      )}

      {!isLoading && !isError && notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 space-y-3">
          <div className="size-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
            <Bell size={20} />
          </div>
          <p className="text-sm font-medium text-foreground">Belum ada notifikasi</p>
          <p className="text-xs text-muted-foreground text-center">
            Notifikasi tentang anggaran, tagihan, dan aktivitas pasangan akan muncul di sini.
          </p>
        </div>
      )}

      {!isLoading && !isError && notifications.length > 0 && (
        <ul className="divide-y divide-border">
          {notifications.map((n) => (
            <NotificationListItem
              key={n.id}
              notification={n}
              onMarkRead={markRead}
            />
          ))}
        </ul>
      )}
    </motion.div>
  );
}

"use client";

import { motion } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationListItem } from "@/components/features/notifications/NotificationListItem";

function NotificationSkeleton() {
  return (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3.5">
          <div className="size-9 rounded-2xl bg-white/[0.08] animate-pulse shrink-0" />
          <div className="flex-1 space-y-2 py-0.5">
            <div className="h-3.5 w-3/4 bg-white/[0.08] animate-pulse rounded" />
            <div className="h-3 w-full bg-white/[0.06] animate-pulse rounded" />
            <div className="h-2.5 w-1/5 bg-white/[0.05] animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationContent({
  notifications,
  unreadCount,
  isLoading,
  isError,
  refetch,
  markRead,
  markAllRead,
  isMarkingAll,
}: ReturnType<typeof useNotifications>) {
  if (isLoading) return <NotificationSkeleton />;

  if (isError) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-white/45">Gagal memuat notifikasi.</p>
        <button onClick={refetch} className="text-xs text-primary mt-1 font-medium">
          Coba lagi
        </button>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl flex flex-col items-center justify-center py-16 px-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
          <Bell size={20} className="text-purple-400" />
        </div>
        <p className="text-sm font-medium text-white/80">Belum ada notifikasi</p>
        <p className="text-xs text-white/40 max-w-xs leading-relaxed">
          Notifikasi tentang anggaran, tagihan, dan aktivitas pasangan akan muncul di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
      {notifications.map((n) => (
        <NotificationListItem key={n.id} notification={n} onMarkRead={markRead} />
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  const hooks = useNotifications();
  const { unreadCount, markAllRead, isMarkingAll } = hooks;

  return (
    <>
      {/* ── Desktop layout (lg+) ── */}
      <div className="hidden lg:block p-6 min-h-screen">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Notifikasi</h1>
            <p className="desktop-text-dim text-sm mt-0.5">
              {unreadCount > 0 ? `${unreadCount} belum dibaca` : "Semua sudah dibaca"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              disabled={isMarkingAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-white/60 bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] transition-colors disabled:opacity-40"
            >
              <CheckCheck size={13} />
              Tandai semua dibaca
            </button>
          )}
        </div>
        <NotificationContent {...hooks} />
      </div>

      {/* ── Mobile layout ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="lg:hidden w-full pt-safe-top pb-6 space-y-4"
      >
        <div className="px-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Notifikasi</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-white/40 mt-0.5">{unreadCount} belum dibaca</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              disabled={isMarkingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/55 bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.09] transition-colors disabled:opacity-40"
            >
              <CheckCheck size={12} />
              Tandai dibaca
            </button>
          )}
        </div>

        <div className="px-4">
          <NotificationContent {...hooks} />
        </div>
      </motion.div>
    </>
  );
}

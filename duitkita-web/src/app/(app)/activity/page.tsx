"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useActivityFeed } from "@/hooks/useActivity";
import { ActivityPageHeader } from "@/components/features/activity/ActivityPageHeader";
import { ActivityListItem } from "@/components/features/activity/ActivityListItem";
import { ActivityListSkeleton } from "@/components/features/activity/ActivityListSkeleton";
import { ActivityEmptyState } from "@/components/features/activity/ActivityEmptyState";
import { NoPartnerState } from "@/components/shared/NoPartnerState";
import { formatDate } from "@/lib/utils";
import type { Activity } from "@/types";

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.floor(
    (startOfDay(now) - startOfDay(d)) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Hari ini";
  if (diffDays === 1) return "Kemarin";
  return formatDate(iso);
}

function groupByDay(activities: Activity[]): {
  key: string;
  label: string;
  items: Activity[];
}[] {
  const groups = new Map<string, { label: string; items: Activity[] }>();
  for (const a of activities) {
    const k = dayKey(a.createdAt);
    const existing = groups.get(k);
    if (existing) {
      existing.items.push(a);
    } else {
      groups.set(k, { label: dayLabel(a.createdAt), items: [a] });
    }
  }
  return Array.from(groups.entries()).map(([key, value]) => ({
    key,
    label: value.label,
    items: value.items,
  }));
}

function ActivityContent({
  activities,
  isLoading,
  isError,
  noPartner,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  refetch,
  currentUserId,
}: {
  activities: Activity[];
  isLoading: boolean;
  isError: boolean;
  noPartner: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
  currentUserId: string;
}) {
  const groups = groupByDay(activities);

  if (isLoading) return <ActivityListSkeleton />;

  if (!isLoading && noPartner) {
    return <NoPartnerState description="Hubungkan akun pasangan untuk lihat aktivitas berdua." />;
  }

  if (!isLoading && isError) {
    return (
      <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl py-8 text-center space-y-2">
        <p className="text-sm text-white/50">Gagal memuat aktivitas.</p>
        <button onClick={refetch} className="text-xs text-primary font-medium">
          Coba lagi
        </button>
      </div>
    );
  }

  if (!isLoading && !isError && !noPartner && activities.length === 0) {
    return <ActivityEmptyState />;
  }

  return (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      {groups.map((group) => (
        <section
          key={group.key}
          className="bg-white/[0.04] border border-white/[0.07] rounded-2xl overflow-hidden"
        >
          <div className="px-4 pt-3 pb-1.5">
            <p className="text-[11px] font-semibold text-white/45 uppercase tracking-wider">
              {group.label}
            </p>
          </div>
          <ul className="divide-y divide-white/[0.06]">
            {group.items.map((activity) => (
              <ActivityListItem
                key={activity.id}
                activity={activity}
                currentUserId={currentUserId}
              />
            ))}
          </ul>
        </section>
      ))}

      <div className="pt-2 flex justify-center">
        {hasNextPage ? (
          <button
            onClick={fetchNextPage}
            disabled={isFetchingNextPage}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-white/60 bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.09] transition-colors disabled:opacity-50"
          >
            {isFetchingNextPage && <Loader2 size={12} className="animate-spin" />}
            Muat lebih banyak
          </button>
        ) : (
          <p className="text-xs text-white/30">Sudah sampai akhir</p>
        )}
      </div>
    </motion.div>
  );
}

export default function ActivityPage() {
  const user = useAuthStore((s) => s.user);
  const {
    activities,
    isLoading,
    isError,
    noPartner,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useActivityFeed();

  const contentProps = {
    activities,
    isLoading,
    isError,
    noPartner,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
    currentUserId: user?.id ?? "",
  };

  return (
    <>
      {/* ── Desktop layout (lg+) ── */}
      <div className="hidden lg:block p-6 min-h-screen">
        <div className="mb-6">
          <ActivityPageHeader />
        </div>
        <ActivityContent {...contentProps} />
      </div>

      {/* ── Mobile layout ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="lg:hidden w-full pt-safe-top pb-6 space-y-4"
      >
        <div className="px-4">
          <ActivityPageHeader />
        </div>
        <div className="px-4">
          <ActivityContent {...contentProps} />
        </div>
      </motion.div>
    </>
  );
}

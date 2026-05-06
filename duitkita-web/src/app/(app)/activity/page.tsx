"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useActivityFeed } from "@/hooks/useActivity";
import { Button } from "@/components/ui/button";
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

  const groups = groupByDay(activities);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full pt-4 pb-6 space-y-4"
    >
      <div className="px-4">
        <ActivityPageHeader />
      </div>

      <div className="px-4">
        {isLoading && <ActivityListSkeleton />}

        {!isLoading && noPartner && (
          <NoPartnerState description="Hubungkan akun pasangan untuk lihat aktivitas berdua." />
        )}

        {!isLoading && isError && (
          <div className="bg-card rounded-2xl py-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Gagal memuat aktivitas.
            </p>
            <button
              onClick={refetch}
              className="text-xs text-primary font-medium"
            >
              Coba lagi
            </button>
          </div>
        )}

        {!isLoading && !isError && !noPartner && activities.length === 0 && (
          <ActivityEmptyState />
        )}

        {!isLoading && !isError && !noPartner && activities.length > 0 && (
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {groups.map((group) => (
              <section
                key={group.key}
                className="bg-card rounded-2xl overflow-hidden"
              >
                <div className="px-4 pt-3 pb-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {group.label}
                  </p>
                </div>
                <ul className="divide-y divide-border">
                  {group.items.map((activity) => (
                    <ActivityListItem
                      key={activity.id}
                      activity={activity}
                      currentUserId={user?.id ?? ""}
                    />
                  ))}
                </ul>
              </section>
            ))}

            <div className="pt-2 flex justify-center">
              {hasNextPage ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchNextPage}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage && (
                    <Loader2 size={14} className="animate-spin" />
                  )}
                  Muat lebih banyak
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Sudah sampai akhir
                </p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

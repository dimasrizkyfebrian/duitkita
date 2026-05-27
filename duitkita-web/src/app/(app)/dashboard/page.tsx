"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth.store";
import { useAppStore } from "@/stores/app.store";
import { useDashboard } from "@/hooks/useDashboard";
import { DashboardHeader } from "@/components/features/dashboard/DashboardHeader";
import { SummaryCard } from "@/components/features/dashboard/SummaryCard";
import { RemindersShortcutCard } from "@/components/features/dashboard/RemindersShortcutCard";
import { AlertBanner } from "@/components/features/dashboard/AlertBanner";
import { ActivitySection } from "@/components/features/dashboard/ActivitySection";
import { BudgetList } from "@/components/features/dashboard/BudgetList";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { activeYear, activeMonth } = useAppStore();
  const {
    budgets,
    activities,
    totalBudget,
    totalSpent,
    totalRemaining,
    criticalBudget,
    isBudgetsLoading,
    isActivityLoading,
    isBudgetsError,
    isActivityError,
    isFetching,
    refetch,
  } = useDashboard();

  const [alertDismissed, setAlertDismissed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAlertDismissed(false);
  }, [activeYear, activeMonth]);

  // Pull-to-refresh
  const touchStartY = useRef(0);
  const [isPulling, setIsPulling] = useState(false);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchMove(e: React.TouchEvent) {
    const main = document.querySelector("main");
    if (main && main.scrollTop > 0) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 60) setIsPulling(true);
  }

  function handleTouchEnd() {
    if (isPulling) refetch();
    setIsPulling(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Refetch / pull-to-refresh indicator — fixed overlay, no layout shift */}
      <AnimatePresence>
        {(isFetching || isPulling) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md ring-1 ring-border"
          >
            <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground font-medium">Memperbarui…</span>
          </motion.div>
        )}
      </AnimatePresence>

      <DashboardHeader
        userName={user?.name ?? ""}
        year={activeYear}
        month={activeMonth}
      />

      <div className="px-4 -mt-8 relative z-10 space-y-4 pb-6">
        <SummaryCard
          totalBudget={totalBudget}
          totalSpent={totalSpent}
          totalRemaining={totalRemaining}
          isLoading={isBudgetsLoading}
        />

        <RemindersShortcutCard />

        <AnimatePresence>
          {criticalBudget && !alertDismissed && (
            <AlertBanner
              key="alert-banner"
              budget={criticalBudget}
              onDismiss={() => setAlertDismissed(true)}
            />
          )}
        </AnimatePresence>

        {isBudgetsError && (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">
              Gagal memuat data anggaran.
            </p>
            <button
              onClick={refetch}
              className="text-xs text-primary mt-1 font-medium"
            >
              Coba lagi
            </button>
          </div>
        )}

        {isActivityError && (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">
              Gagal memuat aktivitas.
            </p>
            <button
              onClick={refetch}
              className="text-xs text-primary mt-1 font-medium"
            >
              Coba lagi
            </button>
          </div>
        )}

        <ActivitySection
          activities={activities}
          currentUserId={user?.id ?? ""}
          isLoading={isActivityLoading}
        />

        <BudgetList budgets={budgets} isLoading={isBudgetsLoading} />
      </div>
    </motion.div>
  );
}

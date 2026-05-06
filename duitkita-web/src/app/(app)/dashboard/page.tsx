"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth.store";
import { useAppStore } from "@/stores/app.store";
import { useDashboard } from "@/hooks/useDashboard";
import { DashboardHeader } from "@/components/features/dashboard/DashboardHeader";
import { SummaryCard } from "@/components/features/dashboard/SummaryCard";
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Refetch / pull-to-refresh indicator */}
      <AnimatePresence>
        {(isFetching || isPulling) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center pt-2 pb-1"
          >
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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

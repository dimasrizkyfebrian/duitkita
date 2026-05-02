"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { HeartCrack, Inbox } from "lucide-react";
import { useReports, useTrend } from "@/hooks/useReports";
import { useAppStore } from "@/stores/app.store";
import { Button } from "@/components/ui/button";
import { ReportPageHeader } from "@/components/features/reports/ReportPageHeader";
import { ScopeTabs } from "@/components/features/reports/ScopeTabs";
import { ReportSummaryCard } from "@/components/features/reports/ReportSummaryCard";
import { CategoryDistributionChart } from "@/components/features/reports/CategoryDistributionChart";
import { TrendChart } from "@/components/features/reports/TrendChart";
import { TopExpensesList } from "@/components/features/reports/TopExpensesList";
import { CategoryBreakdownCard } from "@/components/features/reports/CategoryBreakdownCard";
import {
  ReportChartSkeleton,
  ReportHeaderSkeleton,
  ReportListSkeleton,
  ReportSummarySkeleton,
} from "@/components/features/reports/ReportSkeleton";
import type { ReportScope } from "@/types";

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

function NoPartnerState() {
  return (
    <div className="bg-card rounded-2xl p-6 text-center space-y-3">
      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
        <HeartCrack size={20} className="text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          Belum punya pasangan
        </p>
        <p className="text-xs text-muted-foreground">
          Hubungkan akun pasangan untuk lihat laporan berdua.
        </p>
      </div>
      <Link href="/profile">
        <Button variant="outline" size="sm">
          Hubungkan pasangan
        </Button>
      </Link>
    </div>
  );
}

function EmptyCategoryState() {
  return (
    <div className="text-center py-10 space-y-3">
      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
        <Inbox size={20} className="text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">
        Belum ada anggaran bulan ini
      </p>
    </div>
  );
}

export default function ReportsPage() {
  const { activeYear, activeMonth, setActiveMonth } = useAppStore();
  const [scope, setScope] = useState<ReportScope>("me");
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(
    null,
  );

  const { report, isLoading, isError, noPartner, refetch, hasPartner } =
    useReports(scope);
  const trendQuery = useTrend();

  function handlePrevMonth() {
    setExpandedCategoryId(null);
    if (activeMonth === 1) setActiveMonth(activeYear - 1, 12);
    else setActiveMonth(activeYear, activeMonth - 1);
  }

  function handleNextMonth() {
    setExpandedCategoryId(null);
    if (activeMonth === 12) setActiveMonth(activeYear + 1, 1);
    else setActiveMonth(activeYear, activeMonth + 1);
  }

  function handleScopeChange(next: ReportScope) {
    setExpandedCategoryId(null);
    setScope(next);
  }

  function toggleExpanded(categoryId: string) {
    setExpandedCategoryId((curr) => (curr === categoryId ? null : categoryId));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full pt-4 pb-6 space-y-4"
    >
      <div className="px-4 space-y-3">
        {isLoading && !report ? (
          <ReportHeaderSkeleton />
        ) : (
          <>
            <ReportPageHeader
              year={activeYear}
              month={activeMonth}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
            />
            <ScopeTabs
              scope={scope}
              onScopeChange={handleScopeChange}
              hasPartner={hasPartner}
            />
          </>
        )}
      </div>

      <div className="px-4 space-y-4">
        {isError && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Gagal memuat laporan.
            </p>
            <button
              onClick={refetch}
              className="text-xs text-primary mt-1 font-medium"
            >
              Coba lagi
            </button>
          </div>
        )}

        {noPartner && (scope === "partner" || scope === "both") && (
          <NoPartnerState />
        )}

        {isLoading && !report && (
          <>
            <ReportSummarySkeleton />
            <ReportChartSkeleton />
            <ReportListSkeleton />
          </>
        )}

        {report && !isLoading && (
          <>
            <ReportSummaryCard
              totalBudget={report.totalEffectiveBudget}
              totalSpent={report.totalSpent}
              totalRemaining={report.totalRemaining}
              percentageUsed={report.overallPercentageUsed}
            />

            <CategoryDistributionChart
              categories={report.categories}
              totalSpent={report.totalSpent}
            />

            {scope === "me" && (
              <TrendChart
                trend={trendQuery.data ?? []}
                isLoading={trendQuery.isLoading}
              />
            )}

            <TopExpensesList categories={report.categories} />

            <section className="bg-card rounded-2xl overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Detail per Kategori
                </h2>
              </div>
              {report.categories.length === 0 ? (
                <EmptyCategoryState />
              ) : (
                <motion.ul
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                  className="divide-y divide-border"
                >
                  {report.categories.map((category, i) => (
                    <CategoryBreakdownCard
                      key={category.categoryId}
                      category={category}
                      index={i}
                      isExpanded={expandedCategoryId === category.categoryId}
                      onToggle={() => toggleExpanded(category.categoryId)}
                    />
                  ))}
                </motion.ul>
              )}
            </section>
          </>
        )}
      </div>
    </motion.div>
  );
}

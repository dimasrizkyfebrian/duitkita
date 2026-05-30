"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Inbox } from "lucide-react";
import {
  useReports,
  useTrend,
  useCategoryTrend,
  useForecast,
  useHealthScore,
} from "@/hooks/useReports";
import { useAppStore } from "@/stores/app.store";
import { ReportPageHeader } from "@/components/features/reports/ReportPageHeader";
import { ScopeTabs } from "@/components/features/reports/ScopeTabs";
import { PageTitle } from "@/components/layout/PageTitle";
import { ReportSummaryCard } from "@/components/features/reports/ReportSummaryCard";
import { ForecastCard } from "@/components/features/reports/ForecastCard";
import { HealthScoreCard } from "@/components/features/reports/HealthScoreCard";
import { CategoryDistributionChart } from "@/components/features/reports/CategoryDistributionChart";
import { TrendChart } from "@/components/features/reports/TrendChart";
import { CategoryTrendChart } from "@/components/features/reports/CategoryTrendChart";
import { TopExpensesList } from "@/components/features/reports/TopExpensesList";
import { CategoryBreakdownCard } from "@/components/features/reports/CategoryBreakdownCard";
import { ExportPanel } from "@/components/features/reports/ExportPanel";
import { NoPartnerState } from "@/components/shared/NoPartnerState";
import {
  ReportChartSkeleton,
  ReportHeaderSkeleton,
  ReportListSkeleton,
  ReportSummarySkeleton,
} from "@/components/features/reports/ReportSkeleton";
import { SummaryBentoCard } from "@/components/features/reports/bento/SummaryBentoCard";
import { HealthScoreBentoCard } from "@/components/features/reports/bento/HealthScoreBentoCard";
import { ForecastBentoCard } from "@/components/features/reports/bento/ForecastBentoCard";
import { TrendBentoCard } from "@/components/features/reports/bento/TrendBentoCard";
import { DistributionBentoCard } from "@/components/features/reports/bento/DistributionBentoCard";
import { TopExpensesBentoCard } from "@/components/features/reports/bento/TopExpensesBentoCard";
import { CategoryTrendBentoCard } from "@/components/features/reports/bento/CategoryTrendBentoCard";
import { CategoryBreakdownBentoCard } from "@/components/features/reports/bento/CategoryBreakdownBentoCard";
import { ExportHeaderButton } from "@/components/features/reports/bento/ExportHeaderButton";
import type { ReportScope } from "@/types";

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

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
  const categoryTrendQuery = useCategoryTrend();
  const forecastQuery = useForecast(scope);
  const healthScoreQuery = useHealthScore(scope);

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

  const noPartnerScope = noPartner && (scope === "partner" || scope === "both");

  return (
    <>
      {/* ── Desktop bento grid layout (lg+) ── */}
      <div className="hidden lg:block p-6 min-h-screen">
        {/* Header: 3-column — title | month nav | scope tabs */}
        <div className="mb-6 flex items-center gap-4">
          {/* Left: title */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Laporan</h1>
            <p className="desktop-text-dim text-sm mt-0.5">Analisis keuangan bulanan</p>
          </div>

          {isLoading && !report ? (
            <div className="flex items-center gap-3">
              <div className="h-8 w-36 bg-white/10 rounded-xl animate-pulse" />
              <div className="h-8 w-52 bg-white/10 rounded-2xl animate-pulse" />
              <div className="h-8 w-20 bg-white/10 rounded-xl animate-pulse" />
            </div>
          ) : (
            <>
              {/* Center: month nav */}
              <ReportPageHeader
                year={activeYear}
                month={activeMonth}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
              />

              {/* Scope tabs — glass desktop variant */}
              <ScopeTabs
                scope={scope}
                onScopeChange={handleScopeChange}
                hasPartner={hasPartner}
                desktopVariant
              />

              {/* Export button — always accessible in header */}
              <ExportHeaderButton
                year={activeYear}
                month={activeMonth}
                hasPartner={hasPartner}
              />
            </>
          )}
        </div>

        {/* Error state */}
        {isError && (
          <div className="glass-card rounded-3xl p-6 text-center mb-4">
            <p className="text-sm desktop-text-muted">Gagal memuat laporan.</p>
            <button onClick={refetch} className="text-xs text-primary mt-1 font-medium">
              Coba lagi
            </button>
          </div>
        )}

        {noPartnerScope && (
          <div className="mb-4">
            <NoPartnerState description="Hubungkan akun pasangan untuk lihat laporan berdua." />
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && !report && (
          <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-card rounded-3xl h-40 animate-pulse" style={{ gridColumn: i === 0 ? "1 / 3" : undefined }} />
            ))}
          </div>
        )}

        {/* Bento grid */}
        {report && !isLoading && (
          <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>

            {/* Row 1: Summary (2col) | Health Score | Forecast */}
            <div style={{ gridColumn: "1 / 3", gridRow: "1" }}>
              <SummaryBentoCard
                totalBudget={report.totalEffectiveBudget}
                totalSpent={report.totalSpent}
                totalRemaining={report.totalRemaining}
                percentageUsed={report.overallPercentageUsed}
              />
            </div>

            <div style={{ gridColumn: "3", gridRow: "1" }}>
              <HealthScoreBentoCard
                healthScore={healthScoreQuery.data}
                isLoading={healthScoreQuery.isLoading}
              />
            </div>

            <div style={{ gridColumn: "4", gridRow: "1" }}>
              <ForecastBentoCard
                forecast={forecastQuery.data}
                isLoading={forecastQuery.isLoading}
                noPartner={noPartnerScope}
              />
            </div>

            {scope === "me" ? (
              <>
                {/* Row 2 (me): Trend (3col) | TopExpenses (tall, rows 2-3) */}
                <div style={{ gridColumn: "1 / 4", gridRow: "2" }}>
                  <TrendBentoCard
                    trend={trendQuery.data ?? []}
                    isLoading={trendQuery.isLoading}
                  />
                </div>

                <div style={{ gridColumn: "4", gridRow: "2 / 4" }}>
                  <TopExpensesBentoCard categories={report.categories} />
                </div>

                {/* Row 3 (me): Distribution (1col) | CategoryTrend (2col) */}
                <div style={{ gridColumn: "1", gridRow: "3" }}>
                  <DistributionBentoCard
                    categories={report.categories}
                    totalSpent={report.totalSpent}
                  />
                </div>

                <div style={{ gridColumn: "2 / 4", gridRow: "3" }}>
                  <CategoryTrendBentoCard
                    trends={categoryTrendQuery.data}
                    isLoading={categoryTrendQuery.isLoading}
                  />
                </div>

                {/* Row 4 (me): CategoryBreakdown full */}
                <div style={{ gridColumn: "1 / 5", gridRow: "4" }}>
                  <CategoryBreakdownBentoCard
                    categories={report.categories}
                    expandedCategoryId={expandedCategoryId}
                    onToggle={toggleExpanded}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Row 2 (partner/both): Distribution (2col) | TopExpenses (2col) */}
                <div style={{ gridColumn: "1 / 3", gridRow: "2" }}>
                  <DistributionBentoCard
                    categories={report.categories}
                    totalSpent={report.totalSpent}
                  />
                </div>

                <div style={{ gridColumn: "3 / 5", gridRow: "2" }}>
                  <TopExpensesBentoCard categories={report.categories} />
                </div>

                {/* Row 3 (partner/both): CategoryBreakdown full */}
                <div style={{ gridColumn: "1 / 5", gridRow: "3" }}>
                  <CategoryBreakdownBentoCard
                    categories={report.categories}
                    expandedCategoryId={expandedCategoryId}
                    onToggle={toggleExpanded}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Mobile layout (unchanged) ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="lg:hidden w-full pt-safe-top pb-6 space-y-4"
      >
      <div className="px-4 space-y-3">
        <PageTitle title="Laporan" />
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
            <ExportPanel
              year={activeYear}
              month={activeMonth}
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
          <NoPartnerState description="Hubungkan akun pasangan untuk lihat laporan berdua." />
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

            <ForecastCard
              forecast={forecastQuery.data}
              isLoading={forecastQuery.isLoading}
              noPartner={noPartner && (scope === "partner" || scope === "both")}
            />

            <HealthScoreCard
              healthScore={healthScoreQuery.data}
              isLoading={healthScoreQuery.isLoading}
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

            {scope === "me" && (
              <CategoryTrendChart
                trends={categoryTrendQuery.data}
                isLoading={categoryTrendQuery.isLoading}
              />
            )}

            <TopExpensesList categories={report.categories} />

            <section className="bg-white/[0.04] border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="px-3 pt-4 pb-2">
                <h2 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
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
                  className="divide-y divide-white/[0.06]"
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
    </>
  );
}

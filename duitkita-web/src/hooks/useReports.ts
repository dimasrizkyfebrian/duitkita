import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/stores/app.store";
import { APP_CONFIG, QUERY_KEYS } from "@/lib/constants";
import { isNotFound } from "@/lib/utils";
import {
  fetchMonthlyReport,
  fetchCoupleReport,
  fetchTrend,
  fetchCategoryTrend,
  fetchRolloverHistory,
  fetchForecast,
  fetchHealthScore,
} from "@/lib/services/report.service";
import type {
  MonthlyReport,
  CoupleReport,
  CategoryReportItem,
  AlertStatus,
  ReportScope,
} from "@/types";

const STATUS_RANK: Record<AlertStatus, number> = {
  ok: 0,
  warning: 1,
  danger: 2,
  over: 3,
};

function pickWorseStatus(a: AlertStatus, b: AlertStatus): AlertStatus {
  return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b;
}

export function useMonthlyReport() {
  const { activeYear, activeMonth } = useAppStore();
  return useQuery({
    queryKey: QUERY_KEYS.reports.monthly(activeYear, activeMonth),
    queryFn: () => fetchMonthlyReport(activeYear, activeMonth),
  });
}

export function useCoupleReport() {
  const { activeYear, activeMonth } = useAppStore();
  return useQuery({
    queryKey: QUERY_KEYS.reports.couple(activeYear, activeMonth),
    queryFn: () => fetchCoupleReport(activeYear, activeMonth),
    retry: (failureCount, error) =>
      isNotFound(error) ? false : failureCount < 1,
  });
}

export function useTrend() {
  return useQuery({
    queryKey: QUERY_KEYS.reports.trend(APP_CONFIG.trendMonthsBack),
    queryFn: () => fetchTrend(APP_CONFIG.trendMonthsBack),
  });
}

export function useCategoryTrend() {
  return useQuery({
    queryKey: QUERY_KEYS.reports.categoryTrend(APP_CONFIG.trendMonthsBack),
    queryFn: () => fetchCategoryTrend(APP_CONFIG.trendMonthsBack),
  });
}

export function useRolloverHistory(categoryId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.reports.rollover(
      categoryId ?? "",
      APP_CONFIG.trendMonthsBack,
    ),
    queryFn: () => fetchRolloverHistory(categoryId!, APP_CONFIG.trendMonthsBack),
    enabled: categoryId !== null,
    staleTime: 5 * 60 * 1000,
  });
}

export function useForecast(scope: ReportScope) {
  const { activeYear, activeMonth } = useAppStore();
  const forecastScope: "me" | "partner" | "both" =
    scope === "partner" ? "partner" : scope;
  return useQuery({
    queryKey: QUERY_KEYS.forecast(activeYear, activeMonth, forecastScope),
    queryFn: () => fetchForecast(activeYear, activeMonth, forecastScope),
    retry: (failureCount, error) =>
      isNotFound(error) ? false : failureCount < 1,
  });
}

export function useHealthScore(scope: ReportScope) {
  const { activeYear, activeMonth } = useAppStore();
  const healthScope: "me" | "both" = scope === "both" ? "both" : "me";
  return useQuery({
    queryKey: QUERY_KEYS.healthScore(activeYear, activeMonth, healthScope),
    queryFn: () => fetchHealthScore(activeYear, activeMonth, healthScope),
    retry: (failureCount, error) =>
      isNotFound(error) ? false : failureCount < 1,
  });
}

function mergeCategories(
  meCategories: CategoryReportItem[],
  partnerCategories: CategoryReportItem[],
): CategoryReportItem[] {
  const map = new Map<string, CategoryReportItem>();
  for (const cat of meCategories) map.set(cat.categoryId, { ...cat });

  for (const partnerCat of partnerCategories) {
    const existing = map.get(partnerCat.categoryId);
    if (!existing) {
      map.set(partnerCat.categoryId, { ...partnerCat });
      continue;
    }
    const baseAmount = existing.baseAmount + partnerCat.baseAmount;
    const rolloverAmount = existing.rolloverAmount + partnerCat.rolloverAmount;
    const totalAmount = existing.totalAmount + partnerCat.totalAmount;
    const totalSpent = existing.totalSpent + partnerCat.totalSpent;
    const remaining = existing.remaining + partnerCat.remaining;
    const percentageUsed =
      totalAmount > 0 ? (totalSpent / totalAmount) * 100 : 0;

    map.set(partnerCat.categoryId, {
      categoryId: existing.categoryId,
      categoryName: existing.categoryName,
      categoryIcon: existing.categoryIcon ?? partnerCat.categoryIcon,
      baseAmount,
      rolloverAmount,
      totalAmount,
      totalSpent,
      remaining,
      percentageUsed,
      alertStatus: pickWorseStatus(existing.alertStatus, partnerCat.alertStatus),
      expenseCount: existing.expenseCount + partnerCat.expenseCount,
      topExpenses: [...existing.topExpenses, ...partnerCat.topExpenses],
    });
  }

  return Array.from(map.values());
}

function mergeReports(couple: CoupleReport): MonthlyReport {
  const me = couple.me;
  const partner = couple.partner;
  if (!partner) return me;

  return {
    userId: "both",
    userName: "Berdua",
    year: couple.year,
    month: couple.month,
    totalBudgeted: me.totalBudgeted + partner.totalBudgeted,
    totalRollover: me.totalRollover + partner.totalRollover,
    totalEffectiveBudget:
      me.totalEffectiveBudget + partner.totalEffectiveBudget,
    totalSpent: couple.combinedTotalSpent,
    totalRemaining: me.totalRemaining + partner.totalRemaining,
    overallPercentageUsed:
      couple.combinedTotalBudget > 0
        ? (couple.combinedTotalSpent / couple.combinedTotalBudget) * 100
        : 0,
    categories: mergeCategories(me.categories, partner.categories),
  };
}

interface UseReportsResult {
  report: MonthlyReport | null;
  isLoading: boolean;
  isError: boolean;
  noPartner: boolean;
  refetch: () => void;
  hasPartner: boolean | undefined;
}

export function useReports(scope: ReportScope): UseReportsResult {
  const monthly = useMonthlyReport();
  const couple = useCoupleReport();

  const noPartner = isNotFound(couple.error);
  const hasPartner = couple.isLoading
    ? undefined
    : !noPartner && couple.data?.partner !== null;

  if (scope === "me") {
    return {
      report: monthly.data ?? null,
      isLoading: monthly.isLoading,
      isError: monthly.isError,
      noPartner,
      refetch: () => {
        monthly.refetch();
        couple.refetch();
      },
      hasPartner,
    };
  }

  // partner / both: depend on couple
  if (couple.isLoading) {
    return {
      report: null,
      isLoading: true,
      isError: false,
      noPartner: false,
      refetch: () => couple.refetch(),
      hasPartner,
    };
  }

  if (noPartner || !couple.data || couple.data.partner === null) {
    return {
      report: null,
      isLoading: false,
      isError: false,
      noPartner: true,
      refetch: () => couple.refetch(),
      hasPartner: false,
    };
  }

  const report =
    scope === "partner" ? couple.data.partner : mergeReports(couple.data);

  return {
    report,
    isLoading: false,
    isError: couple.isError,
    noPartner: false,
    refetch: () => couple.refetch(),
    hasPartner: true,
  };
}

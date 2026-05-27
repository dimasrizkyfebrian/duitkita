import api from "@/lib/api";
import { API_ROUTES } from "@/lib/constants";
import type {
  MonthlyReport,
  CoupleReport,
  TrendItem,
  CategoryTrend,
  CategoryRolloverHistory,
  SpendingForecast,
  FinancialHealthScore,
} from "@/types";

export async function fetchMonthlyReport(
  year: number,
  month: number,
): Promise<MonthlyReport> {
  const res = await api.get<MonthlyReport>(API_ROUTES.reports.monthly, {
    params: { year, month },
  });
  return res.data;
}

export async function fetchCoupleReport(
  year: number,
  month: number,
): Promise<CoupleReport> {
  const res = await api.get<CoupleReport>(API_ROUTES.reports.couple, {
    params: { year, month },
  });
  return res.data;
}

export async function fetchTrend(monthsBack: number): Promise<TrendItem[]> {
  const res = await api.get<TrendItem[]>(API_ROUTES.reports.trend, {
    params: { monthsBack },
  });
  return res.data;
}

export async function fetchCategoryTrend(
  monthsBack: number,
): Promise<CategoryTrend[]> {
  const res = await api.get<CategoryTrend[]>(API_ROUTES.reports.categoryTrend, {
    params: { monthsBack },
  });
  return res.data;
}

export async function fetchRolloverHistory(
  categoryId: string,
  monthsBack: number,
): Promise<CategoryRolloverHistory> {
  const res = await api.get<CategoryRolloverHistory>(
    API_ROUTES.reports.rollover(categoryId),
    { params: { monthsBack } },
  );
  return res.data;
}

export async function fetchForecast(
  year: number,
  month: number,
  scope: "me" | "partner" | "both",
): Promise<SpendingForecast> {
  const res = await api.get<SpendingForecast>(API_ROUTES.reports.forecast, {
    params: { year, month, scope },
  });
  return res.data;
}

export async function fetchHealthScore(
  year: number,
  month: number,
  scope: "me" | "both",
): Promise<FinancialHealthScore> {
  const res = await api.get<FinancialHealthScore>(API_ROUTES.reports.healthScore, {
    params: { year, month, scope },
  });
  return res.data;
}

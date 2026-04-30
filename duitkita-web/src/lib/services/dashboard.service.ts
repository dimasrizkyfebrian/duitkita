import api from "@/lib/api";
import { API_ROUTES } from "@/lib/constants";
import type { MonthlyBudget, Activity } from "@/types";

export async function fetchBudgets(
  year: number,
  month: number,
): Promise<MonthlyBudget[]> {
  const response = await api.get<MonthlyBudget[]>(API_ROUTES.budgets.list, {
    params: { year, month },
  });
  return response.data;
}

export async function fetchRecentActivity(): Promise<Activity[]> {
  const response = await api.get<Activity[]>(API_ROUTES.activity.recent);
  return response.data;
}

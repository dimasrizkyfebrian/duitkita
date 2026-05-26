import api from "@/lib/api";
import { isApiError } from "@/lib/api-envelope";
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
  try {
    const response = await api.get(API_ROUTES.activity.recent);
    const payload = response.data;

    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object") {
      if (Array.isArray(payload.data)) return payload.data;
      if ("success" in payload && payload.data && Array.isArray(payload.data.data)) {
        return payload.data.data;
      }
    }
    return [];
  } catch (err) {
    if (isApiError(err) && err.code === "NOT_FOUND") {
      return [];
    }
    throw err;
  }
}

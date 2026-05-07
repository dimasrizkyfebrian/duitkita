import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/stores/app.store";
import { QUERY_KEYS } from "@/lib/constants";
import {
  fetchBudgets,
  fetchRecentActivity,
} from "@/lib/services/dashboard.service";
import type { MonthlyBudget } from "@/types";

const SEVERITY: Record<string, number> = { warning: 1, danger: 2, over: 3 };

function pickCriticalBudget(budgets: MonthlyBudget[]): MonthlyBudget | null {
  const alertable = budgets.filter((b) => b.alertStatus !== "ok");
  if (!alertable.length) return null;
  return alertable.reduce((acc, b) =>
    (SEVERITY[b.alertStatus] ?? 0) > (SEVERITY[acc.alertStatus] ?? 0) ? b : acc,
  );
}

export function useDashboard() {
  const { activeYear, activeMonth } = useAppStore();

  const budgetsQuery = useQuery({
    queryKey: QUERY_KEYS.budgets(activeYear, activeMonth),
    queryFn: () => fetchBudgets(activeYear, activeMonth),
  });

  const activityQuery = useQuery({
    queryKey: QUERY_KEYS.activityRecent(),
    queryFn: fetchRecentActivity,
  });

  const budgets = budgetsQuery.data ?? [];
  const activities = activityQuery.data ?? [];

  const totalBudget = budgets.reduce((s, b) => s + b.totalAmount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.totalSpent, 0);
  const totalRemaining = budgets.reduce((s, b) => s + b.remaining, 0);
  const criticalBudget = pickCriticalBudget(budgets);

  return {
    budgets,
    activities,
    totalBudget,
    totalSpent,
    totalRemaining,
    criticalBudget,
    isBudgetsLoading: budgetsQuery.isLoading,
    isActivityLoading: activityQuery.isLoading,
    isBudgetsError: budgetsQuery.isError,
    isActivityError: activityQuery.isError,
    isFetching: budgetsQuery.isRefetching || activityQuery.isRefetching,
    refetch: () => {
      budgetsQuery.refetch();
      activityQuery.refetch();
    },
  };
}

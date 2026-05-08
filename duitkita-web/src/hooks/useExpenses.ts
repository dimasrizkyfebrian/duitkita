import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app.store";
import { QUERY_KEYS } from "@/lib/constants";
import { isNotFound, getApiStatus } from "@/lib/utils";
import {
  createExpense,
  deleteExpense,
  fetchExpenses,
  fetchExpensesByBudget,
  fetchPartnerExpenses,
  updateExpense,
} from "@/lib/services/expense.service";
import type {
  CreateExpenseRequest,
  Expense,
  UpdateExpenseRequest,
} from "@/types";

export type ExpenseScope = "me" | "partner";

function invalidateAfterMutation(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["budgets"] });
  qc.invalidateQueries({ queryKey: ["expenses"] });
  qc.invalidateQueries({ queryKey: ["activity"] });
  qc.invalidateQueries({ queryKey: ["reports"] });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { closeExpenseSheet } = useAppStore();

  return useMutation({
    mutationFn: (data: CreateExpenseRequest) => createExpense(data),
    onSuccess: () => {
      invalidateAfterMutation(queryClient);
      toast.success("Pengeluaran tercatat!");
      closeExpenseSheet();
    },
    onError: (err: unknown) => {
      const status = getApiStatus(err);
      if (status === 404) toast.error("Anggaran atau kategori tidak ditemukan");
      else if (status === 400) toast.error("Data pengeluaran tidak valid, periksa kembali isian kamu");
      else toast.error("Gagal mencatat pengeluaran, coba beberapa saat lagi");
    },
  });
}

interface UseExpensesListResult {
  expenses: Expense[];
  isLoading: boolean;
  isError: boolean;
  noPartner: boolean;
  refetch: () => void;
}

export function useExpensesList(
  scope: ExpenseScope,
  categoryId?: string,
): UseExpensesListResult {
  const { activeYear, activeMonth } = useAppStore();

  const meQuery = useQuery({
    queryKey: QUERY_KEYS.expenses(activeYear, activeMonth, categoryId),
    queryFn: () => fetchExpenses(activeYear, activeMonth, categoryId),
    enabled: scope === "me",
  });

  const partnerQuery = useQuery({
    queryKey: QUERY_KEYS.expensesPartner(activeYear, activeMonth, categoryId),
    queryFn: () => fetchPartnerExpenses(activeYear, activeMonth, categoryId),
    enabled: scope === "partner",
    retry: (failureCount, error) =>
      isNotFound(error) ? false : failureCount < 1,
  });

  if (scope === "me") {
    return {
      expenses: meQuery.data ?? [],
      isLoading: meQuery.isLoading,
      isError: meQuery.isError,
      noPartner: false,
      refetch: () => meQuery.refetch(),
    };
  }

  const noPartner = isNotFound(partnerQuery.error);
  return {
    expenses: partnerQuery.data ?? [],
    isLoading: partnerQuery.isLoading,
    isError: partnerQuery.isError && !noPartner,
    noPartner,
    refetch: () => partnerQuery.refetch(),
  };
}

export function useExpensesByBudget(budgetId: string | null) {
  const query = useQuery({
    queryKey: QUERY_KEYS.expensesByBudget(budgetId ?? ""),
    queryFn: () => fetchExpensesByBudget(budgetId!),
    enabled: budgetId !== null,
  });

  return {
    expenses: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => query.refetch(),
  };
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateExpenseRequest }) =>
      updateExpense(id, payload),
    onSuccess: () => {
      invalidateAfterMutation(queryClient);
      toast.success("Pengeluaran diperbarui");
    },
    onError: (err: unknown) => {
      const status = getApiStatus(err);
      if (status === 404) toast.error("Pengeluaran tidak ditemukan");
      else if (status === 400) toast.error("Data pengeluaran tidak valid, periksa kembali isian kamu");
      else toast.error("Gagal memperbarui pengeluaran, coba beberapa saat lagi");
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      invalidateAfterMutation(queryClient);
      toast.success("Pengeluaran dihapus");
    },
    onError: (err: unknown) => {
      const status = getApiStatus(err);
      if (status === 404) toast.error("Pengeluaran tidak ditemukan");
      else toast.error("Gagal menghapus pengeluaran, coba beberapa saat lagi");
    },
  });
}

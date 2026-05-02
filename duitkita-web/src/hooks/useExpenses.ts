import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app.store";
import { QUERY_KEYS } from "@/lib/constants";
import { createExpense } from "@/lib/services/expense.service";
import type { CreateExpenseRequest } from "@/types";

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { activeYear, activeMonth, closeExpenseSheet } = useAppStore();

  return useMutation({
    mutationFn: (data: CreateExpenseRequest) => createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.budgets(activeYear, activeMonth),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.activityRecent(),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.expenses(activeYear, activeMonth),
      });
      toast.success("Pengeluaran tercatat!");
      closeExpenseSheet();
    },
    onError: () => {
      toast.error("Gagal mencatat pengeluaran");
    },
  });
}

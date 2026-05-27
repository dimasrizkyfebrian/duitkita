import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/lib/constants";
import { getApiErrorCode, apiErrorToast } from "@/lib/utils";
import {
  fetchRecurringExpenses,
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  pauseRecurringExpense,
  resumeRecurringExpense,
  runDueRecurringExpenses,
} from "@/lib/services/recurring-expense.service";
import type {
  CreateRecurringExpenseRequest,
  UpdateRecurringExpenseRequest,
} from "@/types";

export function useRecurringExpenses() {
  const qc = useQueryClient();

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.recurring() });
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["budgets"] });
    qc.invalidateQueries({ queryKey: ["activity"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
  };

  const listQuery = useQuery({
    queryKey: QUERY_KEYS.recurring(),
    queryFn: fetchRecurringExpenses,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateRecurringExpenseRequest) =>
      createRecurringExpense(payload),
    onSuccess: () => {
      invalidateAll();
      toast.success("Pengeluaran rutin berhasil ditambahkan");
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "NOT_FOUND") toast.error("Kategori tidak ditemukan");
      else if (code === "VALIDATION_ERROR" || code === "BAD_REQUEST")
        toast.error("Data tidak valid, periksa kembali");
      else toast.error(...apiErrorToast(err, "Gagal menambahkan pengeluaran rutin"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRecurringExpenseRequest }) =>
      updateRecurringExpense(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.recurring() });
      toast.success("Pengeluaran rutin berhasil diperbarui");
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "NOT_FOUND") toast.error("Pengeluaran rutin tidak ditemukan");
      else if (code === "VALIDATION_ERROR" || code === "BAD_REQUEST")
        toast.error("Data tidak valid");
      else toast.error(...apiErrorToast(err, "Gagal memperbarui pengeluaran rutin"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRecurringExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.recurring() });
      toast.success("Pengeluaran rutin berhasil dihapus");
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "NOT_FOUND") toast.error("Pengeluaran rutin tidak ditemukan");
      else toast.error(...apiErrorToast(err, "Gagal menghapus pengeluaran rutin"));
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => pauseRecurringExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.recurring() });
      toast.success("Pengeluaran rutin dijeda");
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "NOT_FOUND") toast.error("Pengeluaran rutin tidak ditemukan");
      else if (code === "CONFLICT") toast.error("Sudah dijeda sebelumnya");
      else toast.error(...apiErrorToast(err, "Gagal menjeda pengeluaran rutin"));
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => resumeRecurringExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.recurring() });
      toast.success("Pengeluaran rutin diaktifkan kembali");
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "NOT_FOUND") toast.error("Pengeluaran rutin tidak ditemukan");
      else if (code === "CONFLICT") toast.error("Sudah aktif");
      else toast.error(...apiErrorToast(err, "Gagal mengaktifkan pengeluaran rutin"));
    },
  });

  const runDueMutation = useMutation({
    mutationFn: runDueRecurringExpenses,
    onSuccess: (result) => {
      invalidateAll();
      if (result.succeeded > 0) {
        toast.success(`${result.succeeded} pengeluaran berhasil diproses`);
      } else {
        toast.info("Tidak ada pengeluaran jatuh tempo");
      }
    },
    onError: (err: unknown) => {
      toast.error(...apiErrorToast(err, "Gagal memproses pengeluaran jatuh tempo"));
    },
  });

  return {
    recurringExpenses: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    // mutations
    createRecurring: createMutation.mutateAsync,
    updateRecurring: updateMutation.mutateAsync,
    deleteRecurring: deleteMutation.mutateAsync,
    pauseRecurring: pauseMutation.mutateAsync,
    resumeRecurring: resumeMutation.mutateAsync,
    runDue: runDueMutation.mutateAsync,
    // pending states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isPausing: pauseMutation.isPending,
    isResuming: resumeMutation.isPending,
    isRunningDue: runDueMutation.isPending,
    pausingId: pauseMutation.variables ?? null,
    resumingId: resumeMutation.variables ?? null,
    deletingId: deleteMutation.variables ?? null,
  };
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app.store";
import { QUERY_KEYS } from "@/lib/constants";
import { isNotFound, getApiErrorCode, apiErrorToast } from "@/lib/utils";
import {
  fetchBudgets,
  fetchBudgetById,
  fetchPartnerBudgets,
  fetchCategories,
  createBudget,
  updateBudget,
  deleteBudget,
  finalizeBudgets,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/services/budget.service";
import type {
  CreateBudgetRequest,
  UpdateBudgetRequest,
  CreateCategoryRequest,
  MonthlyBudget,
} from "@/types";

export function useBudget() {
  const { activeYear, activeMonth } = useAppStore();
  const qc = useQueryClient();

  const budgetsQuery = useQuery({
    queryKey: QUERY_KEYS.budgets(activeYear, activeMonth),
    queryFn: () => fetchBudgets(activeYear, activeMonth),
  });

  const categoriesQuery = useQuery({
    queryKey: QUERY_KEYS.categories(),
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  });

  const invalidateBudgets = () =>
    qc.invalidateQueries({
      queryKey: QUERY_KEYS.budgets(activeYear, activeMonth),
    });

  const invalidateCategories = () =>
    qc.invalidateQueries({ queryKey: QUERY_KEYS.categories() });

  // ── Budget mutations ────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (payload: CreateBudgetRequest) => createBudget(payload),
    onSuccess: () => {
      invalidateBudgets();
      toast.success("Anggaran berhasil ditambahkan");
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "FORBIDDEN") toast.error("Bulan ini sudah dikunci, tidak dapat menambah anggaran");
      else if (code === "CONFLICT") toast.error("Anggaran untuk kategori ini di bulan ini sudah ada");
      else if (code === "NOT_FOUND") toast.error("Kategori tidak ditemukan atau bukan milikmu");
      else if (code === "VALIDATION_ERROR" || code === "BAD_REQUEST") toast.error("Data anggaran tidak valid, periksa kembali isian kamu");
      else toast.error(...apiErrorToast(err, "Gagal menambahkan anggaran, coba beberapa saat lagi"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateBudgetRequest;
    }) => updateBudget(id, payload),
    onSuccess: () => {
      invalidateBudgets();
      toast.success("Anggaran berhasil diperbarui");
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "FORBIDDEN") toast.error("Anggaran yang sudah dikunci tidak dapat diubah");
      else if (code === "NOT_FOUND") toast.error("Anggaran tidak ditemukan");
      else if (code === "VALIDATION_ERROR" || code === "BAD_REQUEST") toast.error("Nominal anggaran tidak valid");
      else toast.error(...apiErrorToast(err, "Gagal memperbarui anggaran, coba beberapa saat lagi"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => {
      invalidateBudgets();
      toast.success("Anggaran berhasil dihapus");
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "FORBIDDEN") toast.error("Anggaran tidak dapat dihapus karena sudah ada pengeluaran yang tercatat");
      else if (code === "NOT_FOUND") toast.error("Anggaran tidak ditemukan");
      else toast.error(...apiErrorToast(err, "Gagal menghapus anggaran, coba beberapa saat lagi"));
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: () => finalizeBudgets(activeYear, activeMonth),
    onSuccess: () => {
      invalidateBudgets();
      toast.success("Anggaran bulan ini telah dikunci");
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "CONFLICT" || code === "BAD_REQUEST") toast.error("Anggaran bulan ini sudah pernah dikunci sebelumnya");
      else toast.error(...apiErrorToast(err, "Gagal mengunci anggaran, coba beberapa saat lagi"));
    },
  });

  // ── Category mutations ──────────────────────────────────────────────

  const addCategoryMutation = useMutation({
    mutationFn: (payload: CreateCategoryRequest) => createCategory(payload),
    onSuccess: () => {
      invalidateCategories();
      toast.success("Kategori berhasil ditambahkan");
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "VALIDATION_ERROR" || code === "BAD_REQUEST") toast.error("Nama kategori tidak valid atau terlalu panjang");
      else toast.error(...apiErrorToast(err, "Gagal menambahkan kategori, coba beberapa saat lagi"));
    },
  });

  const editCategoryMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateCategoryRequest }) =>
      updateCategory(id, payload),
    onSuccess: () => {
      invalidateCategories();
      // also re-fetch budgets so category names in budget list refresh
      invalidateBudgets();
      toast.success("Kategori berhasil diperbarui");
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "NOT_FOUND") toast.error("Kategori tidak ditemukan");
      else if (code === "VALIDATION_ERROR" || code === "BAD_REQUEST") toast.error("Nama kategori tidak valid atau terlalu panjang");
      else toast.error(...apiErrorToast(err, "Gagal memperbarui kategori, coba beberapa saat lagi"));
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      invalidateCategories();
      toast.success("Kategori berhasil dihapus");
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "CONFLICT") toast.error("Kategori tidak dapat dihapus karena sudah digunakan oleh anggaran atau pengeluaran");
      else if (code === "NOT_FOUND") toast.error("Kategori tidak ditemukan");
      else toast.error(...apiErrorToast(err, "Gagal menghapus kategori, coba beberapa saat lagi"));
    },
  });

  const budgets = budgetsQuery.data ?? [];

  return {
    // data
    budgets,
    categories: categoriesQuery.data ?? [],
    activeYear,
    activeMonth,
    // query state
    isLoading: budgetsQuery.isLoading,
    isError: budgetsQuery.isError,
    isCategoriesLoading: categoriesQuery.isLoading,
    refetch: budgetsQuery.refetch,
    // derived
    isFinalized: budgets.some((b) => b.isFinalized),
    totalBudget: budgets.reduce((s, b) => s + b.totalAmount, 0),
    totalSpent: budgets.reduce((s, b) => s + b.totalSpent, 0),
    // budget mutations
    addBudget: createMutation.mutateAsync,
    editBudget: updateMutation.mutateAsync,
    removeBudget: deleteMutation.mutateAsync,
    finalizeBudgets: finalizeMutation.mutate,
    isAdding: createMutation.isPending,
    isEditing: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isFinalizing: finalizeMutation.isPending,
    // category mutations
    addCategory: addCategoryMutation.mutateAsync,
    editCategory: editCategoryMutation.mutateAsync,
    removeCategory: deleteCategoryMutation.mutateAsync,
    isAddingCategory: addCategoryMutation.isPending,
    isEditingCategory: editCategoryMutation.isPending,
    isDeletingCategory: deleteCategoryMutation.isPending,
  };
}

export function useBudgetById(id: string | null) {
  const query = useQuery({
    queryKey: QUERY_KEYS.budgetDetail(id ?? ""),
    queryFn: () => fetchBudgetById(id!),
    enabled: id !== null,
  });

  return {
    budget: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    isNotFound: isNotFound(query.error),
    refetch: () => query.refetch(),
  };
}

interface UsePartnerBudgetResult {
  budgets: MonthlyBudget[];
  isLoading: boolean;
  isError: boolean;
  noPartner: boolean;
  refetch: () => void;
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
}

export function usePartnerBudget(enabled: boolean): UsePartnerBudgetResult {
  const { activeYear, activeMonth } = useAppStore();

  const query = useQuery({
    queryKey: QUERY_KEYS.budgetsPartner(activeYear, activeMonth),
    queryFn: () => fetchPartnerBudgets(activeYear, activeMonth),
    enabled,
    retry: (failureCount, error) =>
      isNotFound(error) ? false : failureCount < 1,
  });

  const noPartner = isNotFound(query.error);
  const budgets = query.data ?? [];

  return {
    budgets,
    isLoading: query.isLoading,
    isError: query.isError && !noPartner,
    noPartner,
    refetch: () => query.refetch(),
    totalBudget: budgets.reduce((s, b) => s + b.totalAmount, 0),
    totalSpent: budgets.reduce((s, b) => s + b.totalSpent, 0),
    totalRemaining: budgets.reduce((s, b) => s + b.remaining, 0),
  };
}

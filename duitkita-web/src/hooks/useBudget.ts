import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app.store";
import { QUERY_KEYS } from "@/lib/constants";
import { isNotFound } from "@/lib/utils";
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
    onError: () => toast.error("Gagal menambahkan anggaran"),
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
    onError: () => toast.error("Gagal memperbarui anggaran"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => {
      invalidateBudgets();
      toast.success("Anggaran berhasil dihapus");
    },
    onError: () => toast.error("Gagal menghapus anggaran"),
  });

  const finalizeMutation = useMutation({
    mutationFn: () => finalizeBudgets(activeYear, activeMonth),
    onSuccess: () => {
      invalidateBudgets();
      toast.success("Anggaran bulan ini telah dikunci");
    },
    onError: () => toast.error("Gagal mengunci anggaran"),
  });

  // ── Category mutations ──────────────────────────────────────────────

  const addCategoryMutation = useMutation({
    mutationFn: (payload: CreateCategoryRequest) => createCategory(payload),
    onSuccess: () => {
      invalidateCategories();
      toast.success("Kategori berhasil ditambahkan");
    },
    onError: () => toast.error("Gagal menambahkan kategori"),
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
    onError: () => toast.error("Gagal memperbarui kategori"),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      invalidateCategories();
      toast.success("Kategori berhasil dihapus");
    },
    onError: () => toast.error("Gagal menghapus kategori"),
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

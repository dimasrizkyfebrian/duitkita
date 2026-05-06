"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/stores/app.store";
import { useCategories } from "@/hooks/useCategories";
import {
  useDeleteExpense,
  useExpensesList,
  type ExpenseScope,
} from "@/hooks/useExpenses";
import { ExpenseListPageHeader } from "@/components/features/expenses/ExpenseListPageHeader";
import { ExpenseScopeTabs } from "@/components/features/expenses/ExpenseScopeTabs";
import { ExpenseFilterBar } from "@/components/features/expenses/ExpenseFilterBar";
import { ExpenseList } from "@/components/features/expenses/ExpenseList";
import { ExpenseListSkeleton } from "@/components/features/expenses/ExpenseListSkeleton";
import { ExpenseListEmptyState } from "@/components/features/expenses/ExpenseListEmptyState";
import { EditExpenseSheet } from "@/components/features/expenses/EditExpenseSheet";
import { DeleteExpenseDialog } from "@/components/features/expenses/DeleteExpenseDialog";
import { ReportPageHeader } from "@/components/features/reports/ReportPageHeader";
import { NoPartnerState } from "@/components/shared/NoPartnerState";
import type { Expense } from "@/types";

export default function ExpensesPage() {
  const { activeYear, activeMonth, setActiveMonth } = useAppStore();
  const [scope, setScope] = useState<ExpenseScope>("me");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  const { categories } = useCategories();
  const { expenses, isLoading, isError, noPartner, refetch } = useExpensesList(
    scope,
    categoryId ?? undefined,
  );
  const { mutateAsync: deleteMutate, isPending: isDeleting } =
    useDeleteExpense();

  function handlePrevMonth() {
    if (activeMonth === 1) setActiveMonth(activeYear - 1, 12);
    else setActiveMonth(activeYear, activeMonth - 1);
  }

  function handleNextMonth() {
    if (activeMonth === 12) setActiveMonth(activeYear + 1, 1);
    else setActiveMonth(activeYear, activeMonth + 1);
  }

  function handleScopeChange(next: ExpenseScope) {
    setScope(next);
    setCategoryId(null);
  }

  async function handleConfirmDelete() {
    if (!deletingExpense) return;
    try {
      await deleteMutate(deletingExpense.id);
      setDeletingExpense(null);
    } catch {
      // toast handled by mutation onError
    }
  }

  const showActions = scope === "me";
  const hasFilter = categoryId !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full pt-4 pb-6 space-y-4"
    >
      <div className="px-4 space-y-3">
        <ExpenseListPageHeader />
        <ExpenseScopeTabs
          scope={scope}
          onScopeChange={handleScopeChange}
          noPartner={noPartner}
        />
        <ReportPageHeader
          year={activeYear}
          month={activeMonth}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />
        <ExpenseFilterBar
          categories={categories}
          selectedCategoryId={categoryId}
          onSelect={setCategoryId}
        />
      </div>

      <div className="px-4 space-y-3">
        {scope === "partner" && noPartner ? (
          <NoPartnerState description="Hubungkan akun pasangan untuk lihat pengeluaran berdua." />
        ) : isLoading ? (
          <ExpenseListSkeleton />
        ) : isError ? (
          <div className="bg-card rounded-2xl py-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Gagal memuat pengeluaran.
            </p>
            <button
              onClick={refetch}
              className="text-xs text-primary font-medium"
            >
              Coba lagi
            </button>
          </div>
        ) : expenses.length === 0 ? (
          <ExpenseListEmptyState variant={hasFilter ? "filter" : "month"} />
        ) : (
          <ExpenseList
            expenses={expenses}
            showActions={showActions}
            onEdit={setEditingExpense}
            onDelete={setDeletingExpense}
          />
        )}
      </div>

      <EditExpenseSheet
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
      />

      <DeleteExpenseDialog
        expense={deletingExpense}
        onOpenChange={(open) => !open && setDeletingExpense(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </motion.div>
  );
}

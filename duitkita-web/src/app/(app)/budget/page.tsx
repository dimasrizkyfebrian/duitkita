"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Wallet } from "lucide-react";
import { useBudget } from "@/hooks/useBudget";
import { useAppStore } from "@/stores/app.store";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BudgetPageHeader } from "@/components/features/budget/BudgetPageHeader";
import { BudgetCard } from "@/components/features/budget/BudgetCard";
import { BudgetFormSheet } from "@/components/features/budget/BudgetFormSheet";
import { DeleteBudgetDialog } from "@/components/features/budget/DeleteBudgetDialog";
import { CategoryManager } from "@/components/features/budget/CategoryManager";
import {
  BudgetHeaderSkeleton,
  BudgetListSkeleton,
} from "@/components/features/budget/BudgetSkeleton";
import type { MonthlyBudget, CreateCategoryRequest } from "@/types";
import type { BudgetFormValues } from "@/components/features/budget/BudgetFormSheet";

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

function EmptyState() {
  return (
    <div className="text-center py-10 space-y-3">
      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
        <Wallet size={20} className="text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Belum ada anggaran</p>
        <p className="text-xs text-muted-foreground">
          Tambahkan anggaran untuk bulan ini
        </p>
      </div>
    </div>
  );
}

export default function BudgetPage() {
  const { setActiveMonth } = useAppStore();
  const [sheetMode, setSheetMode] = useState<"add" | "edit" | null>(null);
  const [editingBudget, setEditingBudget] = useState<MonthlyBudget | null>(
    null,
  );
  const [deletingBudget, setDeletingBudget] = useState<MonthlyBudget | null>(
    null,
  );

  const {
    budgets,
    categories,
    activeYear,
    activeMonth,
    isLoading,
    isError,
    isCategoriesLoading,
    refetch,
    isFinalized,
    totalBudget,
    totalSpent,
    addBudget,
    editBudget,
    removeBudget,
    finalizeBudgets,
    isAdding,
    isEditing,
    isDeleting,
    isFinalizing,
    addCategory,
    editCategory,
    removeCategory,
    isAddingCategory,
    isEditingCategory,
  } = useBudget();

  function handlePrevMonth() {
    if (activeMonth === 1) setActiveMonth(activeYear - 1, 12);
    else setActiveMonth(activeYear, activeMonth - 1);
  }

  function handleNextMonth() {
    if (activeMonth === 12) setActiveMonth(activeYear + 1, 1);
    else setActiveMonth(activeYear, activeMonth + 1);
  }

  function handleEditOpen(budget: MonthlyBudget) {
    setEditingBudget(budget);
    setSheetMode("edit");
  }

  function handleSheetClose(open: boolean) {
    if (!open) {
      setSheetMode(null);
      setEditingBudget(null);
    }
  }

  async function handleFormSubmit(values: BudgetFormValues) {
    const baseAmount = parseInt(values.baseAmount.replace(/\D/g, ""), 10);
    try {
      if (sheetMode === "add") {
        await addBudget({
          categoryId: values.categoryId,
          year: activeYear,
          month: activeMonth,
          baseAmount,
        });
        setSheetMode(null);
      } else if (sheetMode === "edit" && editingBudget) {
        await editBudget({ id: editingBudget.id, payload: { baseAmount } });
        setSheetMode(null);
        setEditingBudget(null);
      }
    } catch {
      // toast handled by mutation onError
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingBudget) return;
    try {
      await removeBudget(deletingBudget.id);
      setDeletingBudget(null);
    } catch {
      // toast handled by mutation onError
    }
  }

  async function handleAddCategory(payload: CreateCategoryRequest) {
    await addCategory(payload);
  }

  async function handleEditCategory(
    id: string,
    payload: CreateCategoryRequest,
  ) {
    await editCategory({ id, payload });
  }

  async function handleDeleteCategory(id: string) {
    await removeCategory(id);
  }

  const budgetedCategoryIds = budgets.map((b) => b.categoryId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full"
    >
      <div className="w-full pt-4">
        <div className="px-4">
          {/* Header: month nav + summary + finalize */}
          {isLoading ? (
            <BudgetHeaderSkeleton />
          ) : (
            <BudgetPageHeader
              year={activeYear}
              month={activeMonth}
              totalBudget={totalBudget}
              totalSpent={totalSpent}
              isFinalized={isFinalized}
              hasBudgets={budgets.length > 0}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onFinalize={finalizeBudgets}
              isFinalizing={isFinalizing}
            />
          )}
        </div>
      </div>

      <div className="px-4 pb-6 space-y-4">

        {/* Error state */}
        {isError && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Gagal memuat anggaran.
            </p>
            <button
              onClick={() => refetch()}
              className="text-xs text-primary mt-1 font-medium"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Budget section — consistent card container for both states */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeYear}-${activeMonth}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-full bg-card rounded-2xl overflow-hidden"
          >
            {isLoading ? (
              <BudgetListSkeleton />
            ) : budgets.length === 0 ? (
              <EmptyState />
            ) : (
              <motion.ul
                variants={listVariants}
                initial="hidden"
                animate="visible"
                className="divide-y divide-border"
              >
                {budgets.map((budget, i) => (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    index={i}
                    isFinalized={isFinalized}
                    onEdit={handleEditOpen}
                    onDelete={(b) => setDeletingBudget(b)}
                  />
                ))}
              </motion.ul>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Add budget button — always shown when not finalized */}
        {!isLoading && !isFinalized && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setSheetMode("add")}
          >
            <Plus size={16} />
            Tambah Anggaran
          </Button>
        )}

        {/* Category manager */}
        {!isLoading && (
          <>
            <Separator />
            <CategoryManager
              categories={categories}
              onAdd={handleAddCategory}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
              isSubmitting={isAddingCategory || isEditingCategory}
            />
          </>
        )}
      </div>

      <BudgetFormSheet
        open={sheetMode !== null}
        onOpenChange={handleSheetClose}
        mode={sheetMode ?? "add"}
        editingBudget={editingBudget}
        categories={categories}
        isCategoriesLoading={isCategoriesLoading}
        year={activeYear}
        month={activeMonth}
        onSubmit={handleFormSubmit}
        isSubmitting={isAdding || isEditing}
        budgetedCategoryIds={budgetedCategoryIds}
      />

      <DeleteBudgetDialog
        open={deletingBudget !== null}
        onOpenChange={(open) => !open && setDeletingBudget(null)}
        budget={deletingBudget}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </motion.div>
  );
}

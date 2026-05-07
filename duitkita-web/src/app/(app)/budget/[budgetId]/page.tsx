"use client";

import { use, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBudgetById } from "@/hooks/useBudget";
import {
  useDeleteExpense,
  useExpensesByBudget,
} from "@/hooks/useExpenses";
import { ExpenseList } from "@/components/features/expenses/ExpenseList";
import { ExpenseListSkeleton } from "@/components/features/expenses/ExpenseListSkeleton";
import { ExpenseListEmptyState } from "@/components/features/expenses/ExpenseListEmptyState";
import { EditExpenseSheet } from "@/components/features/expenses/EditExpenseSheet";
import { DeleteExpenseDialog } from "@/components/features/expenses/DeleteExpenseDialog";
import {
  cn,
  formatCurrency,
  formatCurrencyShort,
  getAlertBg,
  getAlertLabel,
  getMonthName,
  getProgressColor,
} from "@/lib/utils";
import type { Expense } from "@/types";

interface PageProps {
  params: Promise<{ budgetId: string }>;
}

export default function BudgetExpensesPage({ params }: PageProps) {
  const { budgetId } = use(params);
  const { budget, isLoading, isError, isNotFound } = useBudgetById(budgetId);
  const { expenses, isLoading: isExpensesLoading } =
    useExpensesByBudget(budgetId);
  const { mutateAsync: deleteMutate, isPending: isDeleting } =
    useDeleteExpense();

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  async function handleConfirmDelete() {
    if (!deletingExpense) return;
    try {
      await deleteMutate(deletingExpense.id);
      setDeletingExpense(null);
    } catch {
      // toast handled by mutation onError
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full pt-safe-top pb-6 space-y-4"
    >
      <div className="px-4">
        <div className="flex items-center gap-2">
          <Link href="/budget" aria-label="Kembali ke budget">
            <Button variant="ghost" size="icon-sm">
              <ChevronLeft size={18} />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">
            Detail Anggaran
          </h1>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {isLoading && <ExpenseListSkeleton rows={3} />}

        {isNotFound && (
          <div className="bg-card rounded-2xl py-8 px-6 text-center space-y-3">
            <p className="text-sm font-medium text-foreground">
              Anggaran tidak ditemukan
            </p>
            <Link href="/budget">
              <Button variant="outline" size="sm">
                Kembali
              </Button>
            </Link>
          </div>
        )}

        {!isLoading && !isNotFound && isError && (
          <div className="bg-card rounded-2xl py-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Gagal memuat anggaran.
            </p>
          </div>
        )}

        {budget && (
          <>
            <section className="bg-card rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl w-12 h-12 flex items-center justify-center bg-muted rounded-2xl shrink-0">
                  {budget.category.icon ??
                    budget.category.name[0].toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-foreground truncate">
                    {budget.category.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getMonthName(budget.month)} {budget.year}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    getAlertBg(budget.alertStatus),
                  )}
                >
                  {getAlertLabel(budget.alertStatus)}
                </span>
              </div>

              <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full",
                    getProgressColor(budget.alertStatus),
                  )}
                  initial={{ width: "0%" }}
                  animate={{ width: `${Math.min(budget.percentageUsed, 100)}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Anggaran</p>
                  <p
                    className="text-sm font-semibold text-foreground"
                    title={formatCurrency(budget.totalAmount)}
                  >
                    {formatCurrencyShort(budget.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Terpakai</p>
                  <p
                    className="text-sm font-semibold text-foreground"
                    title={formatCurrency(budget.totalSpent)}
                  >
                    {formatCurrencyShort(budget.totalSpent)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sisa</p>
                  <p
                    className="text-sm font-semibold text-foreground"
                    title={formatCurrency(budget.remaining)}
                  >
                    {formatCurrencyShort(budget.remaining)}
                  </p>
                </div>
              </div>

              {budget.rolloverAmount > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  + {formatCurrencyShort(budget.rolloverAmount)} saldo bulan
                  lalu
                </p>
              )}
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground px-1">
                Pengeluaran
              </h2>
              {isExpensesLoading ? (
                <ExpenseListSkeleton rows={4} />
              ) : expenses.length === 0 ? (
                <ExpenseListEmptyState />
              ) : (
                <ExpenseList
                  expenses={expenses}
                  showActions={!budget.isFinalized}
                  groupByDay={false}
                  onEdit={setEditingExpense}
                  onDelete={setDeletingExpense}
                />
              )}
            </section>
          </>
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

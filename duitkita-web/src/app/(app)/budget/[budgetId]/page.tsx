"use client";

import { use, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { CountUp } from "@/components/ui/count-up";
import { useBudgetById } from "@/hooks/useBudget";
import { useDeleteExpense, useExpensesByBudget } from "@/hooks/useExpenses";
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
  getProgressGradient,
} from "@/lib/utils";
import type { Expense } from "@/types";

interface PageProps {
  params: Promise<{ budgetId: string }>;
}

export default function BudgetExpensesPage({ params }: PageProps) {
  const { budgetId } = use(params);
  const { budget, isLoading, isError, isNotFound } = useBudgetById(budgetId);
  const { expenses, isLoading: isExpensesLoading } = useExpensesByBudget(budgetId);
  const { mutateAsync: deleteMutate, isPending: isDeleting } = useDeleteExpense();

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
    <>
      {/* ═══════════════════════════════════════════════════
          DESKTOP LAYOUT (lg+)
      ═══════════════════════════════════════════════════ */}
      <div className="hidden lg:block px-6 py-6 min-h-full">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/budget" aria-label="Kembali ke anggaran">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors">
              <ChevronLeft size={18} />
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-white">Detail Anggaran</h1>
        </div>

        {isLoading && (
          <div className="space-y-4">
            <div className="glass-card rounded-3xl p-6 space-y-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.06]" />
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-32 rounded bg-white/[0.06]" />
                  <div className="h-3 w-20 rounded bg-white/[0.06]" />
                </div>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06]" />
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-1.5 text-center">
                    <div className="h-3 w-14 rounded bg-white/[0.06] mx-auto" />
                    <div className="h-5 w-20 rounded bg-white/[0.06] mx-auto" />
                  </div>
                ))}
              </div>
            </div>
            <ExpenseListSkeleton rows={4} />
          </div>
        )}

        {isNotFound && (
          <div className="glass-card rounded-2xl py-12 px-6 text-center space-y-4">
            <p className="text-sm font-medium text-white/60">Anggaran tidak ditemukan</p>
            <Link href="/budget">
              <button className="px-4 py-2 rounded-xl text-sm font-medium text-white/70 border border-white/[0.14] hover:bg-white/[0.08] transition-colors">
                Kembali
              </button>
            </Link>
          </div>
        )}

        {!isLoading && !isNotFound && isError && (
          <div className="glass-card rounded-2xl py-10 text-center">
            <p className="text-sm text-white/45">Gagal memuat anggaran.</p>
          </div>
        )}

        {budget && (
          <div className="space-y-4">
            {/* Budget header card */}
            <SpotlightCard
              className="glass-card glass-card-accent rounded-3xl p-6 space-y-4"
              spotlightColor={
                budget.alertStatus === "over"
                  ? "rgba(220,38,38,0.12)"
                  : budget.alertStatus === "warning" || budget.alertStatus === "danger"
                    ? "rgba(217,119,6,0.12)"
                    : "rgba(139,43,226,0.12)"
              }
            >
              {/* Category + badge */}
              <div className="flex items-center gap-4">
                <span className="text-3xl w-14 h-14 flex items-center justify-center bg-white/[0.08] rounded-2xl shrink-0 select-none">
                  {budget.category.icon ?? budget.category.name[0].toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xl font-bold text-white truncate">{budget.category.name}</p>
                  <p className="text-sm text-white/40 mt-0.5">
                    {getMonthName(budget.month)} {budget.year}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-xs font-medium px-3 py-1 rounded-full shrink-0",
                    getAlertBg(budget.alertStatus),
                  )}
                >
                  {getAlertLabel(budget.alertStatus)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: getProgressGradient(budget.alertStatus) }}
                    initial={{ width: "0%" }}
                    animate={{ width: `${Math.min(budget.percentageUsed, 100)}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                  />
                </div>
                <p className="text-xs text-white/35">
                  {budget.percentageUsed.toFixed(0)}% terpakai
                </p>
              </div>

              {/* 3-col stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Anggaran", value: budget.totalAmount },
                  { label: "Terpakai", value: budget.totalSpent },
                  { label: "Sisa", value: budget.remaining },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/[0.04] rounded-xl px-3 py-2.5 text-center">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">{label}</p>
                    <p
                      className={cn(
                        "text-base font-bold mt-0.5",
                        label === "Sisa" && budget.remaining < 0 ? "text-red-400" : "text-white",
                      )}
                      title={formatCurrency(value)}
                    >
                      <CountUp value={value} formatter={formatCurrencyShort} duration={0.7} />
                    </p>
                  </div>
                ))}
              </div>

              {budget.rolloverAmount > 0 && (
                <p className="text-xs text-white/30 text-center">
                  + {formatCurrencyShort(budget.rolloverAmount)} saldo bulan lalu
                </p>
              )}
            </SpotlightCard>

            {/* Expense list */}
            <div className="glass-card glass-card-accent rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.07]">
                <Receipt size={13} className="text-purple-400" />
                <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                  Pengeluaran
                </h2>
              </div>
              {isExpensesLoading ? (
                <div className="p-4">
                  <ExpenseListSkeleton rows={4} />
                </div>
              ) : expenses.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-white/35">Belum ada pengeluaran untuk anggaran ini.</p>
                </div>
              ) : (
                <ExpenseList
                  expenses={expenses}
                  showActions={!budget.isFinalized}
                  groupByDay={false}
                  containerClassName="divide-y divide-white/[0.07]"
                  onEdit={setEditingExpense}
                  onDelete={setDeletingExpense}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════
          MOBILE LAYOUT (< lg) — unchanged
      ═══════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="lg:hidden w-full pt-safe-top pb-6 space-y-4"
      >
        <div className="px-4">
          <div className="flex items-center gap-2">
            <Link href="/budget" aria-label="Kembali ke budget">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors">
                <ChevronLeft size={18} />
              </button>
            </Link>
            <h1 className="text-xl font-bold text-white">Detail Anggaran</h1>
          </div>
        </div>

        <div className="px-4 space-y-4">
          {isLoading && <ExpenseListSkeleton rows={3} />}

          {isNotFound && (
            <div className="glass-card rounded-2xl py-8 px-6 text-center space-y-3">
              <p className="text-sm font-medium text-white">Anggaran tidak ditemukan</p>
              <Link href="/budget">
                <button className="px-4 py-2 rounded-xl text-sm font-medium text-white/65 border border-white/[0.14] hover:bg-white/[0.08] transition-colors">
                  Kembali
                </button>
              </Link>
            </div>
          )}

          {!isLoading && !isNotFound && isError && (
            <div className="glass-card rounded-2xl py-8 text-center">
              <p className="text-sm text-white/50">Gagal memuat anggaran.</p>
            </div>
          )}

          {budget && (
            <>
              <section className="glass-card glass-card-accent rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl w-12 h-12 flex items-center justify-center bg-white/[0.08] rounded-2xl shrink-0">
                    {budget.category.icon ?? budget.category.name[0].toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-white truncate">
                      {budget.category.name}
                    </p>
                    <p className="text-xs text-white/45">
                      {getMonthName(budget.month)} {budget.year}
                    </p>
                  </div>
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", getAlertBg(budget.alertStatus))}>
                    {getAlertLabel(budget.alertStatus)}
                  </span>
                </div>

                <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: getProgressGradient(budget.alertStatus) }}
                    initial={{ width: "0%" }}
                    animate={{ width: `${Math.min(budget.percentageUsed, 100)}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Anggaran", value: budget.totalAmount },
                    { label: "Terpakai", value: budget.totalSpent },
                    { label: "Sisa", value: budget.remaining },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-white/45">{label}</p>
                      <p className="text-sm font-semibold text-white" title={formatCurrency(value)}>
                        {formatCurrencyShort(value)}
                      </p>
                    </div>
                  ))}
                </div>

                {budget.rolloverAmount > 0 && (
                  <p className="text-xs text-white/35 text-center">
                    + {formatCurrencyShort(budget.rolloverAmount)} saldo bulan lalu
                  </p>
                )}
              </section>

              <section className="space-y-2">
                <h2 className="text-sm font-semibold text-white px-1">Pengeluaran</h2>
                {isExpensesLoading ? (
                  <ExpenseListSkeleton rows={4} />
                ) : expenses.length === 0 ? (
                  <ExpenseListEmptyState />
                ) : (
                  <ExpenseList
                    expenses={expenses}
                    showActions={!budget.isFinalized}
                    groupByDay={false}
                    containerClassName="glass-card glass-card-accent rounded-2xl divide-y divide-white/[0.07] overflow-hidden"
                    onEdit={setEditingExpense}
                    onDelete={setDeletingExpense}
                  />
                )}
              </section>
            </>
          )}
        </div>
      </motion.div>

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
    </>
  );
}

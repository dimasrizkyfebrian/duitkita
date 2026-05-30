"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, TrendingDown } from "lucide-react";
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
import { formatCurrency, formatCurrencyShort, getMonthName } from "@/lib/utils";
import type { Expense } from "@/types";

/* ─── Desktop summary sidebar ─────────────────────────────────────────────── */
function ExpenseSummary({ expenses, isLoading }: { expenses: Expense[]; isLoading: boolean }) {
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const count = expenses.length;

  // Per-category aggregation
  const catMap = new Map<string, { name: string; icon: string | null; total: number }>();
  for (const e of expenses) {
    const existing = catMap.get(e.categoryId);
    if (existing) {
      existing.total += Number(e.amount);
    } else {
      catMap.set(e.categoryId, {
        name: e.category.name,
        icon: e.category.icon ?? null,
        total: Number(e.amount),
      });
    }
  }
  const categories = Array.from(catMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const skeletonRows = (
    <div className="space-y-2.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/[0.08] shrink-0 animate-pulse" />
          <div className="flex-1 h-2 rounded bg-white/[0.08] animate-pulse" />
          <div className="w-10 h-2 rounded bg-white/[0.08] animate-pulse" />
        </div>
      ))}
    </div>
  );

  return (
    <div
      className="rounded-2xl p-5 space-y-5"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Total */}
      <div>
        <p className="text-[11px] font-medium text-white/45 uppercase tracking-wider mb-2">
          Total Bulan Ini
        </p>
        {isLoading ? (
          <div className="h-7 w-32 rounded bg-white/[0.08] animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-white leading-none">
            {formatCurrencyShort(total)}
          </p>
        )}
        {!isLoading && (
          <p className="text-xs text-white/40 mt-1">{count} transaksi</p>
        )}
      </div>

      {/* Category breakdown */}
      <div>
        <p className="text-[11px] font-medium text-white/45 uppercase tracking-wider mb-3">
          Per Kategori
        </p>
        {isLoading ? (
          skeletonRows
        ) : categories.length === 0 ? (
          <p className="text-xs text-white/35">Belum ada data.</p>
        ) : (
          <div className="space-y-2.5">
            {categories.map((cat) => {
              const pct = total > 0 ? (cat.total / total) * 100 : 0;
              return (
                <div key={cat.name}>
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="w-7 h-7 flex items-center justify-center bg-white/[0.08] rounded-lg text-sm shrink-0">
                      {cat.icon ?? cat.name[0].toUpperCase()}
                    </span>
                    <p className="flex-1 text-xs text-white/70 truncate">{cat.name}</p>
                    <p className="text-xs font-semibold text-white tabular-nums shrink-0">
                      {formatCurrencyShort(cat.total)}
                    </p>
                  </div>
                  <div className="ml-9 h-1 rounded-full bg-white/[0.08] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, #8b2be2, #e91e8c)" }}
                      initial={{ width: "0%" }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
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
  const { mutateAsync: deleteMutate, isPending: isDeleting } = useDeleteExpense();

  const now = new Date();
  const isCurrentMonth = activeYear === now.getFullYear() && activeMonth === now.getMonth() + 1;

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

  const listContent =
    scope === "partner" && noPartner ? (
      <NoPartnerState description="Hubungkan akun pasangan untuk lihat pengeluaran berdua." />
    ) : isLoading ? (
      <ExpenseListSkeleton />
    ) : isError ? (
      <div
        className="rounded-2xl py-8 text-center space-y-2"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <p className="text-sm text-white/45">Gagal memuat pengeluaran.</p>
        <button onClick={refetch} className="text-xs text-purple-400 font-medium hover:text-purple-300">
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
    );

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════
          DESKTOP LAYOUT (lg+)
      ═══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block px-6 py-6 min-h-full">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" aria-label="Kembali ke dashboard">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors">
                <ChevronLeft size={18} />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white leading-none">Pengeluaran</h1>
              <p className="text-white/45 text-sm mt-0.5">
                {getMonthName(activeMonth)} {activeYear}
              </p>
            </div>
          </div>
          <ExpenseScopeTabs
            scope={scope}
            onScopeChange={handleScopeChange}
            noPartner={noPartner}
            variant="glass"
          />
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-[1fr_288px] gap-5 items-start">
          {/* Left: month nav + filter + list */}
          <div className="space-y-4">
            {/* Month navigation pill */}
            <div
              className="rounded-2xl px-4 py-3 flex items-center justify-between"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
            >
              <button
                onClick={handlePrevMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
                aria-label="Bulan sebelumnya"
              >
                <ChevronLeft size={18} />
              </button>
              <p className="text-sm font-semibold text-white">
                {getMonthName(activeMonth)} {activeYear}
              </p>
              <button
                onClick={handleNextMonth}
                disabled={isCurrentMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors disabled:text-white/20 disabled:cursor-not-allowed"
                aria-label="Bulan berikutnya"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Category filter */}
            <ExpenseFilterBar
              categories={categories}
              selectedCategoryId={categoryId}
              onSelect={setCategoryId}
            />

            {/* Expense list */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${scope}-${activeYear}-${activeMonth}-${categoryId}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {listContent}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: sticky summary sidebar */}
          <div className="sticky top-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={14} className="text-white/40" />
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Ringkasan</p>
            </div>
            <ExpenseSummary expenses={expenses} isLoading={isLoading} />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MOBILE LAYOUT (< lg)
      ═══════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="lg:hidden w-full pt-safe-top pb-6 space-y-4"
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

        <div className="px-4 space-y-3">{listContent}</div>
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

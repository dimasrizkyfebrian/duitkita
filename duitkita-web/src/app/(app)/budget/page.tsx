"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Lock,
  Loader2,
  Plus,
  Repeat,
  Wallet,
} from "lucide-react";
import { useBudget, usePartnerBudget } from "@/hooks/useBudget";
import { useAppStore } from "@/stores/app.store";
import { Button } from "@/components/ui/button";
import { BorderGlow } from "@/components/ui/border-glow";
import { CountUp } from "@/components/ui/count-up";
import { BudgetPageHeader } from "@/components/features/budget/BudgetPageHeader";
import { ReportPageHeader } from "@/components/features/reports/ReportPageHeader";
import { BudgetCard } from "@/components/features/budget/BudgetCard";
import { BudgetDesktopCard } from "@/components/features/budget/BudgetDesktopCard";
import { BudgetDesktopPartnerCard } from "@/components/features/budget/BudgetDesktopPartnerCard";
import { BudgetFormSheet } from "@/components/features/budget/BudgetFormSheet";
import { DeleteBudgetDialog } from "@/components/features/budget/DeleteBudgetDialog";
import { CategoryManager } from "@/components/features/budget/CategoryManager";
import {
  PartnerBudgetTabs,
  type BudgetView,
} from "@/components/features/budget/PartnerBudgetTabs";
import { PartnerBudgetCard } from "@/components/features/budget/PartnerBudgetCard";
import { PartnerBudgetSummary } from "@/components/features/budget/PartnerBudgetSummary";
import { NoPartnerState } from "@/components/shared/NoPartnerState";
import {
  BudgetHeaderSkeleton,
  BudgetListSkeleton,
  BudgetDesktopGridSkeleton,
} from "@/components/features/budget/BudgetSkeleton";
import { formatCurrencyShort, formatCurrency, getMonthName, cn, clampYearMonth } from "@/lib/utils";
import type { MonthlyBudget, CreateCategoryRequest } from "@/types";
import type { BudgetFormValues } from "@/components/features/budget/BudgetFormSheet";

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

/* ─── Mobile empty states ─────────────────────────────────────────────────── */
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-10 px-4 space-y-3">
      <div className="w-12 h-12 bg-white/[0.08] rounded-full flex items-center justify-center mx-auto">
        <Wallet size={20} className="text-white/40" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-white">Belum ada anggaran</p>
        <p className="text-xs text-white/45">Tambahkan anggaran untuk bulan ini</p>
      </div>
      <button
        onClick={onAdd}
        className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #8b2be2, #e91e8c)" }}
      >
        <Plus size={14} className="inline mr-1.5 -mt-0.5" />
        Tambah Anggaran
      </button>
    </div>
  );
}

function PartnerEmptyMonth() {
  return (
    <div className="text-center py-10 px-4 space-y-3">
      <div className="w-12 h-12 bg-white/[0.08] rounded-full flex items-center justify-center mx-auto">
        <Wallet size={20} className="text-white/40" />
      </div>
      <p className="text-sm text-white/50">Belum ada anggaran pasangan untuk bulan ini.</p>
    </div>
  );
}

/* ─── Desktop-only sub-components ────────────────────────────────────────── */
function DesktopEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="col-span-2 glass-card rounded-2xl p-12 flex flex-col items-center justify-center gap-4 text-center">
      <div className="w-16 h-16 bg-purple-500/15 rounded-full flex items-center justify-center">
        <Wallet size={28} className="text-purple-400" />
      </div>
      <div>
        <p className="text-base font-semibold text-white">Belum ada anggaran</p>
        <p className="text-sm text-white/45 mt-1">Mulai atur keuangan bulanmu sekarang</p>
      </div>
      <button
        onClick={onAdd}
        className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #8b2be2, #e91e8c)" }}
      >
        + Tambah Anggaran
      </button>
    </div>
  );
}

function DesktopPartnerEmpty() {
  return (
    <div className="col-span-2 glass-card rounded-2xl p-12 flex flex-col items-center justify-center gap-3 text-center">
      <div className="w-14 h-14 bg-white/[0.06] rounded-full flex items-center justify-center">
        <Wallet size={24} className="text-white/40" />
      </div>
      <p className="text-sm text-white/45">Belum ada anggaran pasangan untuk bulan ini.</p>
    </div>
  );
}

interface BudgetDesktopSidebarProps {
  totalBudget: number;
  totalSpent: number;
  isFinalized: boolean;
  hasBudgets: boolean;
  onFinalize: () => void;
  isFinalizing: boolean;
  isLoading?: boolean;
}

function BudgetDesktopSidebar({
  totalBudget,
  totalSpent,
  isFinalized,
  hasBudgets,
  onFinalize,
  isFinalizing,
  isLoading,
}: BudgetDesktopSidebarProps) {
  const spentPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const totalRemaining = totalBudget - totalSpent;
  const isOver = totalRemaining < 0;

  const glowColor =
    spentPct >= 100 ? "0 72 60" :
    spentPct >= 80  ? "38 80 58" :
    "270 55 72";

  const glowColors: [string, string, string] =
    spentPct >= 100 ? ["#f87171", "#dc2626", "#fca5a5"] :
    spentPct >= 80  ? ["#fbbf24", "#d97706", "#fde68a"] :
    ["#c084fc", "#f472b6", "#8b5cf6"];

  return (
    <BorderGlow
      glowColor={glowColor}
      colors={glowColors}
      backgroundColor="rgba(20, 8, 50, 0.80)"
      borderRadius={16}
      glowRadius={32}
      edgeSensitivity={25}
      coneSpread={22}
      fillOpacity={0.35}
      animated
      style={{ borderRadius: 16 }}
    >
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={13} className="text-purple-400" />
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Ringkasan
            </h3>
          </div>
          {isFinalized && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/50">
              <Lock size={9} />
              Dikunci
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="space-y-2.5">
          {[
            { label: "Anggaran", value: totalBudget },
            { label: "Terpakai", value: totalSpent },
            { label: "Sisa", value: totalRemaining },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <p className="text-xs text-white/40">{label}</p>
              <p
                className={cn(
                  "text-sm font-bold",
                  label === "Sisa" && isOver ? "text-red-400" : "text-white",
                )}
                title={formatCurrency(value)}
              >
                {isLoading ? (
                  <span className="text-white/20">—</span>
                ) : (
                  <CountUp value={value} formatter={formatCurrencyShort} duration={0.8} />
                )}
              </p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background:
                  spentPct >= 100 ? "linear-gradient(90deg, #dc2626, #f87171)" :
                  spentPct >= 80  ? "linear-gradient(90deg, #d97706, #fbbf24)" :
                  "linear-gradient(90deg, #8b2be2, #c084fc)",
              }}
              initial={{ width: "0%" }}
              animate={{ width: `${spentPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <p className="text-[11px] text-white/30">{spentPct.toFixed(0)}% terpakai</p>
        </div>

        {/* Finalize button */}
        {!isFinalized && hasBudgets && (
          <button
            onClick={onFinalize}
            disabled={isFinalizing}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #8b2be2, #e91e8c)" }}
          >
            {isFinalizing ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            Kunci Bulan Ini
          </button>
        )}
      </div>
    </BorderGlow>
  );
}

function PartnerDesktopSidebar({
  totalBudget,
  totalSpent,
}: {
  totalBudget: number;
  totalSpent: number;
}) {
  const totalRemaining = totalBudget - totalSpent;
  const spentPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const isOver = totalRemaining < 0;

  return (
    <div className="glass-card glass-card-accent rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 size={13} className="text-purple-400" />
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
          Anggaran Pasangan
        </h3>
      </div>
      <div className="space-y-2.5">
        {[
          { label: "Anggaran", value: totalBudget },
          { label: "Terpakai", value: totalSpent },
          { label: "Sisa", value: totalRemaining },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <p className="text-xs text-white/40">{label}</p>
            <p
              className={cn(
                "text-sm font-bold",
                label === "Sisa" && isOver ? "text-red-400" : "text-white",
              )}
              title={formatCurrency(value)}
            >
              <CountUp value={value} formatter={formatCurrencyShort} duration={0.8} />
            </p>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                spentPct >= 100 ? "linear-gradient(90deg, #dc2626, #f87171)" :
                spentPct >= 80  ? "linear-gradient(90deg, #d97706, #fbbf24)" :
                "linear-gradient(90deg, #8b2be2, #c084fc)",
            }}
            initial={{ width: "0%" }}
            animate={{ width: `${spentPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <p className="text-[11px] text-white/30">{spentPct.toFixed(0)}% terpakai</p>
      </div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function BudgetPage() {
  const { activeYear, activeMonth, setActiveMonth } = useAppStore();
  const [view, setView] = useState<BudgetView>("me");
  const [sheetMode, setSheetMode] = useState<"add" | "edit" | null>(null);
  const [editingBudget, setEditingBudget] = useState<MonthlyBudget | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<MonthlyBudget | null>(null);

  const {
    budgets,
    categories,
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

  const partner = usePartnerBudget(view === "partner");

  const now = new Date();
  const isCurrentMonth = activeYear === now.getFullYear() && activeMonth === now.getMonth() + 1;

  function handlePrevMonth() {
    const { year, month } = clampYearMonth(
      activeMonth === 1 ? activeYear - 1 : activeYear,
      activeMonth === 1 ? 12 : activeMonth - 1,
    );
    setActiveMonth(year, month);
  }

  function handleNextMonth() {
    if (isCurrentMonth) return;
    const { year, month } = clampYearMonth(
      activeMonth === 12 ? activeYear + 1 : activeYear,
      activeMonth === 12 ? 1 : activeMonth + 1,
    );
    setActiveMonth(year, month);
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
        await addBudget({ categoryId: values.categoryId, year: activeYear, month: activeMonth, baseAmount });
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

  async function handleEditCategory(id: string, payload: CreateCategoryRequest) {
    await editCategory({ id, payload });
  }

  async function handleDeleteCategory(id: string) {
    await removeCategory(id);
  }

  const budgetedCategoryIds = budgets.map((b) => b.categoryId);

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════
          DESKTOP LAYOUT (lg+)
      ═══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block px-6 py-6 min-h-full">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Anggaran</h1>
            <p className="text-white/45 text-sm mt-0.5">
              {getMonthName(activeMonth)} {activeYear}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PartnerBudgetTabs
              view={view}
              onViewChange={setView}
              noPartner={partner.noPartner}
              variant="glass"
            />
            {view === "me" && isFinalized && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full glass-card text-white/60">
                <Lock size={11} />
                Bulan Dikunci
              </span>
            )}
          </div>
        </div>

        {/* 2-column grid */}
        <div className="grid grid-cols-[1fr_320px] gap-5 items-start">
          {/* ── LEFT: month nav + budget cards ── */}
          <div className="space-y-4">
            {/* Month navigation pill */}
            <div className="glass-card rounded-2xl px-4 py-3 flex items-center justify-between">
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

            {/* My budgets */}
            {view === "me" && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`desktop-me-${activeYear}-${activeMonth}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {isLoading ? (
                    <BudgetDesktopGridSkeleton />
                  ) : isError ? (
                    <div className="col-span-2 glass-card rounded-2xl p-8 text-center space-y-2">
                      <p className="text-sm text-white/45">Gagal memuat anggaran.</p>
                      <button onClick={() => refetch()} className="text-xs text-purple-400 font-medium hover:text-purple-300">
                        Coba lagi
                      </button>
                    </div>
                  ) : budgets.length === 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      <DesktopEmptyState onAdd={() => setSheetMode("add")} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {budgets.map((budget, i) => (
                        <BudgetDesktopCard
                          key={budget.id}
                          budget={budget}
                          index={i}
                          isFinalized={isFinalized}
                          onEdit={handleEditOpen}
                          onDelete={(b) => setDeletingBudget(b)}
                        />
                      ))}
                      {!isFinalized && (
                        <motion.button
                          onClick={() => setSheetMode("add")}
                          className="glass-card rounded-2xl p-4 flex flex-col items-center justify-center gap-3 min-h-[200px] hover:bg-white/[0.08] transition-colors group"
                          style={{ borderStyle: "dashed", borderColor: "rgba(255,255,255,0.12)" }}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          initial={{ opacity: 0, y: 10, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.28, delay: budgets.length * 0.04 }}
                        >
                          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                            <Plus size={20} className="text-purple-400" />
                          </div>
                          <p className="text-sm font-medium text-white/40 group-hover:text-white/65 transition-colors">
                            Tambah Anggaran
                          </p>
                        </motion.button>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}

            {/* Partner budgets */}
            {view === "partner" && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`desktop-partner-${activeYear}-${activeMonth}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {partner.noPartner ? (
                    <NoPartnerState description="Hubungkan akun pasangan untuk lihat anggaran berdua." />
                  ) : partner.isError ? (
                    <div className="glass-card rounded-2xl p-8 text-center space-y-2">
                      <p className="text-sm text-white/45">Gagal memuat anggaran pasangan.</p>
                      <button onClick={partner.refetch} className="text-xs text-purple-400 font-medium">Coba lagi</button>
                    </div>
                  ) : partner.isLoading ? (
                    <BudgetDesktopGridSkeleton />
                  ) : partner.budgets.length === 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      <DesktopPartnerEmpty />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {partner.budgets.map((budget, i) => (
                        <BudgetDesktopPartnerCard key={budget.id} budget={budget} index={i} />
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* ── RIGHT: sticky sidebar ── */}
          <div className="space-y-4 sticky top-6">
            {view === "me" ? (
              <BudgetDesktopSidebar
                totalBudget={totalBudget}
                totalSpent={totalSpent}
                isFinalized={isFinalized}
                hasBudgets={budgets.length > 0}
                onFinalize={finalizeBudgets}
                isFinalizing={isFinalizing}
                isLoading={isLoading}
              />
            ) : !partner.noPartner ? (
              <PartnerDesktopSidebar
                totalBudget={partner.totalBudget}
                totalSpent={partner.totalSpent}
              />
            ) : null}

            {/* Recurring link */}
            <Link
              href="/recurring"
              className="glass-card rounded-2xl px-4 py-3.5 flex items-center gap-3 hover:bg-white/[0.08] transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/25 transition-colors shrink-0">
                <Repeat size={16} className="text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Pengeluaran Rutin</p>
                <p className="text-xs text-white/40">Kelola tagihan &amp; langganan</p>
              </div>
              <ChevronRight size={15} className="text-white/25 shrink-0" />
            </Link>

            {/* Category Manager */}
            {view === "me" && !isLoading && (
              <div className="glass-card glass-card-accent rounded-2xl overflow-hidden">
                <CategoryManager
                  categories={categories}
                  onAdd={handleAddCategory}
                  onEdit={handleEditCategory}
                  onDelete={handleDeleteCategory}
                  isSubmitting={isAddingCategory || isEditingCategory}
                  variant="glass"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MOBILE LAYOUT (< lg) — unchanged
      ═══════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="lg:hidden w-full pt-safe-top pb-6 space-y-4"
      >
        <div className="px-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-white">Anggaran</h1>
            {view === "me" && isFinalized && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full glass-card text-white/55">
                <Lock size={12} />
                Bulan dikunci
              </span>
            )}
          </div>
          <PartnerBudgetTabs
            view={view}
            onViewChange={setView}
            noPartner={partner.noPartner}
            variant="glass"
          />
          {view === "me" ? (
            isLoading ? (
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
            )
          ) : (
            <ReportPageHeader
              year={activeYear}
              month={activeMonth}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
            />
          )}
        </div>

        <div className="px-4 space-y-4">
          {view === "me" ? (
            <>
              {isError && (
                <div className="text-center py-4">
                  <p className="text-sm text-white/50">Gagal memuat anggaran.</p>
                  <button onClick={() => refetch()} className="text-xs text-purple-400 mt-1 font-medium hover:text-purple-300">
                    Coba lagi
                  </button>
                </div>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeYear}-${activeMonth}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="w-full glass-card glass-card-accent rounded-2xl overflow-hidden"
                >
                  <div className="px-4 pt-4 pb-2">
                    <h2 className="text-sm font-semibold text-white">Anggaran per Kategori</h2>
                  </div>
                  {isLoading ? (
                    <BudgetListSkeleton />
                  ) : budgets.length === 0 ? (
                    <EmptyState onAdd={() => setSheetMode("add")} />
                  ) : (
                    <motion.ul
                      variants={listVariants}
                      initial="hidden"
                      animate="visible"
                      className="divide-y divide-white/[0.07]"
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
                      {!isFinalized && (
                        <li>
                          <button
                            type="button"
                            onClick={() => setSheetMode("add")}
                            className="w-full px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium text-purple-400 hover:bg-white/[0.04] transition-colors"
                          >
                            <Plus size={16} />
                            Tambah Anggaran
                          </button>
                        </li>
                      )}
                    </motion.ul>
                  )}
                </motion.div>
              </AnimatePresence>

              {!isLoading && (
                <div className="glass-card glass-card-accent rounded-2xl overflow-hidden">
                  <CategoryManager
                    categories={categories}
                    onAdd={handleAddCategory}
                    onEdit={handleEditCategory}
                    onDelete={handleDeleteCategory}
                    isSubmitting={isAddingCategory || isEditingCategory}
                    variant="glass"
                  />
                </div>
              )}

              <Link
                href="/recurring"
                className="glass-card rounded-2xl px-4 py-3.5 flex items-center gap-3 hover:bg-white/[0.08] transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/25 transition-colors shrink-0">
                  <Repeat size={16} className="text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">Pengeluaran Rutin</p>
                  <p className="text-xs text-white/45">Kelola tagihan &amp; langganan berulang</p>
                </div>
                <ChevronRight size={16} className="text-white/30 shrink-0" />
              </Link>
            </>
          ) : (
            <>
              {partner.noPartner ? (
                <NoPartnerState description="Hubungkan akun pasangan untuk lihat anggaran berdua." />
              ) : partner.isError ? (
                <div className="text-center py-4">
                  <p className="text-sm text-white/50">Gagal memuat anggaran pasangan.</p>
                  <button onClick={partner.refetch} className="text-xs text-purple-400 mt-1 font-medium hover:text-purple-300">
                    Coba lagi
                  </button>
                </div>
              ) : (
                <>
                  {partner.isLoading ? (
                    <BudgetHeaderSkeleton />
                  ) : (
                    <PartnerBudgetSummary
                      year={activeYear}
                      month={activeMonth}
                      totalBudget={partner.totalBudget}
                      totalSpent={partner.totalSpent}
                    />
                  )}

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`partner-${activeYear}-${activeMonth}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="w-full glass-card glass-card-accent rounded-2xl overflow-hidden"
                    >
                      <div className="px-4 pt-4 pb-2">
                        <h2 className="text-sm font-semibold text-white">Anggaran per Kategori</h2>
                      </div>
                      {partner.isLoading ? (
                        <BudgetListSkeleton />
                      ) : partner.budgets.length === 0 ? (
                        <PartnerEmptyMonth />
                      ) : (
                        <motion.ul
                          variants={listVariants}
                          initial="hidden"
                          animate="visible"
                          className="divide-y divide-white/[0.07]"
                        >
                          {partner.budgets.map((budget, i) => (
                            <PartnerBudgetCard key={budget.id} budget={budget} index={i} />
                          ))}
                        </motion.ul>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* ── Shared modals ─────────────────────────────────────────── */}
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
    </>
  );
}

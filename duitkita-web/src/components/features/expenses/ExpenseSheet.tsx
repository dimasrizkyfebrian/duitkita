"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAppStore } from "@/stores/app.store";
import { QUERY_KEYS } from "@/lib/constants";
import { fetchBudgets } from "@/lib/services/dashboard.service";
import { useCategories } from "@/hooks/useCategories";
import { useCreateExpense } from "@/hooks/useExpenses";
import { formatCurrency, getAlertColor, cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpenseNumpad } from "./ExpenseNumpad";
import { CategoryPicker } from "./CategoryPicker";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isDesktop;
}

const INPUT_CLASS =
  "flex-1 h-10 rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50";

export function ExpenseSheet() {
  const isOpen = useAppStore((s) => s.isExpenseSheetOpen);
  const closeSheet = useAppStore((s) => s.closeExpenseSheet);
  const storeCategoryId = useAppStore((s) => s.selectedCategoryId);
  const { activeYear, activeMonth } = useAppStore();
  const isDesktop = useIsDesktop();

  const [amountStr, setAmountStr] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayISO);

  const { categories, isLoading: isCatsLoading } = useCategories();
  const { mutate, isPending } = useCreateExpense();

  const budgetsQuery = useQuery({
    queryKey: QUERY_KEYS.budgets(activeYear, activeMonth),
    queryFn: () => fetchBudgets(activeYear, activeMonth),
    enabled: isOpen,
  });
  const budgets = budgetsQuery.data ?? [];
  const selectedBudget = budgets.find((b) => b.categoryId === selectedCategoryId);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      setAmountStr("");
      setNote("");
      setExpenseDate(todayISO());
      setSelectedCategoryId(storeCategoryId);
    }
  }, [isOpen, storeCategoryId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleSubmit() {
    if (!selectedCategoryId || !amountStr || Number(amountStr) === 0) return;
    mutate({
      categoryId: selectedCategoryId,
      amount: Number(amountStr),
      note: note.trim() || undefined,
      expenseDate,
    });
  }

  const canSubmit = !!selectedCategoryId && !!amountStr && Number(amountStr) > 0 && !isPending;
  const displayAmount = amountStr ? formatCurrency(Number(amountStr)) : "Rp 0";

  const formContent = (
    <div className="flex flex-col gap-4">
      {/* Category */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-white/50 uppercase tracking-wide">Kategori</p>
        <CategoryPicker
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
          isLoading={isCatsLoading}
        />
      </div>

      {/* Budget preview */}
      {selectedCategoryId && (
        <div className="text-sm">
          {selectedBudget ? (
            <span className={getAlertColor(selectedBudget.alertStatus)}>
              Sisa:{" "}
              <span className="font-semibold">{formatCurrency(selectedBudget.remaining)}</span>
            </span>
          ) : (
            <span className="text-white/40">Tidak ada anggaran untuk kategori ini bulan ini.</span>
          )}
        </div>
      )}

      {/* Amount display */}
      <div className="text-center py-2">
        <p className={amountStr ? "text-3xl font-bold text-white" : "text-3xl font-bold text-white/30"}>
          {displayAmount}
        </p>
      </div>

      {/* Numpad */}
      <ExpenseNumpad value={amountStr} onChange={setAmountStr} />

      {/* Note & date */}
      <div className="flex gap-2">
        <input
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          className={INPUT_CLASS}
        />
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Catatan..."
          maxLength={120}
          className={`${INPUT_CLASS} flex-[2]`}
        />
      </div>

      {/* Submit */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="w-full h-12 rounded-xl text-white font-semibold text-base disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #8b2be2, #e91e8c)" }}
      >
        {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan Pengeluaran"}
      </motion.button>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={(v) => !v && closeSheet()}>
        <DialogContent
          className="sm:max-w-[600px] border-white/[0.12] p-0 overflow-hidden"
          style={{ background: "rgba(18, 6, 46, 0.95)", backdropFilter: "blur(28px)" }}
        >
          {/* Hidden accessible title */}
          <DialogTitle className="sr-only">Catat Pengeluaran</DialogTitle>
          <DialogDescription className="sr-only">Form pencatatan pengeluaran baru</DialogDescription>

          <div className="flex">
            {/* Left column — category & meta */}
            <div className="flex-1 min-w-0 p-6 flex flex-col gap-5 border-r border-white/[0.08]">
              <div>
                <h2 className="text-white font-semibold text-base leading-none">Catat Pengeluaran</h2>
                <p className="text-white/40 text-xs mt-1.5">Masukkan pengeluaran baru</p>
              </div>

              {/* Category grid */}
              <div className="space-y-2">
                <p className="text-[11px] font-medium text-white/50 uppercase tracking-wider">Kategori</p>
                {isCatsLoading ? (
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 rounded-xl" />
                    ))}
                  </div>
                ) : categories.length === 0 ? (
                  <p className="text-sm text-white/40 py-2">Belum ada kategori. Tambahkan di halaman Budget.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {categories.map((cat) => {
                      const isSelected = cat.id === selectedCategoryId;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategoryId(cat.id)}
                          className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-xl transition-colors text-[11px] font-medium",
                            isSelected ? "text-white" : "bg-white/[0.06] text-white/60 hover:bg-white/[0.10]",
                          )}
                          style={isSelected ? { background: "linear-gradient(135deg, #8b2be2, #e91e8c)" } : undefined}
                        >
                          <span className="text-lg leading-none">{cat.icon ?? cat.name[0].toUpperCase()}</span>
                          <span className="leading-tight text-center line-clamp-1">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Budget preview */}
              <div className="min-h-[20px] text-xs">
                {selectedCategoryId && (
                  selectedBudget ? (
                    <span className={getAlertColor(selectedBudget.alertStatus)}>
                      Sisa anggaran:{" "}
                      <span className="font-semibold">{formatCurrency(selectedBudget.remaining)}</span>
                    </span>
                  ) : (
                    <span className="text-white/35">Tidak ada anggaran untuk kategori ini.</span>
                  )
                )}
              </div>

              {/* Date + note */}
              <div className="mt-auto space-y-2">
                <p className="text-[11px] font-medium text-white/50 uppercase tracking-wider">Detail</p>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full h-9 rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Catatan (opsional)..."
                  maxLength={120}
                  className="w-full h-9 rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
            </div>

            {/* Right column — numpad */}
            <div className="w-52 p-5 flex flex-col gap-3">
              {/* Amount display */}
              <div className="text-center py-2">
                <p className={cn(
                  "text-2xl font-bold leading-none",
                  amountStr ? "text-white" : "text-white/25",
                )}>
                  {displayAmount}
                </p>
              </div>

              {/* Compact numpad */}
              <ExpenseNumpad value={amountStr} onChange={setAmountStr} compact />

              {/* Submit */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                disabled={!canSubmit}
                onClick={handleSubmit}
                className="w-full h-10 rounded-xl text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity hover:opacity-90 mt-auto"
                style={{ background: "linear-gradient(135deg, #8b2be2, #e91e8c)" }}
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan Pengeluaran"}
              </motion.button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60"
            onClick={closeSheet}
          />

          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) closeSheet();
            }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md rounded-t-3xl flex flex-col"
            style={{
              maxHeight: "92dvh",
              background: "rgba(12, 4, 30, 0.97)",
              backdropFilter: "blur(24px)",
            }}
          >
            {/* Drag handle */}
            <div className="pt-3 pb-1 flex justify-center shrink-0">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            <div className="px-5 pb-8 flex flex-col gap-4 overflow-y-auto">
              <h2 className="text-base font-semibold text-white">Catat Pengeluaran</h2>
              {formContent}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

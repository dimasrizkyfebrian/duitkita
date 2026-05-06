"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/stores/app.store";
import { QUERY_KEYS } from "@/lib/constants";
import { fetchBudgets } from "@/lib/services/dashboard.service";
import { useCategories } from "@/hooks/useCategories";
import { useCreateExpense } from "@/hooks/useExpenses";
import { formatCurrency, getAlertColor } from "@/lib/utils";
import { ExpenseNumpad } from "./ExpenseNumpad";
import { CategoryPicker } from "./CategoryPicker";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export function ExpenseSheet() {
  const isOpen = useAppStore((s) => s.isExpenseSheetOpen);
  const closeSheet = useAppStore((s) => s.closeExpenseSheet);
  const storeCategoryId = useAppStore((s) => s.selectedCategoryId);
  const { activeYear, activeMonth } = useAppStore();

  const [amountStr, setAmountStr] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
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

  const selectedBudget = budgets.find(
    (b) => b.categoryId === selectedCategoryId,
  );

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

  const canSubmit =
    !!selectedCategoryId && !!amountStr && Number(amountStr) > 0 && !isPending;

  const displayAmount = amountStr
    ? formatCurrency(Number(amountStr))
    : "Rp 0";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={closeSheet}
          />

          {/* Sheet */}
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
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md bg-card rounded-t-3xl flex flex-col"
            style={{ maxHeight: "92dvh" }}
          >
            {/* Drag handle */}
            <div className="pt-3 pb-1 flex justify-center shrink-0">
              <div className="w-10 h-1 bg-muted rounded-full" />
            </div>

            <div className="px-5 pb-5 flex flex-col gap-4 overflow-y-auto">
              <h2 className="text-lg font-bold text-foreground">
                Catat Pengeluaran
              </h2>

              {/* Category picker */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Kategori
                </p>
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
                    <span
                      className={getAlertColor(selectedBudget.alertStatus)}
                    >
                      Sisa:{" "}
                      <span className="font-semibold">
                        {formatCurrency(selectedBudget.remaining)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Tidak ada anggaran untuk kategori ini bulan ini.
                    </span>
                  )}
                </div>
              )}

              {/* Amount display */}
              <div className="text-center py-2">
                <p
                  className={
                    amountStr
                      ? "text-3xl font-bold text-foreground"
                      : "text-3xl font-bold text-muted-foreground"
                  }
                >
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
                  className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Catatan..."
                  maxLength={120}
                  className="flex-[2] h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Submit */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                disabled={!canSubmit}
                onClick={handleSubmit}
                className="w-full h-12 rounded-xl bg-primary text-white font-semibold text-base disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Simpan Pengeluaran"
                )}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

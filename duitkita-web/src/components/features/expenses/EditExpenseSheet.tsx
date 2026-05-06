"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCategories } from "@/hooks/useCategories";
import { useUpdateExpense } from "@/hooks/useExpenses";
import { formatCurrency } from "@/lib/utils";
import { ExpenseNumpad } from "./ExpenseNumpad";
import { CategoryPicker } from "./CategoryPicker";
import type { Expense, UpdateExpenseRequest } from "@/types";

interface EditExpenseSheetProps {
  expense: Expense | null;
  onClose: () => void;
}

interface EditExpenseSheetInnerProps {
  expense: Expense;
  onClose: () => void;
}

function EditExpenseSheetInner({ expense, onClose }: EditExpenseSheetInnerProps) {
  const [amountStr, setAmountStr] = useState(() => String(expense.amount));
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    () => expense.categoryId,
  );
  const [note, setNote] = useState(() => expense.note ?? "");
  const [expenseDate, setExpenseDate] = useState(
    () => expense.expenseDate.split("T")[0],
  );

  const { categories, isLoading: isCatsLoading } = useCategories();
  const { mutateAsync, isPending } = useUpdateExpense();

  async function handleSubmit() {
    if (!selectedCategoryId || !amountStr || Number(amountStr) === 0) return;

    const payload: UpdateExpenseRequest = {};
    const amount = Number(amountStr);
    if (amount !== expense.amount) payload.amount = amount;
    if (selectedCategoryId !== expense.categoryId)
      payload.categoryId = selectedCategoryId;
    const trimmedNote = note.trim();
    if (trimmedNote !== (expense.note ?? "")) payload.note = trimmedNote;
    if (expenseDate !== expense.expenseDate.split("T")[0])
      payload.expenseDate = expenseDate;

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    try {
      await mutateAsync({ id: expense.id, payload });
      onClose();
    } catch {
      // toast handled by mutation onError
    }
  }

  const canSubmit =
    !!selectedCategoryId &&
    !!amountStr &&
    Number(amountStr) > 0 &&
    !isPending;

  const displayAmount = amountStr ? formatCurrency(Number(amountStr)) : "Rp 0";

  return (
    <>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
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
          if (info.offset.y > 100) onClose();
        }}
        className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md bg-card rounded-t-3xl flex flex-col"
        style={{ maxHeight: "92dvh" }}
      >
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>

        <div className="px-5 pb-5 flex flex-col gap-4 overflow-y-auto">
          <h2 className="text-lg font-bold text-foreground">
            Edit Pengeluaran
          </h2>

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

          <ExpenseNumpad value={amountStr} onChange={setAmountStr} />

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
              "Simpan Perubahan"
            )}
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

export function EditExpenseSheet({ expense, onClose }: EditExpenseSheetProps) {
  return (
    <AnimatePresence>
      {expense && (
        <EditExpenseSheetInner
          key={expense.id}
          expense={expense}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}

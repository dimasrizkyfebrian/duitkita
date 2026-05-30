"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useUpdateExpense } from "@/hooks/useExpenses";
import { formatCurrency } from "@/lib/utils";
import { ExpenseNumpad } from "./ExpenseNumpad";
import { CategoryPicker } from "./CategoryPicker";
import type { Expense, UpdateExpenseRequest } from "@/types";

const INPUT_CLASS =
  "flex-1 h-10 rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50";

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
  const [expenseDate, setExpenseDate] = useState(() => expense.expenseDate.split("T")[0]);

  const { categories, isLoading: isCatsLoading } = useCategories();
  const { mutateAsync, isPending } = useUpdateExpense();

  async function handleSubmit() {
    if (!selectedCategoryId || !amountStr || Number(amountStr) === 0) return;

    const payload: UpdateExpenseRequest = {};
    const amount = Number(amountStr);
    if (amount !== expense.amount) payload.amount = amount;
    if (selectedCategoryId !== expense.categoryId) payload.categoryId = selectedCategoryId;
    const trimmedNote = note.trim();
    if (trimmedNote !== (expense.note ?? "")) payload.note = trimmedNote;
    if (expenseDate !== expense.expenseDate.split("T")[0]) payload.expenseDate = expenseDate;

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

  const canSubmit = !!selectedCategoryId && !!amountStr && Number(amountStr) > 0 && !isPending;
  const displayAmount = amountStr ? formatCurrency(Number(amountStr)) : "Rp 0";

  return (
    <>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/60"
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
          <h2 className="text-base font-semibold text-white">Edit Pengeluaran</h2>

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
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan Perubahan"}
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
        <EditExpenseSheetInner key={expense.id} expense={expense} onClose={onClose} />
      )}
    </AnimatePresence>
  );
}

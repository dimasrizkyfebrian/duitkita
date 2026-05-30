"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Plus,
  ArrowLeft,
  Repeat,
  MoreVertical,
  Pencil,
  Pause,
  Play,
  Trash2,
  Loader2,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useRecurringExpenses } from "@/hooks/useRecurringExpenses";
import { useCategories } from "@/hooks/useCategories";
import {
  RecurringFormSheet,
  type RecurringFormValues,
} from "@/components/features/recurring/RecurringFormSheet";
import {
  cn,
  formatCurrency,
  formatScheduleLabel,
  formatFutureRelativeTime,
} from "@/lib/utils";
import type { RecurringExpense } from "@/types";

const RUN_DUE_THROTTLE_MS = 5 * 60 * 1000;
const RUN_DUE_LS_KEY = "duitkita-run-due-last";

function canRunDue(): boolean {
  try {
    const last = localStorage.getItem(RUN_DUE_LS_KEY);
    if (!last) return true;
    return Date.now() - Number(last) >= RUN_DUE_THROTTLE_MS;
  } catch {
    return true;
  }
}

function markRunDue() {
  try {
    localStorage.setItem(RUN_DUE_LS_KEY, String(Date.now()));
  } catch {
    /* noop */
  }
}

function RecurringSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="glass-card rounded-2xl p-4 space-y-2 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 bg-white/[0.08] rounded" />
            <div className="h-5 w-12 bg-white/[0.08] rounded-full" />
          </div>
          <div className="h-5 w-20 bg-white/[0.08] rounded" />
          <div className="h-3 w-36 bg-white/[0.08] rounded" />
        </div>
      ))}
    </div>
  );
}

export default function RecurringPage() {
  const router = useRouter();
  const {
    recurringExpenses,
    isLoading,
    createRecurring,
    updateRecurring,
    deleteRecurring,
    pauseRecurring,
    resumeRecurring,
    runDue,
    isCreating,
    isUpdating,
    isPausing,
    isResuming,
    isRunningDue,
    pausingId,
    resumingId,
    deletingId,
    isDeleting,
  } = useRecurringExpenses();

  const { categories, isLoading: isCategoriesLoading } = useCategories();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"add" | "edit">("add");
  const [editingItem, setEditingItem] = useState<RecurringExpense | null>(null);
  const [deleteDialogItem, setDeleteDialogItem] = useState<RecurringExpense | null>(null);
  const [runDueAllowed, setRunDueAllowed] = useState(canRunDue);

  function handleAdd() {
    setEditingItem(null);
    setSheetMode("add");
    setSheetOpen(true);
  }

  function handleEdit(item: RecurringExpense) {
    setEditingItem(item);
    setSheetMode("edit");
    setSheetOpen(true);
  }

  async function handleFormSubmit(values: RecurringFormValues) {
    const amount = parseInt(values.amount.replace(/\D/g, ""), 10);
    const scheduleDay = parseInt(values.scheduleDay, 10);

    if (sheetMode === "add") {
      await createRecurring({
        categoryId: values.categoryId,
        amount,
        scheduleType: values.scheduleType,
        scheduleDay,
        note: values.note || undefined,
      });
    } else if (editingItem) {
      await updateRecurring({
        id: editingItem.id,
        payload: {
          amount,
          scheduleType: values.scheduleType,
          scheduleDay,
          note: values.note || undefined,
        },
      });
    }
    setSheetOpen(false);
  }

  async function handlePause(id: string) {
    try { await pauseRecurring(id); } catch { /* toast in hook */ }
  }

  async function handleResume(id: string) {
    try { await resumeRecurring(id); } catch { /* toast in hook */ }
  }

  async function handleDeleteConfirm() {
    if (!deleteDialogItem) return;
    try {
      await deleteRecurring(deleteDialogItem.id);
      setDeleteDialogItem(null);
    } catch {
      /* toast in hook */
    }
  }

  const handleRunDue = useCallback(async () => {
    try {
      await runDue();
      markRunDue();
      setRunDueAllowed(false);
      setTimeout(() => setRunDueAllowed(canRunDue()), RUN_DUE_THROTTLE_MS);
    } catch {
      /* toast in hook */
    }
  }, [runDue]);

  const hasActive = recurringExpenses.some((r) => r.isActive);
  const anyBusy = isPausing || isResuming || isDeleting;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full pt-safe-top pb-6 space-y-4"
    >
      {/* Header */}
      <div className="px-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          aria-label="Kembali"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-white flex-1">Pengeluaran Rutin</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #8b2be2, #e91e8c)" }}
        >
          <Plus size={14} />
          Tambah
        </button>
      </div>

      <div className="px-4 space-y-3">
        {/* Run Due button */}
        {!isLoading && hasActive && (
          <button
            disabled={!runDueAllowed || isRunningDue}
            onClick={handleRunDue}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white/70 glass-card hover:bg-white/[0.08] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRunningDue ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Zap size={14} className="text-purple-400" />
            )}
            Proses Jatuh Tempo
          </button>
        )}

        {/* Content */}
        {isLoading ? (
          <RecurringSkeleton />
        ) : recurringExpenses.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto">
              <Repeat size={24} className="text-purple-400" />
            </div>
            <p className="text-sm text-white font-medium">
              Belum ada pengeluaran rutin
            </p>
            <p className="text-xs text-white/50">
              Buat pengeluaran otomatis untuk tagihan berulang
            </p>
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #8b2be2, #e91e8c)" }}
            >
              <Plus size={14} />
              Tambah Pengeluaran Rutin
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recurringExpenses.map((item) => {
              const isBusy =
                (isPausing && pausingId === item.id) ||
                (isResuming && resumingId === item.id) ||
                (isDeleting && deletingId === item.id);

              return (
                <div
                  key={item.id}
                  className="glass-card glass-card-accent rounded-2xl p-4 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">
                        {item.categoryName}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                          item.isActive
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-white/[0.08] text-white/50",
                        )}
                      >
                        {item.isActive ? "Aktif" : "Dijeda"}
                      </span>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          disabled={anyBusy}
                          aria-label="Menu"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors disabled:opacity-40"
                        >
                          {isBusy ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <MoreVertical size={14} />
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="min-w-[160px] border-white/[0.1]"
                        style={{ background: "rgba(15, 5, 40, 0.95)", backdropFilter: "blur(20px) saturate(180%)" }}
                      >
                        <DropdownMenuItem onClick={() => handleEdit(item)} className="gap-2">
                          <Pencil size={14} />
                          Edit
                        </DropdownMenuItem>
                        {item.isActive ? (
                          <DropdownMenuItem onClick={() => handlePause(item.id)} className="gap-2">
                            <Pause size={14} />
                            Jeda
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleResume(item.id)} className="gap-2">
                            <Play size={14} />
                            Aktifkan
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteDialogItem(item)}
                          className="gap-2"
                        >
                          <Trash2 size={14} />
                          Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <p className="text-base font-semibold text-white">
                    {formatCurrency(item.amount)}
                  </p>

                  <p className="text-xs text-white/50">
                    {formatScheduleLabel(item.scheduleType, item.scheduleDay)}
                    {item.note ? ` · ${item.note}` : ""}
                  </p>

                  <p className="text-xs text-white/40">
                    Berikutnya: {formatFutureRelativeTime(item.nextRunAt)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form sheet */}
      <RecurringFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={sheetMode}
        editingItem={editingItem}
        categories={categories}
        isCategoriesLoading={isCategoriesLoading}
        onSubmit={handleFormSubmit}
        isSubmitting={isCreating || isUpdating}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteDialogItem}
        onOpenChange={(open) => { if (!open) setDeleteDialogItem(null); }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-sm border-white/[0.12]"
          style={{ background: "rgba(18, 6, 46, 0.92)", backdropFilter: "blur(24px)" }}
        >
          <DialogTitle className="text-white">Hapus Pengeluaran Rutin</DialogTitle>
          <DialogDescription className="text-white/55">
            Hapus pengeluaran rutin{" "}
            <span className="font-semibold text-white">
              &quot;{deleteDialogItem?.categoryName}&quot;
            </span>
            ? Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
          <DialogFooter className="gap-2 border-t-0 bg-transparent flex-row justify-end">
            <DialogClose asChild>
              <button
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white/65 hover:text-white border border-white/[0.14] hover:bg-white/[0.08] transition-colors disabled:opacity-50"
              >
                Batal
              </button>
            </DialogClose>
            <button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500/75 hover:bg-red-500/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isDeleting && <Loader2 size={14} className="animate-spin" />}
              Hapus
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

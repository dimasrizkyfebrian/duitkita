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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useRecurringExpenses } from "@/hooks/useRecurringExpenses";
import { useCategories } from "@/hooks/useCategories";
import {
  RecurringFormSheet,
  type RecurringFormValues,
} from "@/components/features/recurring/RecurringFormSheet";
import {
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
        <div
          key={i}
          className="bg-card rounded-2xl ring-1 ring-foreground/10 p-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 bg-muted rounded animate-pulse" />
            <div className="h-5 w-12 bg-muted rounded-full animate-pulse" />
          </div>
          <div className="h-5 w-20 bg-muted rounded animate-pulse" />
          <div className="h-3 w-36 bg-muted rounded animate-pulse" />
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
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.back()}
          aria-label="Kembali"
        >
          <ArrowLeft size={18} />
        </Button>
        <h1 className="text-xl font-bold text-foreground flex-1">
          Pengeluaran Rutin
        </h1>
        <Button size="sm" onClick={handleAdd}>
          <Plus size={14} />
          Tambah
        </Button>
      </div>

      <div className="px-4 space-y-3">
        {/* Run Due button */}
        {!isLoading && hasActive && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={!runDueAllowed || isRunningDue}
            onClick={handleRunDue}
          >
            {isRunningDue ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Zap size={14} />
            )}
            Proses Jatuh Tempo
          </Button>
        )}

        {/* Content */}
        {isLoading ? (
          <RecurringSkeleton />
        ) : recurringExpenses.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="size-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mx-auto">
              <Repeat size={24} />
            </div>
            <p className="text-sm text-foreground font-medium">
              Belum ada pengeluaran rutin
            </p>
            <p className="text-xs text-muted-foreground">
              Buat pengeluaran otomatis untuk tagihan berulang
            </p>
            <Button size="sm" onClick={handleAdd}>
              <Plus size={14} />
              Tambah Pengeluaran Rutin
            </Button>
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
                  className="bg-card rounded-2xl ring-1 ring-foreground/10 p-4 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.categoryName}
                      </p>
                      <Badge
                        variant={item.isActive ? "default" : "secondary"}
                        className="shrink-0 text-[10px] px-1.5 py-0"
                      >
                        {item.isActive ? "Aktif" : "Dijeda"}
                      </Badge>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={anyBusy}
                          aria-label="Menu"
                        >
                          {isBusy ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <MoreVertical size={14} />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(item)}>
                          <Pencil size={14} className="mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {item.isActive ? (
                          <DropdownMenuItem onClick={() => handlePause(item.id)}>
                            <Pause size={14} className="mr-2" />
                            Jeda
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleResume(item.id)}>
                            <Play size={14} className="mr-2" />
                            Aktifkan
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteDialogItem(item)}
                        >
                          <Trash2 size={14} className="mr-2" />
                          Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <p className="text-base font-semibold text-foreground">
                    {formatCurrency(item.amount)}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {formatScheduleLabel(item.scheduleType, item.scheduleDay)}
                    {item.note ? ` · ${item.note}` : ""}
                  </p>

                  <p className="text-xs text-muted-foreground">
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
        onOpenChange={(open) => {
          if (!open) setDeleteDialogItem(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogTitle>Hapus Pengeluaran Rutin</DialogTitle>
          <DialogDescription>
            Yakin ingin menghapus pengeluaran rutin &quot;{deleteDialogItem?.categoryName}&quot;?
            Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
          <div className="flex gap-2 justify-end mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogItem(null)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 size={14} className="animate-spin" />}
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

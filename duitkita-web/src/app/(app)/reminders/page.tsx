"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BellRing, CalendarClock, CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReminders } from "@/hooks/useReminders";
import {
  ReminderFormSheet,
  type ReminderFormValues,
} from "@/components/features/reminders/ReminderFormSheet";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { BillReminder, ReminderStatusFilter } from "@/types";

function ReminderListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-card rounded-2xl ring-1 ring-foreground/10 p-4 space-y-2"
        >
          <div className="h-4 w-44 bg-muted rounded animate-pulse" />
          <div className="h-3 w-28 bg-muted rounded animate-pulse" />
          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function RemindersPage() {
  const [status, setStatus] = useState<ReminderStatusFilter>("upcoming");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"add" | "edit">("add");
  const [editingItem, setEditingItem] = useState<BillReminder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BillReminder | null>(null);

  const {
    reminders,
    isLoading,
    isError,
    refetch,
    createReminder,
    updateReminder,
    deleteReminder,
    markDone,
    snooze,
    isCreating,
    isUpdating,
    isDeleting,
    isMarkingDone,
    isSnoozing,
    deletingId,
    markingDoneId,
    snoozingId,
  } = useReminders(status);

  const pageTitle = useMemo(() => {
    if (status === "overdue") return "Pengingat Terlambat";
    if (status === "done") return "Pengingat Selesai";
    return "Pengingat Tagihan";
  }, [status]);

  async function handleFormSubmit(values: ReminderFormValues) {
    const amountRaw = values.amount?.replace(/\D/g, "");
    const amount = amountRaw ? parseInt(amountRaw, 10) : undefined;
    const payload = {
      title: values.title,
      amount,
      dueDate: values.dueDate,
      remindBeforeDays: Number(values.remindBeforeDays),
      recurringRule: values.recurringRule || undefined,
    };

    if (sheetMode === "add") {
      await createReminder(payload);
    } else if (editingItem) {
      await updateReminder({ id: editingItem.id, payload });
    }
    setSheetOpen(false);
  }

  function openAdd() {
    setSheetMode("add");
    setEditingItem(null);
    setSheetOpen(true);
  }

  function openEdit(item: BillReminder) {
    setSheetMode("edit");
    setEditingItem(item);
    setSheetOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      await deleteReminder(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // error toast handled in hook
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full pt-safe-top pb-6 space-y-4"
    >
      <div className="px-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">{pageTitle}</h1>
        <Button size="sm" onClick={openAdd}>
          <Plus size={14} />
          Tambah
        </Button>
      </div>

      <div className="px-4">
        <Tabs
          value={status}
          onValueChange={(v) => setStatus(v as ReminderStatusFilter)}
          className="space-y-3"
        >
          <TabsList className="w-full">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
            <TabsTrigger value="done">Done</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="px-4 space-y-3">
        {isError && (
          <div className="text-center py-3">
            <p className="text-sm text-muted-foreground">Gagal memuat pengingat.</p>
            <button
              onClick={refetch}
              className="text-xs text-primary mt-1 font-medium"
            >
              Coba lagi
            </button>
          </div>
        )}

        {isLoading ? (
          <ReminderListSkeleton />
        ) : reminders.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="size-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mx-auto">
              <BellRing size={22} />
            </div>
            <p className="text-sm font-medium text-foreground">
              Belum ada data pengingat
            </p>
            <p className="text-xs text-muted-foreground">
              Tambahkan pengingat agar tagihan tidak terlewat.
            </p>
            <Button size="sm" onClick={openAdd}>
              <Plus size={14} />
              Tambah Pengingat
            </Button>
          </div>
        ) : (
          reminders.map((item) => {
            const isDanger = status === "overdue";
            const isBusy =
              (isDeleting && deletingId === item.id) ||
              (isMarkingDone && markingDoneId === item.id) ||
              (isSnoozing && snoozingId === item.id);

            return (
              <div
                key={item.id}
                className="bg-card rounded-2xl ring-1 ring-foreground/10 p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {item.title}
                    </p>
                    <p
                      className={`text-xs ${isDanger ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      Jatuh tempo: {formatDate(item.dueDate)}
                    </p>
                    {item.snoozedUntil && (
                      <p className="text-xs text-muted-foreground">
                        Ditunda sampai: {formatDate(item.snoozedUntil)}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(item)}
                    disabled={isBusy}
                    aria-label="Edit pengingat"
                  >
                    {isBusy ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CalendarClock size={14} />
                    )}
                  </Button>
                </div>

                <p className="text-sm text-foreground">
                  {item.amount !== null ? formatCurrency(item.amount) : "Tanpa nominal"}
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {status !== "done" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markDone(item.id)}
                      disabled={isBusy}
                    >
                      <CheckCircle2 size={14} />
                      Tandai selesai
                    </Button>
                  )}

                  {status !== "done" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => snooze({ id: item.id, snoozeDays: 1 })}
                        disabled={isBusy}
                      >
                        Tunda +1
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => snooze({ id: item.id, snoozeDays: 3 })}
                        disabled={isBusy}
                      >
                        +3
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => snooze({ id: item.id, snoozeDays: 7 })}
                        disabled={isBusy}
                      >
                        +7
                      </Button>
                    </>
                  )}

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteTarget(item)}
                    disabled={isBusy}
                  >
                    <Trash2 size={14} />
                    Hapus
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ReminderFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={sheetMode}
        editingItem={editingItem}
        onSubmit={handleFormSubmit}
        isSubmitting={isCreating || isUpdating}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogTitle>Hapus Pengingat</DialogTitle>
          <DialogDescription>
            Yakin ingin menghapus pengingat "{deleteTarget?.title}"?
          </DialogDescription>
          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
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

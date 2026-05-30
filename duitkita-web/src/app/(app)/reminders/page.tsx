"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
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

const TABS: { value: ReminderStatusFilter; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "overdue", label: "Overdue" },
  { value: "done", label: "Done" },
];

function ReminderListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-2.5"
        >
          <div className="h-4 w-44 bg-white/[0.08] rounded animate-pulse" />
          <div className="h-3 w-28 bg-white/[0.06] rounded animate-pulse" />
          <div className="h-3 w-24 bg-white/[0.06] rounded animate-pulse" />
          <div className="flex gap-2 pt-1">
            {[0, 1, 2].map((j) => (
              <div key={j} className="h-7 w-20 bg-white/[0.06] rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReminderCard({
  item,
  status,
  isBusy,
  onEdit,
  onMarkDone,
  onSnooze,
  onDelete,
}: {
  item: BillReminder;
  status: ReminderStatusFilter;
  isBusy: boolean;
  onEdit: () => void;
  onMarkDone: () => void;
  onSnooze: (days: number) => void;
  onDelete: () => void;
}) {
  const isDanger = status === "overdue";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-3"
      style={isDanger ? { borderColor: "rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.05)" } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white/90 truncate">{item.title}</p>
          <p className={`text-xs mt-0.5 ${isDanger ? "text-red-400" : "text-white/45"}`}>
            Jatuh tempo: {formatDate(item.dueDate)}
          </p>
          {item.snoozedUntil && (
            <p className="text-xs text-white/35 mt-0.5">
              Ditunda sampai: {formatDate(item.snoozedUntil)}
            </p>
          )}
        </div>
        <button
          onClick={onEdit}
          disabled={isBusy}
          aria-label="Edit pengingat"
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.1] transition-colors disabled:opacity-40 shrink-0"
        >
          {isBusy ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <CalendarClock size={13} />
          )}
        </button>
      </div>

      <p className="text-base font-bold text-white/80">
        {item.amount !== null ? formatCurrency(item.amount) : (
          <span className="text-sm font-normal text-white/35">Tanpa nominal</span>
        )}
      </p>

      <div className="space-y-2">
        {/* Row 1: Tandai selesai (full width) — only when not done */}
        {status !== "done" && (
          <button
            onClick={onMarkDone}
            disabled={isBusy}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 hover:bg-emerald-400/15 transition-colors disabled:opacity-40"
          >
            <CheckCircle2 size={12} />
            Tandai selesai
          </button>
        )}

        {/* Row 2: Snooze buttons + Hapus */}
        <div className="flex gap-1.5">
          {status !== "done" && (
            <>
              {[
                { label: "Tunda +1", days: 1 },
                { label: "+3", days: 3 },
                { label: "+7", days: 7 },
              ].map(({ label, days }) => (
                <button
                  key={days}
                  onClick={() => onSnooze(days)}
                  disabled={isBusy}
                  className="flex-1 py-1.5 rounded-xl text-xs font-medium text-white/55 bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] transition-colors disabled:opacity-40"
                >
                  {label}
                </button>
              ))}
            </>
          )}
          <button
            onClick={onDelete}
            disabled={isBusy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-red-400 bg-red-400/10 border border-red-400/20 hover:bg-red-400/15 transition-colors disabled:opacity-40 ml-auto"
          >
            <Trash2 size={12} />
            Hapus
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function PageContent({
  status,
  reminders,
  isLoading,
  isError,
  refetch,
  openAdd,
  markDone,
  snooze,
  isDeleting,
  isMarkingDone,
  isSnoozing,
  deletingId,
  markingDoneId,
  snoozingId,
  openEdit,
  setDeleteTarget,
}: {
  status: ReminderStatusFilter;
  reminders: BillReminder[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  openAdd: () => void;
  markDone: (id: string) => void;
  snooze: (args: { id: string; snoozeDays: number }) => void;
  isDeleting: boolean;
  isMarkingDone: boolean;
  isSnoozing: boolean;
  deletingId: string | null;
  markingDoneId: string | null;
  snoozingId: string | null;
  openEdit: (item: BillReminder) => void;
  setDeleteTarget: (item: BillReminder) => void;
}) {
  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-white/45">Gagal memuat pengingat.</p>
        <button onClick={refetch} className="text-xs text-primary mt-1 font-medium">
          Coba lagi
        </button>
      </div>
    );
  }

  if (isLoading) return <ReminderListSkeleton />;

  if (reminders.length === 0) {
    return (
      <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl py-12 px-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center mx-auto">
          <BellRing size={22} className="text-purple-400" />
        </div>
        <p className="text-sm font-medium text-white/80">Belum ada data pengingat</p>
        <p className="text-xs text-white/40">
          Tambahkan pengingat agar tagihan tidak terlewat.
        </p>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 mt-1"
          style={{ background: "linear-gradient(135deg, #8b2be2 0%, #e91e8c 100%)" }}
        >
          <Plus size={14} />
          Tambah Pengingat
        </button>
      </div>
    );
  }

  return (
    <AnimatePresence initial={false}>
      <div className="space-y-3">
        {reminders.map((item) => {
          const isBusy =
            (isDeleting && deletingId === item.id) ||
            (isMarkingDone && markingDoneId === item.id) ||
            (isSnoozing && snoozingId === item.id);

          return (
            <ReminderCard
              key={item.id}
              item={item}
              status={status}
              isBusy={isBusy}
              onEdit={() => openEdit(item)}
              onMarkDone={() => markDone(item.id)}
              onSnooze={(days) => snooze({ id: item.id, snoozeDays: days })}
              onDelete={() => setDeleteTarget(item)}
            />
          );
        })}
      </div>
    </AnimatePresence>
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

  const contentProps = {
    status,
    reminders,
    isLoading,
    isError,
    refetch,
    openAdd,
    markDone,
    snooze,
    isDeleting,
    isMarkingDone,
    isSnoozing,
    deletingId: deletingId ?? null,
    markingDoneId: markingDoneId ?? null,
    snoozingId: snoozingId ?? null,
    openEdit,
    setDeleteTarget,
  };

  return (
    <>
      {/* ── Desktop layout (lg+) ── */}
      <div className="hidden lg:block p-6 min-h-screen">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{pageTitle}</h1>
            <p className="desktop-text-dim text-sm mt-0.5">Kelola tagihan & jatuh tempo</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #8b2be2 0%, #e91e8c 100%)", boxShadow: "0 4px 16px rgba(139,43,226,0.35)" }}
          >
            <Plus size={14} />
            Tambah
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/[0.05] border border-white/[0.07] rounded-2xl w-fit mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              className={`px-5 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                status === tab.value
                  ? "bg-white/[0.12] text-white shadow-sm"
                  : "text-white/45 hover:text-white/70 hover:bg-white/[0.05]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <PageContent {...contentProps} />
      </div>

      {/* ── Mobile layout ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="lg:hidden w-full pt-safe-top pb-6 space-y-4"
      >
        <div className="px-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">{pageTitle}</h1>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #8b2be2 0%, #e91e8c 100%)" }}
          >
            <Plus size={13} />
            Tambah
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4">
          <div className="flex gap-1 p-1 bg-white/[0.05] border border-white/[0.07] rounded-2xl">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatus(tab.value)}
                className={`flex-1 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  status === tab.value
                    ? "bg-white/[0.12] text-white shadow-sm"
                    : "text-white/45 hover:text-white/70"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4">
          <PageContent {...contentProps} />
        </div>
      </motion.div>

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
            Yakin ingin menghapus pengingat &ldquo;{deleteTarget?.title}&rdquo;?
          </DialogDescription>
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white/60 bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] transition-colors disabled:opacity-40"
            >
              Batal
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 transition-colors disabled:opacity-40"
            >
              {isDeleting && <Loader2 size={13} className="animate-spin" />}
              Hapus
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

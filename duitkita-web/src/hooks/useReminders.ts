import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/lib/constants";
import { apiErrorToast, getApiErrorCode } from "@/lib/utils";
import {
  fetchReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  markReminderDone,
  snoozeReminder,
} from "@/lib/services/reminder.service";
import type {
  CreateReminderRequest,
  UpdateReminderRequest,
  ReminderStatusFilter,
} from "@/types";

export function useReminders(status?: ReminderStatusFilter) {
  const qc = useQueryClient();

  const invalidateReminderData = () => {
    qc.invalidateQueries({ queryKey: ["reminders"] });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.notifications() });
  };

  const query = useQuery({
    queryKey: QUERY_KEYS.reminders(status),
    queryFn: () => fetchReminders(status),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateReminderRequest) => createReminder(payload),
    onSuccess: () => {
      invalidateReminderData();
      toast.success("Pengingat berhasil ditambahkan");
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "VALIDATION_ERROR" || code === "BAD_REQUEST") {
        toast.error("Data tidak valid, periksa kembali isianmu");
      } else {
        toast.error(...apiErrorToast(err, "Gagal menambahkan pengingat"));
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateReminderRequest }) =>
      updateReminder(id, payload),
    onSuccess: () => {
      invalidateReminderData();
      toast.success("Pengingat berhasil diperbarui");
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "NOT_FOUND") toast.error("Pengingat tidak ditemukan");
      else if (code === "CONFLICT")
        toast.error("Pengingat sudah ditandai selesai");
      else if (code === "VALIDATION_ERROR" || code === "BAD_REQUEST")
        toast.error("Data tidak valid");
      else toast.error(...apiErrorToast(err, "Gagal memperbarui pengingat"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReminder(id),
    onSuccess: () => {
      invalidateReminderData();
      toast.success("Pengingat berhasil dihapus");
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "NOT_FOUND") toast.error("Pengingat tidak ditemukan");
      else toast.error(...apiErrorToast(err, "Gagal menghapus pengingat"));
    },
  });

  const markDoneMutation = useMutation({
    mutationFn: (id: string) => markReminderDone(id),
    onSuccess: () => {
      invalidateReminderData();
      toast.success("Pengingat ditandai selesai");
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "NOT_FOUND") toast.error("Pengingat tidak ditemukan");
      else if (code === "CONFLICT")
        toast.error("Pengingat sudah ditandai selesai");
      else toast.error(...apiErrorToast(err, "Gagal menandai pengingat"));
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: ({ id, snoozeDays }: { id: string; snoozeDays?: number }) =>
      snoozeReminder(id, { snoozeDays }),
    onSuccess: () => {
      invalidateReminderData();
      toast.success("Pengingat berhasil ditunda");
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "NOT_FOUND") toast.error("Pengingat tidak ditemukan");
      else if (code === "CONFLICT")
        toast.error("Pengingat sudah ditandai selesai");
      else if (code === "VALIDATION_ERROR" || code === "BAD_REQUEST")
        toast.error("Rentang tunda tidak valid");
      else toast.error(...apiErrorToast(err, "Gagal menunda pengingat"));
    },
  });

  return {
    reminders: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => query.refetch(),
    createReminder: createMutation.mutateAsync,
    updateReminder: updateMutation.mutateAsync,
    deleteReminder: deleteMutation.mutateAsync,
    markDone: markDoneMutation.mutateAsync,
    snooze: snoozeMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isMarkingDone: markDoneMutation.isPending,
    isSnoozing: snoozeMutation.isPending,
    deletingId: deleteMutation.variables ?? null,
    markingDoneId: markDoneMutation.variables ?? null,
    snoozingId: snoozeMutation.variables?.id ?? null,
  };
}

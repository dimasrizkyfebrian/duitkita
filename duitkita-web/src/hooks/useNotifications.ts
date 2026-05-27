import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/lib/constants";
import { apiErrorToast } from "@/lib/utils";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/services/notification.service";
import type { PaginatedNotifications, UpdateNotificationPreferencesRequest } from "@/types";

export function useNotifications() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.notifications(),
    queryFn: () => fetchNotifications(50, 0),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: (id) => {
      qc.setQueryData(
        QUERY_KEYS.notifications(),
        (old: PaginatedNotifications | undefined) => {
          if (!old) return old;
          const wasUnread = old.data.find((n) => n.id === id)?.isRead === false;
          return {
            ...old,
            unreadCount: wasUnread ? Math.max(0, old.unreadCount - 1) : old.unreadCount,
            data: old.data.map((n) =>
              n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
            ),
          };
        },
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.notifications() });
    },
    onError: (err: unknown) => {
      toast.error(...apiErrorToast(err, "Gagal menandai notifikasi"));
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onMutate: () => {
      qc.setQueryData(
        QUERY_KEYS.notifications(),
        (old: PaginatedNotifications | undefined) => {
          if (!old) return old;
          return {
            ...old,
            unreadCount: 0,
            data: old.data.map((n) => ({
              ...n,
              isRead: true,
              readAt: n.readAt ?? new Date().toISOString(),
            })),
          };
        },
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.notifications() });
    },
    onError: (err: unknown) => {
      toast.error(...apiErrorToast(err, "Gagal menandai semua notifikasi"));
    },
  });

  return {
    notifications: query.data?.data ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => query.refetch(),
    markRead: markReadMutation.mutate,
    isMarkingRead: markReadMutation.isPending,
    markAllRead: markAllMutation.mutate,
    isMarkingAll: markAllMutation.isPending,
  };
}

export function useNotificationPreferences() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.notificationPreferences(),
    queryFn: fetchNotificationPreferences,
    staleTime: 5 * 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateNotificationPreferencesRequest) =>
      updateNotificationPreferences(payload),
    onSuccess: (updated) => {
      qc.setQueryData(QUERY_KEYS.notificationPreferences(), updated);
      toast.success("Preferensi notifikasi disimpan");
    },
    onError: (err: unknown) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.notificationPreferences() });
      toast.error(...apiErrorToast(err, "Gagal menyimpan preferensi"));
    },
  });

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    updatePreferences: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/lib/constants";
import { apiErrorToast } from "@/lib/utils";
import {
  fetchSessions,
  revokeSession,
  revokeOtherSessions,
} from "@/lib/services/auth-session.service";

export function useAuthSessions() {
  const qc = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: QUERY_KEYS.sessions(),
    queryFn: fetchSessions,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.sessions() });
      toast.success("Sesi berhasil dihapus");
    },
    onError: (err: unknown) => {
      toast.error(...apiErrorToast(err, "Gagal menghapus sesi"));
    },
  });

  const revokeOthersMutation = useMutation({
    mutationFn: revokeOtherSessions,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.sessions() });
      toast.success("Semua sesi lain berhasil dihapus");
    },
    onError: (err: unknown) => {
      toast.error(...apiErrorToast(err, "Gagal menghapus sesi lain"));
    },
  });

  const activeSessions = (sessionsQuery.data ?? []).filter(
    (s) => !s.revokedAt,
  );

  return {
    sessions: activeSessions,
    isLoading: sessionsQuery.isLoading,
    revokeSession: revokeMutation.mutateAsync,
    revokeOtherSessions: revokeOthersMutation.mutateAsync,
    revokingId: revokeMutation.variables ?? null,
    isRevoking: revokeMutation.isPending,
    isRevokingOthers: revokeOthersMutation.isPending,
  };
}

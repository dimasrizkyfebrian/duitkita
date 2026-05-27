import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/lib/constants";
import { getApiErrorCode, apiErrorToast } from "@/lib/utils";
import {
  sendInvitation,
  fetchIncomingInvitations,
  acceptInvitation,
  rejectInvitation,
  cancelInvitation,
} from "@/lib/services/couple-invitation.service";

export function useInvitations() {
  const qc = useQueryClient();

  const incomingQuery = useQuery({
    queryKey: QUERY_KEYS.invitationsIncoming(),
    queryFn: fetchIncomingInvitations,
  });

  const invalidatePartnerScoped = () => {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.partner() });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.invitationsIncoming() });
    qc.invalidateQueries({ queryKey: ["budgets"] });
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
    qc.invalidateQueries({ queryKey: ["activity"] });
  };

  const sendMutation = useMutation({
    mutationFn: (email: string) => sendInvitation(email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.invitationsIncoming() });
      toast.success("Undangan terkirim!");
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "NOT_FOUND") toast.error("Email tidak terdaftar di DuitKita");
      else if (code === "CONFLICT") toast.error("Undangan sudah dikirim atau salah satu sudah terhubung");
      else if (code === "BAD_REQUEST" || code === "VALIDATION_ERROR") toast.error("Format email tidak valid");
      else toast.error(...apiErrorToast(err, "Gagal mengirim undangan"));
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => acceptInvitation(id),
    onSuccess: (partner) => {
      invalidatePartnerScoped();
      toast.success(`Berhasil terhubung dengan ${partner.name}`);
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "NOT_FOUND") toast.error("Undangan tidak ditemukan");
      else if (code === "CONFLICT") toast.error("Kamu atau pengirim sudah terhubung dengan akun lain");
      else toast.error(...apiErrorToast(err, "Gagal menerima undangan"));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectInvitation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.invitationsIncoming() });
      toast.success("Undangan ditolak");
    },
    onError: (err: unknown) => {
      toast.error(...apiErrorToast(err, "Gagal menolak undangan"));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelInvitation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.invitationsIncoming() });
      toast.success("Undangan dibatalkan");
    },
    onError: (err: unknown) => {
      toast.error(...apiErrorToast(err, "Gagal membatalkan undangan"));
    },
  });

  return {
    incomingInvitations: incomingQuery.data ?? [],
    isLoadingIncoming: incomingQuery.isLoading,
    sendInvitation: sendMutation.mutateAsync,
    acceptInvitation: acceptMutation.mutateAsync,
    rejectInvitation: rejectMutation.mutateAsync,
    cancelInvitation: cancelMutation.mutateAsync,
    isSending: sendMutation.isPending,
    acceptingId: acceptMutation.variables ?? null,
    isAccepting: acceptMutation.isPending,
    rejectingId: rejectMutation.variables ?? null,
    isRejecting: rejectMutation.isPending,
    isCancelling: cancelMutation.isPending,
  };
}

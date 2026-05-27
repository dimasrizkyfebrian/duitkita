import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth.store";
import { QUERY_KEYS } from "@/lib/constants";
import { getApiErrorCode, apiErrorToast } from "@/lib/utils";
import {
  fetchProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  changePassword,
  fetchPartner,
  linkPartner,
  unlinkPartner,
} from "@/lib/services/profile.service";
import type { UpdateProfileRequest, ChangePasswordRequest, Partner } from "@/types";

export function useProfile() {
  const qc = useQueryClient();
  const updateAuthUser = useAuthStore((s) => s.updateUser);

  const profileQuery = useQuery({
    queryKey: QUERY_KEYS.profile(),
    queryFn: fetchProfile,
    staleTime: 5 * 60_000,
  });

  const partnerQuery = useQuery({
    queryKey: QUERY_KEYS.partner(),
    queryFn: fetchPartner,
  });

  // Keep auth store in sync with the freshest server profile.
  useEffect(() => {
    if (profileQuery.data) {
      updateAuthUser(profileQuery.data);
    }
  }, [profileQuery.data, updateAuthUser]);

  const invalidatePartnerScopedData = () => {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.partner() });
    qc.invalidateQueries({ queryKey: ["budgets"] });
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
    qc.invalidateQueries({ queryKey: ["activity"] });
  };

  const updateProfileMutation = useMutation({
    mutationFn: (payload: UpdateProfileRequest) => updateProfile(payload),
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.profile() });
      updateAuthUser(user);
      toast.success("Profil berhasil diperbarui");
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "VALIDATION_ERROR" || code === "BAD_REQUEST") toast.error("Nama tidak valid, pastikan tidak kosong dan maksimal 100 karakter");
      else toast.error(...apiErrorToast(err, "Gagal memperbarui profil, coba beberapa saat lagi"));
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.profile() });
      qc.invalidateQueries({ queryKey: ["avatar", user.id] });
      updateAuthUser(user);
      toast.success("Foto profil berhasil diperbarui");
    },
    onError: () => {
      toast.error("Gagal mengunggah foto. Gunakan JPEG, PNG, atau WebP (maks. 2 MB).");
    },
  });

  const deleteAvatarMutation = useMutation({
    mutationFn: () => deleteAvatar(),
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.profile() });
      qc.invalidateQueries({ queryKey: ["avatar", user.id] });
      updateAuthUser(user);
      toast.success("Foto profil dihapus");
    },
    onError: () => {
      toast.error("Gagal menghapus foto profil");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (payload: ChangePasswordRequest) => changePassword(payload),
    onSuccess: () => toast.success("Password berhasil diperbarui"),
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "UNAUTHORIZED") toast.error("Password saat ini tidak sesuai");
      else if (code === "VALIDATION_ERROR" || code === "BAD_REQUEST") toast.error("Data tidak valid, pastikan semua kolom terisi dengan benar");
      else toast.error(...apiErrorToast(err, "Gagal memperbarui password, coba beberapa saat lagi"));
    },
  });

  const linkPartnerMutation = useMutation({
    mutationFn: (email: string) => linkPartner(email),
    onSuccess: (partner: Partner) => {
      qc.setQueryData(QUERY_KEYS.partner(), partner);
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      toast.success(`Berhasil terhubung dengan ${partner.name}`);
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "NOT_FOUND") toast.error("Email pasangan tidak terdaftar di DuitKita");
      else if (code === "CONFLICT") toast.error("Kamu atau pasangan sudah terhubung dengan akun lain");
      else if (code === "VALIDATION_ERROR" || code === "BAD_REQUEST") toast.error("Format email tidak valid");
      else toast.error(...apiErrorToast(err, "Gagal menghubungkan dengan pasangan, coba beberapa saat lagi"));
    },
  });

  const unlinkPartnerMutation = useMutation({
    mutationFn: unlinkPartner,
    onSuccess: () => {
      invalidatePartnerScopedData();
      toast.success("Pasangan berhasil diputuskan");
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      if (code === "NOT_FOUND") toast.error("Tidak ada pasangan yang terhubung");
      else toast.error(...apiErrorToast(err, "Gagal memutuskan pasangan, coba beberapa saat lagi"));
    },
  });

  return {
    // data
    profile: profileQuery.data,
    partner: partnerQuery.data ?? null,
    // query state
    isProfileLoading: profileQuery.isLoading,
    isPartnerLoading: partnerQuery.isLoading,
    isProfileError: profileQuery.isError,
    // mutations
    updateProfile: updateProfileMutation.mutateAsync,
    uploadAvatar: uploadAvatarMutation.mutateAsync,
    deleteAvatar: deleteAvatarMutation.mutateAsync,
    changePassword: changePasswordMutation.mutateAsync,
    linkPartner: linkPartnerMutation.mutateAsync,
    unlinkPartner: unlinkPartnerMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
    isUploadingAvatar: uploadAvatarMutation.isPending,
    isRemovingAvatar: deleteAvatarMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,
    isLinkingPartner: linkPartnerMutation.isPending,
    isUnlinkingPartner: unlinkPartnerMutation.isPending,
  };
}

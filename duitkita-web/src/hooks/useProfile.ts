import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth.store";
import { QUERY_KEYS } from "@/lib/constants";
import { getApiStatus } from "@/lib/utils";
import {
  fetchProfile,
  updateProfile,
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
      const status = getApiStatus(err);
      if (status === 400) toast.error("Nama tidak valid, pastikan tidak kosong dan maksimal 100 karakter");
      else toast.error("Gagal memperbarui profil, coba beberapa saat lagi");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (payload: ChangePasswordRequest) => changePassword(payload),
    onSuccess: () => toast.success("Password berhasil diperbarui"),
    onError: (err: unknown) => {
      const status = getApiStatus(err);
      if (status === 401) toast.error("Password saat ini tidak sesuai");
      else if (status === 400) toast.error("Data tidak valid, pastikan semua kolom terisi dengan benar");
      else toast.error("Gagal memperbarui password, coba beberapa saat lagi");
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
      const status = getApiStatus(err);
      if (status === 404) toast.error("Email pasangan tidak terdaftar di DuitKita");
      else if (status === 409) toast.error("Kamu atau pasangan sudah terhubung dengan akun lain");
      else if (status === 400) toast.error("Format email tidak valid");
      else toast.error("Gagal menghubungkan dengan pasangan, coba beberapa saat lagi");
    },
  });

  const unlinkPartnerMutation = useMutation({
    mutationFn: unlinkPartner,
    onSuccess: () => {
      invalidatePartnerScopedData();
      toast.success("Pasangan berhasil diputuskan");
    },
    onError: (err: unknown) => {
      const status = getApiStatus(err);
      if (status === 404) toast.error("Tidak ada pasangan yang terhubung");
      else toast.error("Gagal memutuskan pasangan, coba beberapa saat lagi");
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
    changePassword: changePasswordMutation.mutateAsync,
    linkPartner: linkPartnerMutation.mutateAsync,
    unlinkPartner: unlinkPartnerMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,
    isLinkingPartner: linkPartnerMutation.isPending,
    isUnlinkingPartner: unlinkPartnerMutation.isPending,
  };
}

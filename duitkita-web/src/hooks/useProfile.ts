import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth.store";
import { QUERY_KEYS } from "@/lib/constants";
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
    staleTime: 5 * 60 * 1000,
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
      toast.success("Profil diperbarui");
    },
    onError: () => toast.error("Gagal memperbarui profil"),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (payload: ChangePasswordRequest) => changePassword(payload),
    onSuccess: () => toast.success("Password diperbarui"),
    onError: () => toast.error("Gagal memperbarui password"),
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
    onError: () => toast.error("Email tidak ditemukan atau gagal menghubungkan"),
  });

  const unlinkPartnerMutation = useMutation({
    mutationFn: unlinkPartner,
    onSuccess: () => {
      invalidatePartnerScopedData();
      toast.success("Pasangan diputuskan");
    },
    onError: () => toast.error("Gagal memutuskan pasangan"),
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

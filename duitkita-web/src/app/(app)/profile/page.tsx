"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useAuthStore } from "@/stores/auth.store";
import { Button } from "@/components/ui/button";
import { ProfileHeader } from "@/components/features/profile/ProfileHeader";
import { PartnerCard } from "@/components/features/profile/PartnerCard";
import { PreferencesCard } from "@/components/features/profile/PreferencesCard";
import { SecurityCard } from "@/components/features/profile/SecurityCard";
import { AppVersionFooter } from "@/components/features/profile/AppVersionFooter";
import {
  ProfileEditSheet,
  type ProfileEditFormValues,
} from "@/components/features/profile/ProfileEditSheet";
import {
  ChangePasswordSheet,
  type ChangePasswordFormValues,
} from "@/components/features/profile/ChangePasswordSheet";
import { PartnerInviteSheet } from "@/components/features/profile/PartnerInviteSheet";
import { UnlinkPartnerDialog } from "@/components/features/profile/UnlinkPartnerDialog";
import { LogoutDialog } from "@/components/features/profile/LogoutDialog";

function ProfileHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <div className="size-16 rounded-full bg-muted animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        <div className="h-3 w-44 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const logoutFromStore = useAuthStore((s) => s.logout);
  const fallbackUser = useAuthStore((s) => s.user);

  const {
    profile,
    partner,
    isProfileLoading,
    isPartnerLoading,
    isProfileError,
    updateProfile,
    changePassword,
    linkPartner,
    unlinkPartner,
    isUpdatingProfile,
    isChangingPassword,
    isLinkingPartner,
    isUnlinkingPartner,
  } = useProfile();

  const user = profile ?? fallbackUser;

  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  async function handleEditSubmit(values: ProfileEditFormValues) {
    try {
      await updateProfile(values);
      setEditOpen(false);
    } catch {
      // toast handled by mutation onError
    }
  }

  async function handlePasswordSubmit(values: ChangePasswordFormValues) {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setPasswordOpen(false);
    } catch {
      // toast handled by mutation onError
    }
  }

  async function handleLinkPartner(code: string) {
    await linkPartner(code);
    setInviteOpen(false);
  }

  async function handleUnlinkConfirm() {
    try {
      await unlinkPartner();
      setUnlinkOpen(false);
    } catch {
      // toast handled by mutation onError
    }
  }

  function handleLogoutConfirm() {
    setLogoutOpen(false);
    logoutFromStore();
    router.replace("/login");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full"
    >
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-foreground">Profil</h1>
      </div>

      <div className="px-4 pb-6 space-y-4">
        {isProfileLoading && !user ? (
          <ProfileHeaderSkeleton />
        ) : user ? (
          <ProfileHeader user={user} onEdit={() => setEditOpen(true)} />
        ) : null}

        {isProfileError && !user && (
          <div className="text-center py-3">
            <p className="text-sm text-muted-foreground">
              Gagal memuat profil.
            </p>
          </div>
        )}

        <PartnerCard
          partner={partner}
          isLoading={isPartnerLoading}
          onInvite={() => setInviteOpen(true)}
          onUnlink={() => setUnlinkOpen(true)}
        />

        <PreferencesCard />

        <SecurityCard onChangePassword={() => setPasswordOpen(true)} />

        <Button
          variant="destructive"
          className="w-full"
          onClick={() => setLogoutOpen(true)}
        >
          <LogOut />
          Keluar
        </Button>

        <AppVersionFooter />
      </div>

      {user && (
        <ProfileEditSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          user={user}
          onSubmit={handleEditSubmit}
          isSubmitting={isUpdatingProfile}
        />
      )}

      <ChangePasswordSheet
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        onSubmit={handlePasswordSubmit}
        isSubmitting={isChangingPassword}
      />

      <PartnerInviteSheet
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSubmit={handleLinkPartner}
        isSubmitting={isLinkingPartner}
      />

      <UnlinkPartnerDialog
        open={unlinkOpen}
        onOpenChange={setUnlinkOpen}
        partnerName={partner?.name ?? null}
        onConfirm={handleUnlinkConfirm}
        isUnlinking={isUnlinkingPartner}
      />

      <LogoutDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={handleLogoutConfirm}
      />
    </motion.div>
  );
}

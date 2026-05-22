"use client";

import { useRef } from "react";
import { Camera, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import type { User } from "@/types";

interface ProfileHeaderProps {
  user: User;
  onEdit: () => void;
  onUploadAvatar: (file: File) => Promise<void>;
  onRemoveAvatar?: () => Promise<void>;
  isUploadingAvatar?: boolean;
  isRemovingAvatar?: boolean;
}

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp";

export function ProfileHeader({
  user,
  onEdit,
  onUploadAvatar,
  onRemoveAvatar,
  isUploadingAvatar = false,
  isRemovingAvatar = false,
}: ProfileHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarBusy = isUploadingAvatar || isRemovingAvatar;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await onUploadAvatar(file);
  }

  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <div className="relative shrink-0">
        <UserAvatar
          userId={user.id}
          name={user.name}
          hasAvatar={user.hasAvatar}
          className="size-16 text-base"
          fallbackClassName="text-lg"
        />
        <button
          type="button"
          disabled={avatarBusy}
          onClick={() => fileInputRef.current?.click()}
          className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full border border-background bg-primary text-primary-foreground shadow-sm disabled:opacity-60"
          aria-label="Ubah foto profil"
        >
          {avatarBusy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Camera className="size-3.5" />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-foreground truncate">
          {user.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        {user.hasAvatar && onRemoveAvatar ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 h-7 px-2 text-xs text-muted-foreground"
            disabled={avatarBusy}
            onClick={() => void onRemoveAvatar()}
          >
            <Trash2 className="size-3" />
            Hapus foto
          </Button>
        ) : null}
      </div>

      <Button variant="outline" size="sm" onClick={onEdit}>
        <Pencil />
        Edit
      </Button>
    </div>
  );
}
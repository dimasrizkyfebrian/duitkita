"use client";

import { useRef } from "react";
import { Camera, Loader2, Pencil, Trash2 } from "lucide-react";
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
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 flex items-center gap-4">
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
          className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full border-2 border-[#1a0533] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #8b2be2 0%, #e91e8c 100%)" }}
          aria-label="Ubah foto profil"
        >
          {avatarBusy ? (
            <Loader2 className="size-3.5 animate-spin text-white" />
          ) : (
            <Camera className="size-3.5 text-white" />
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
        <p className="text-base font-semibold text-white/90 truncate">{user.name}</p>
        <p className="text-xs text-white/45 truncate">{user.email}</p>
        {user.hasAvatar && onRemoveAvatar ? (
          <button
            type="button"
            className="mt-1.5 flex items-center gap-1 text-xs text-white/40 hover:text-white/60 transition-colors disabled:opacity-40"
            disabled={avatarBusy}
            onClick={() => void onRemoveAvatar()}
          >
            <Trash2 className="size-3" />
            Hapus foto
          </button>
        ) : null}
      </div>

      <button
        onClick={onEdit}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/70 bg-white/[0.07] border border-white/[0.1] hover:bg-white/[0.11] transition-colors shrink-0"
      >
        <Pencil size={12} />
        Edit
      </button>
    </div>
  );
}

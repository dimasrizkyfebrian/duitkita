"use client";

import { Heart, UserPlus, Unlink } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import type { Partner } from "@/types";

interface PartnerCardProps {
  partner: Partner | null;
  isLoading: boolean;
  onInvite: () => void;
  onUnlink: () => void;
}

export function PartnerCard({ partner, isLoading, onInvite, onUnlink }: PartnerCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-3">
        <div className="h-3 w-24 bg-white/[0.08] rounded animate-pulse" />
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-white/[0.08] animate-pulse" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3 w-32 bg-white/[0.08] rounded animate-pulse" />
            <div className="h-2.5 w-20 bg-white/[0.06] rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Heart size={13} className="text-pink-400" />
          <p className="text-[11px] font-semibold text-white/45 uppercase tracking-wider">
            Pasangan kamu
          </p>
        </div>
        <div className="text-center py-3 space-y-1.5">
          <p className="text-sm text-white/75">Belum terhubung dengan pasangan</p>
          <p className="text-xs text-white/40">
            Hubungkan akun untuk lihat anggaran & pengeluaran berdua
          </p>
        </div>
        <button
          onClick={onInvite}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #8b2be2 0%, #e91e8c 100%)" }}
        >
          <UserPlus size={14} />
          Hubungkan dengan pasangan
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Heart size={13} className="text-pink-400 fill-pink-400" />
        <p className="text-[11px] font-semibold text-white/45 uppercase tracking-wider">
          Pasangan kamu
        </p>
      </div>
      <div className="flex items-center gap-3">
        <UserAvatar
          userId={partner.id}
          name={partner.name}
          hasAvatar={partner.hasAvatar}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white/90 truncate">{partner.name}</p>
          <p className="text-xs text-white/45 truncate">{partner.email}</p>
        </div>
        <button
          onClick={onUnlink}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-red-400 bg-red-400/10 border border-red-400/20 hover:bg-red-400/15 transition-colors shrink-0"
        >
          <Unlink size={12} />
          Putuskan
        </button>
      </div>
    </div>
  );
}

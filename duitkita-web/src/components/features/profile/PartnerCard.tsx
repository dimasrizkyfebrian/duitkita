"use client";

import { Heart, UserPlus, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import type { Partner } from "@/types";

interface PartnerCardProps {
  partner: Partner | null;
  isLoading: boolean;
  onInvite: () => void;
  onUnlink: () => void;
}

export function PartnerCard({
  partner,
  isLoading,
  onInvite,
  onUnlink,
}: PartnerCardProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl ring-1 ring-foreground/10 p-4 space-y-3">
        <div className="h-3 w-24 bg-muted rounded animate-pulse" />
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-muted animate-pulse" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            <div className="h-2.5 w-20 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="bg-card rounded-2xl ring-1 ring-foreground/10 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Heart size={14} className="text-primary" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Pasangan kamu
          </p>
        </div>

        <div className="text-center py-3 space-y-2">
          <p className="text-sm text-foreground">
            Belum terhubung dengan pasangan
          </p>
          <p className="text-xs text-muted-foreground">
            Hubungkan akun untuk lihat anggaran & pengeluaran berdua
          </p>
        </div>

        <Button className="w-full" onClick={onInvite}>
          <UserPlus />
          Hubungkan dengan pasangan
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl ring-1 ring-foreground/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Heart size={14} className="text-primary fill-primary" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
          <p className="text-sm font-semibold text-foreground truncate">
            {partner.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {partner.email}
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={onUnlink}>
          <Unlink />
          Putuskan
        </Button>
      </div>
    </div>
  );
}

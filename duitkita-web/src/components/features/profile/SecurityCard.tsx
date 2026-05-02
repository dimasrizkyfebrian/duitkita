"use client";

import { ChevronRight, KeyRound } from "lucide-react";

interface SecurityCardProps {
  onChangePassword: () => void;
}

export function SecurityCard({ onChangePassword }: SecurityCardProps) {
  return (
    <div className="bg-card rounded-2xl ring-1 ring-foreground/10 overflow-hidden">
      <button
        type="button"
        onClick={onChangePassword}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors"
      >
        <div className="size-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <KeyRound size={16} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-foreground">Ganti password</p>
          <p className="text-xs text-muted-foreground">
            Ubah kata sandi akun kamu
          </p>
        </div>
        <ChevronRight size={16} className="text-muted-foreground shrink-0" />
      </button>
    </div>
  );
}

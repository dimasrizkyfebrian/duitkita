"use client";

import { ChevronRight, KeyRound } from "lucide-react";

interface SecurityCardProps {
  onChangePassword: () => void;
}

export function SecurityCard({ onChangePassword }: SecurityCardProps) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={onChangePassword}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.04] transition-colors"
      >
        <div className="size-9 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0">
          <KeyRound size={15} className="text-purple-400" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-white/85">Ganti password</p>
          <p className="text-xs text-white/40">Ubah kata sandi akun kamu</p>
        </div>
        <ChevronRight size={15} className="text-white/30 shrink-0" />
      </button>
    </div>
  );
}

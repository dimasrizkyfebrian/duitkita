"use client";

import { Loader2, HeartCrack } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface UnlinkPartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerName: string | null;
  onConfirm: () => void;
  isUnlinking: boolean;
}

export function UnlinkPartnerDialog({
  open,
  onOpenChange,
  partnerName,
  onConfirm,
  isUnlinking,
}: UnlinkPartnerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="bg-[#0d0920]/98 border border-white/[0.08] rounded-2xl p-0 overflow-hidden max-w-[calc(100%-2rem)] sm:max-w-sm"
      >
        <DialogTitle className="sr-only">Putuskan Pasangan</DialogTitle>
        <DialogDescription className="sr-only">
          Konfirmasi memutuskan koneksi dengan pasangan.
        </DialogDescription>

        <div className="px-5 pt-6 pb-5 space-y-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="size-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <HeartCrack size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-white/90">Putuskan Pasangan?</p>
              <p className="text-sm text-white/40 mt-1 leading-relaxed">
                Koneksi dengan{" "}
                <span className="font-semibold text-white/70">
                  {partnerName ?? "pasangan"}
                </span>{" "}
                akan diputuskan. Kamu tidak akan bisa melihat data pasangan lagi.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <button
              onClick={onConfirm}
              disabled={isUnlinking}
              className="w-full h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 bg-red-500/15 border border-red-500/25 hover:bg-red-500/25 active:scale-[0.98] disabled:opacity-50"
            >
              {isUnlinking ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <HeartCrack size={15} />
              )}
              Putuskan
            </button>

            <DialogClose asChild>
              <button
                disabled={isUnlinking}
                className="w-full h-11 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
              >
                Batal
              </button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

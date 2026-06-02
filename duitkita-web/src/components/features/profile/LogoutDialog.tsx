"use client";

import { LogOut } from "lucide-react";
import { Dialog, DialogContent, DialogClose, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface LogoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function LogoutDialog({ open, onOpenChange, onConfirm }: LogoutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="bg-[#0d0920]/98 border border-white/[0.08] rounded-2xl p-0 overflow-hidden max-w-[calc(100%-2rem)] sm:max-w-sm"
      >
        <DialogTitle className="sr-only">Keluar dari akun</DialogTitle>
        <DialogDescription className="sr-only">
          Konfirmasi keluar dari akun DuitKita kamu.
        </DialogDescription>

        {/* Body */}
        <div className="px-5 pt-6 pb-5 space-y-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="size-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <LogOut size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-white/90">Keluar dari akun?</p>
              <p className="text-sm text-white/40 mt-1 leading-relaxed">
                Kamu perlu masuk lagi untuk mengakses data DuitKita kamu.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <button
              onClick={onConfirm}
              className="w-full h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 bg-red-500/15 border border-red-500/25 hover:bg-red-500/25 active:scale-[0.98]"
            >
              <LogOut size={15} />
              Keluar
            </button>

            <DialogClose asChild>
              <button className="w-full h-11 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-all duration-200 active:scale-[0.98]">
                Batal
              </button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

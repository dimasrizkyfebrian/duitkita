"use client";

import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogClose } from "@/components/ui/dialog";
import type { MonthlyBudget } from "@/types";

interface DeleteBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: MonthlyBudget | null;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteBudgetDialog({
  open,
  onOpenChange,
  budget,
  onConfirm,
  isDeleting,
}: DeleteBudgetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="border-white/[0.12] sm:max-w-[360px]"
        style={{
          background: "rgba(18, 6, 46, 0.92)",
          backdropFilter: "blur(24px)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-white">Hapus Anggaran</DialogTitle>
          <DialogDescription className="text-white/55">
            Hapus anggaran{" "}
            <span className="font-semibold text-white">
              {budget?.category.name}
            </span>
            ? Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 border-t-0 bg-transparent flex-row justify-end">
          <DialogClose asChild>
            <button
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white/65 hover:text-white border border-white/[0.14] hover:bg-white/[0.08] transition-colors disabled:opacity-50"
            >
              Batal
            </button>
          </DialogClose>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500/75 hover:bg-red-500/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting && <Loader2 size={14} className="animate-spin" />}
            Hapus
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

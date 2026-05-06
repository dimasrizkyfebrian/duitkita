"use client";

import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { Expense } from "@/types";

interface DeleteExpenseDialogProps {
  expense: Expense | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteExpenseDialog({
  expense,
  onOpenChange,
  onConfirm,
  isDeleting,
}: DeleteExpenseDialogProps) {
  return (
    <Dialog open={expense !== null} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Hapus Pengeluaran</DialogTitle>
          <DialogDescription>
            Hapus pengeluaran{" "}
            <span className="font-medium text-foreground">
              {expense?.note?.trim() || expense?.category.name}
            </span>{" "}
            sebesar{" "}
            <span className="font-medium text-foreground">
              {expense ? formatCurrency(expense.amount) : ""}
            </span>
            ? Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isDeleting}>
              Batal
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 size={14} className="animate-spin" />}
            Hapus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

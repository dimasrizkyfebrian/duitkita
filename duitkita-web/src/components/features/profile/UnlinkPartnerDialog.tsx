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
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Putuskan Pasangan</DialogTitle>
          <DialogDescription>
            Putuskan koneksi dengan{" "}
            <span className="font-medium text-foreground">
              {partnerName ?? "pasangan"}
            </span>
            ? Setelah diputuskan, kamu tidak akan lihat data pasangan lagi.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isUnlinking}>
              Batal
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isUnlinking}
          >
            {isUnlinking && <Loader2 size={14} className="animate-spin" />}
            Putuskan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

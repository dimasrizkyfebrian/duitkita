"use client";

import { useState } from "react";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth.store";

interface PartnerInviteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (email: string) => Promise<void>;
  isSubmitting: boolean;
}

function InviteContent({
  onSubmit,
  isSubmitting,
}: Pick<PartnerInviteSheetProps, "onSubmit" | "isSubmitting">) {
  const myEmail = useAuthStore((s) => s.user?.email ?? "");
  const [partnerEmail, setPartnerEmail] = useState("");

  async function handleCopyEmail() {
    try {
      await navigator.clipboard.writeText(myEmail);
      toast.success("Email disalin");
    } catch {
      toast.error("Gagal menyalin email");
    }
  }

  async function handleSubmit() {
    if (!partnerEmail.trim()) return;
    await onSubmit(partnerEmail.trim().toLowerCase());
  }

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(partnerEmail.trim());

  return (
    <>
      {/* My email section */}
      <div className="bg-muted/40 rounded-2xl p-4 space-y-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Email kamu
        </Label>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground break-all">
            {myEmail}
          </p>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleCopyEmail}
            disabled={isSubmitting}
            aria-label="Salin email"
          >
            <Copy />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Bagikan email ini ke pasanganmu agar mereka bisa menghubungkan akun.
        </p>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground uppercase">atau</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Partner email input */}
      <div className="space-y-3">
        <Label htmlFor="partner-email">Masukkan email pasangan</Label>
        <Input
          id="partner-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="pasangan@email.com"
          value={partnerEmail}
          onChange={(e) => setPartnerEmail(e.target.value)}
          disabled={isSubmitting}
        />
        <Button
          variant="outline"
          className="w-full"
          onClick={handleSubmit}
          disabled={isSubmitting || !isValidEmail}
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          Hubungkan
        </Button>
      </div>
    </>
  );
}

export function PartnerInviteSheet({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: PartnerInviteSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        aria-describedby={undefined}
        className="rounded-t-2xl p-0 max-h-[90vh] overflow-y-auto"
      >
        <div className="px-4 pt-3 pb-8 space-y-5">
          <div className="w-10 h-1 bg-muted rounded-full mx-auto" />

          <div>
            <SheetTitle className="text-base font-semibold text-foreground">
              Hubungkan dengan Pasangan
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Masukkan email pasanganmu untuk menghubungkan akun kalian.
            </p>
          </div>

          <InviteContent onSubmit={onSubmit} isSubmitting={isSubmitting} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useState } from "react";
import { Copy, Loader2, RefreshCw, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function randomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

interface PartnerInviteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (code: string) => Promise<void>;
  isSubmitting: boolean;
}

function InviteContent({
  onSubmit,
  isSubmitting,
}: Pick<PartnerInviteSheetProps, "onSubmit" | "isSubmitting">) {
  const [myCode, setMyCode] = useState(randomCode);
  const [partnerCode, setPartnerCode] = useState("");
  const [submittingSide, setSubmittingSide] = useState<
    "mine" | "partner" | null
  >(null);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(myCode);
      toast.success("Kode disalin");
    } catch {
      toast.error("Gagal menyalin kode");
    }
  }

  async function handleShare() {
    const text = `Pakai kode ${myCode} buat hubungin akun DuitKita kita.`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "DuitKita", text });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    await handleCopy();
  }

  async function handleSubmitMine() {
    setSubmittingSide("mine");
    try {
      await onSubmit(myCode);
    } catch {
      // toast handled by mutation onError
    } finally {
      setSubmittingSide(null);
    }
  }

  async function handleSubmitPartner() {
    if (partnerCode.length !== 6) return;
    setSubmittingSide("partner");
    try {
      await onSubmit(partnerCode);
    } catch {
      // toast handled by mutation onError
    } finally {
      setSubmittingSide(null);
    }
  }

  const partnerCodeValid = /^\d{6}$/.test(partnerCode);

  return (
    <>
      {/* Top zone — my generated code */}
      <div className="bg-muted/40 rounded-2xl p-4 space-y-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Kode kamu
        </Label>

        <div className="flex items-center justify-between gap-2">
          <p className="text-3xl font-bold tracking-[0.4em] text-foreground tabular-nums">
            {myCode}
          </p>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMyCode(randomCode())}
            disabled={isSubmitting}
            aria-label="Acak ulang kode"
          >
            <RefreshCw />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={isSubmitting}
          >
            <Copy />
            Salin
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            disabled={isSubmitting}
          >
            <Share2 />
            Bagikan
          </Button>
        </div>

        <Button
          className="w-full"
          onClick={handleSubmitMine}
          disabled={isSubmitting}
        >
          {submittingSide === "mine" && (
            <Loader2 size={14} className="animate-spin" />
          )}
          Hubungkan dengan kode ini
        </Button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground uppercase">atau</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Bottom zone — partner's code input */}
      <div className="space-y-3">
        <Label htmlFor="partner-code">Masukkan kode pasangan</Label>
        <Input
          id="partner-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          value={partnerCode}
          onChange={(e) =>
            setPartnerCode(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          disabled={isSubmitting}
          className="text-center text-2xl font-bold tracking-[0.4em] tabular-nums h-12"
        />

        <Button
          variant="outline"
          className="w-full"
          onClick={handleSubmitPartner}
          disabled={isSubmitting || !partnerCodeValid}
        >
          {submittingSide === "partner" && (
            <Loader2 size={14} className="animate-spin" />
          )}
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
              Kamu dan pasangan harus memakai kode yang sama. Salah satu bikin
              kode, yang lain memasukkannya.
            </p>
          </div>

          {/* Inner content remounts each time SheetContent mounts -> fresh code per open. */}
          <InviteContent onSubmit={onSubmit} isSubmitting={isSubmitting} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

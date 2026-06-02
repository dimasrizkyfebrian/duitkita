"use client";

import { useState } from "react";
import { Copy, Loader2, Heart, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";

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
  const [focused, setFocused] = useState(false);

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
    <div className="space-y-4">
      {/* My email section */}
      <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-4 space-y-2">
        <p className="text-[10px] font-semibold text-white/35 uppercase tracking-wider">
          Email kamu
        </p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-white/80 break-all flex-1">{myEmail}</p>
          <button
            onClick={handleCopyEmail}
            disabled={isSubmitting}
            aria-label="Salin email"
            className="p-1.5 rounded-lg text-white/35 hover:text-white/70 hover:bg-white/[0.07] transition-colors disabled:opacity-40"
          >
            <Copy size={14} />
          </button>
        </div>
        <p className="text-xs text-white/30 leading-relaxed">
          Bagikan email ini ke pasanganmu agar mereka bisa menghubungkan akun.
        </p>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">atau</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>

      {/* Partner email input */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-white/45 uppercase tracking-wider flex items-center gap-1.5">
          <Mail size={11} />
          Masukkan email pasangan
        </label>
        <div
          className={cn(
            "flex items-center bg-white/[0.05] border rounded-xl transition-all duration-200",
            focused ? "border-purple-500/50 ring-2 ring-purple-500/10" : "border-white/[0.08]",
          )}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        >
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="pasangan@email.com"
            value={partnerEmail}
            onChange={(e) => setPartnerEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && isValidEmail && handleSubmit()}
            disabled={isSubmitting}
            className="flex-1 h-11 bg-transparent px-3.5 text-sm text-white/90 placeholder:text-white/20 outline-none disabled:opacity-50"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !isValidEmail}
          className="w-full h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-40 active:scale-[0.98]"
          style={{
            background: isValidEmail && !isSubmitting
              ? "linear-gradient(135deg, #7c3aed, #db2777)"
              : "rgba(255,255,255,0.07)",
          }}
        >
          {isSubmitting ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Send size={15} />
          )}
          Kirim Undangan
        </button>
      </div>
    </div>
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
        className="rounded-t-2xl p-0 max-h-[90vh] overflow-y-auto border-t border-white/[0.08] bg-[#0d0920]/98"
      >
        <div className="px-5 pt-3 pb-8 space-y-5">
          {/* Drag handle */}
          <div className="w-10 h-1 bg-white/[0.12] rounded-full mx-auto" />

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-pink-500/15 border border-pink-500/20 flex items-center justify-center shrink-0">
              <Heart size={15} className="text-pink-400" />
            </div>
            <div>
              <SheetTitle className="text-base font-semibold text-white/90">
                Undang Pasangan
              </SheetTitle>
              <p className="text-xs text-white/35 mt-0.5">
                Hubungkan akun dengan pasanganmu
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.06]" />

          <InviteContent onSubmit={onSubmit} isSubmitting={isSubmitting} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { Check, X, Loader2, Mail } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { CoupleInvitation } from "@/types";

interface IncomingInvitationsCardProps {
  invitations: CoupleInvitation[];
  onAccept: (id: string) => Promise<unknown>;
  onReject: (id: string) => Promise<unknown>;
  acceptingId: string | null;
  isAccepting: boolean;
  rejectingId: string | null;
  isRejecting: boolean;
}

export function IncomingInvitationsCard({
  invitations,
  onAccept,
  onReject,
  acceptingId,
  isAccepting,
  rejectingId,
  isRejecting,
}: IncomingInvitationsCardProps) {
  if (invitations.length === 0) return null;

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="size-6 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
          <Mail size={11} className="text-purple-400" />
        </div>
        <p className="text-[10px] font-semibold text-white/35 uppercase tracking-wider">
          Undangan masuk
        </p>
      </div>

      <div className="space-y-3">
        {invitations.map((inv) => {
          const anyBusy = isAccepting || isRejecting;

          return (
            <div
              key={inv.id}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-white/[0.08] flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-white/70">
                    {inv.senderName?.charAt(0).toUpperCase() ?? "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white/90 truncate">
                    {inv.senderName}
                  </p>
                  <p className="text-xs text-white/40 truncate">{inv.senderEmail}</p>
                  <p className="text-[10px] text-white/25 mt-0.5">
                    Dikirim {formatRelativeTime(inv.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onAccept(inv.id)}
                  disabled={anyBusy}
                  className="flex-1 h-9 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.97] disabled:opacity-40"
                  style={{
                    background: anyBusy ? "rgba(255,255,255,0.07)" : "linear-gradient(135deg, #7c3aed, #db2777)",
                  }}
                >
                  {isAccepting && acceptingId === inv.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Check size={13} />
                  )}
                  Terima
                </button>
                <button
                  onClick={() => onReject(inv.id)}
                  disabled={anyBusy}
                  className="flex-1 h-9 rounded-xl text-xs font-semibold text-white/50 flex items-center justify-center gap-1.5 bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white/70 transition-all duration-200 active:scale-[0.97] disabled:opacity-40"
                >
                  {isRejecting && rejectingId === inv.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <X size={13} />
                  )}
                  Tolak
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

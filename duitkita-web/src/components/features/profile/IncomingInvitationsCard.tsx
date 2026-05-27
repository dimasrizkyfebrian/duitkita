"use client";

import { Check, X, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="bg-card rounded-2xl ring-1 ring-primary/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Mail size={14} className="text-primary" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Undangan masuk
        </p>
      </div>

      <div className="space-y-3">
        {invitations.map((inv) => {
          const isBusy =
            (isAccepting && acceptingId === inv.id) ||
            (isRejecting && rejectingId === inv.id);
          const anyBusy = isAccepting || isRejecting;

          return (
            <div
              key={inv.id}
              className="bg-muted/40 rounded-xl p-3 space-y-2.5"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {inv.senderName}
                </p>
                <p className="text-xs text-muted-foreground">{inv.senderEmail}</p>
              </div>

              <p className="text-xs text-muted-foreground">
                Dikirim {formatRelativeTime(inv.createdAt)}
              </p>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => onAccept(inv.id)}
                  disabled={anyBusy}
                >
                  {isAccepting && acceptingId === inv.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Terima
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onReject(inv.id)}
                  disabled={anyBusy}
                >
                  {isRejecting && rejectingId === inv.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <X size={14} />
                  )}
                  Tolak
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Shield,
  LogIn,
  LogOut,
  KeyRound,
  Heart,
  HeartOff,
  Mail,
  MailCheck,
  MailX,
  Ban,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Loader2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
import type { SecurityAuditLog, SecurityAuditEventType } from "@/types";

interface SecurityAuditCardProps {
  logs: SecurityAuditLog[];
  total: number;
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

const EVENT_CONFIG: Record<
  SecurityAuditEventType,
  { label: string; icon: typeof Shield }
> = {
  register_success: { label: "Akun terdaftar", icon: UserPlus },
  login_success: { label: "Login berhasil", icon: LogIn },
  login_failure: { label: "Login gagal", icon: Ban },
  password_changed: { label: "Password diubah", icon: KeyRound },
  session_revoked: { label: "Sesi dihapus", icon: LogOut },
  sessions_revoked_others: { label: "Semua sesi lain dihapus", icon: Smartphone },
  invitation_sent: { label: "Undangan terkirim", icon: Mail },
  invitation_accepted: { label: "Undangan diterima", icon: MailCheck },
  invitation_rejected: { label: "Undangan ditolak", icon: MailX },
  invitation_cancelled: { label: "Undangan dibatalkan", icon: Ban },
  partner_linked: { label: "Pasangan terhubung", icon: Heart },
  partner_unlinked: { label: "Pasangan diputuskan", icon: HeartOff },
};

function AuditSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 p-2.5">
          <div className="size-8 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-28 bg-muted rounded animate-pulse" />
            <div className="h-2.5 w-36 bg-muted rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SecurityAuditCard({
  logs,
  total,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: SecurityAuditCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card rounded-2xl ring-1 ring-foreground/10 p-4 space-y-3">
      <button
        type="button"
        className="w-full flex items-center justify-between"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-primary" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Log Keamanan
          </p>
          {total > 0 && (
            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {total}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={16} className="text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <>
          {isLoading ? (
            <AuditSkeleton />
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Belum ada log keamanan.
            </p>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => {
                const config = EVENT_CONFIG[log.eventType] ?? {
                  label: log.eventType,
                  icon: Shield,
                };
                const Icon = config.icon;

                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors"
                  >
                    <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {config.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.ipAddress ?? "IP tidak diketahui"} ·{" "}
                        {formatRelativeTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {hasNextPage && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={fetchNextPage}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <Loader2 size={14} className="animate-spin" />
              ) : null}
              Muat lebih banyak
            </Button>
          )}
        </>
      )}
    </div>
  );
}

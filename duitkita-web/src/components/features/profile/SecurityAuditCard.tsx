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
    <div className="space-y-1.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 p-2.5">
          <div className="size-8 rounded-lg bg-white/[0.08] animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-28 bg-white/[0.08] rounded animate-pulse" />
            <div className="h-2.5 w-36 bg-white/[0.06] rounded animate-pulse" />
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
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-3">
      <button
        type="button"
        className="w-full flex items-center justify-between"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <Shield size={13} className="text-purple-400" />
          <p className="text-[11px] font-semibold text-white/45 uppercase tracking-wider">
            Log Keamanan
          </p>
          {total > 0 && (
            <span className="text-[10px] font-semibold text-white/40 bg-white/[0.08] px-1.5 py-0.5 rounded-full">
              {total}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-white/30" />
        ) : (
          <ChevronDown size={14} className="text-white/30" />
        )}
      </button>

      {expanded && (
        <>
          {isLoading ? (
            <AuditSkeleton />
          ) : logs.length === 0 ? (
            <p className="text-sm text-white/40 py-2">Belum ada log keamanan.</p>
          ) : (
            <div className="space-y-0.5">
              {logs.map((log) => {
                const config = EVENT_CONFIG[log.eventType] ?? {
                  label: log.eventType,
                  icon: Shield,
                };
                const Icon = config.icon;

                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="size-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/85">{config.label}</p>
                      <p className="text-xs text-white/40">
                        {log.ipAddress ?? "IP tidak diketahui"} · {formatRelativeTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {hasNextPage && (
            <button
              onClick={fetchNextPage}
              disabled={isFetchingNextPage}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium text-white/45 hover:text-white/65 hover:bg-white/[0.04] transition-colors disabled:opacity-40"
            >
              {isFetchingNextPage && <Loader2 size={12} className="animate-spin" />}
              Muat lebih banyak
            </button>
          )}
        </>
      )}
    </div>
  );
}

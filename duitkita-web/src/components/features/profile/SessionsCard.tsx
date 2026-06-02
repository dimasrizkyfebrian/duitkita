"use client";

import { useState } from "react";
import { Smartphone, Monitor, Globe, Loader2, Trash2, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import type { Session } from "@/types";

const VISIBLE_LIMIT = 3;

interface SessionsCardProps {
  sessions: Session[];
  currentSessionId: string | null;
  isLoading: boolean;
  onRevoke: (id: string) => Promise<unknown>;
  onRevokeOthers: () => Promise<unknown>;
  revokingId: string | null;
  isRevoking: boolean;
  isRevokingOthers: boolean;
}

function parseDeviceIcon(userAgent: string | null) {
  if (!userAgent) return Globe;
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone"))
    return Smartphone;
  return Monitor;
}

function parseDeviceLabel(deviceName: string | null, userAgent: string | null): string {
  if (deviceName) return deviceName;
  if (!userAgent) return "Perangkat tidak dikenal";
  const ua = userAgent.toLowerCase();
  if (ua.includes("chrome")) return "Chrome";
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("safari") && !ua.includes("chrome")) return "Safari";
  if (ua.includes("edge")) return "Edge";
  return "Browser";
}

function SessionSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.04] rounded-xl">
          <div className="size-9 rounded-xl bg-white/[0.08] animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 bg-white/[0.08] rounded animate-pulse" />
            <div className="h-2.5 w-32 bg-white/[0.06] rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface SessionRowProps {
  session: Session;
  isCurrent: boolean;
  isThisRevoking: boolean;
  anyBusy: boolean;
  onRevoke: (id: string) => Promise<unknown>;
}

function SessionRow({ session, isCurrent, isThisRevoking, anyBusy, onRevoke }: SessionRowProps) {
  const DeviceIcon = parseDeviceIcon(session.userAgent);
  const label = parseDeviceLabel(session.deviceName, session.userAgent);

  return (
    <div className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
      <div className="size-9 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0">
        <DeviceIcon size={15} className="text-purple-400" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white/85 truncate">{label}</p>
          {isCurrent && (
            <span className="text-[10px] font-semibold text-purple-400 bg-purple-400/15 px-1.5 py-0.5 rounded-full shrink-0">
              Sesi ini
            </span>
          )}
        </div>
        <p className="text-xs text-white/40">
          {session.ipAddress ?? "IP tidak diketahui"} · Aktif{" "}
          {formatRelativeTime(session.lastActiveAt)}
        </p>
      </div>

      {!isCurrent && (
        <button
          onClick={() => onRevoke(session.id)}
          disabled={anyBusy}
          aria-label="Hapus sesi"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
        >
          {isThisRevoking ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Trash2 size={13} />
          )}
        </button>
      )}
    </div>
  );
}

export function SessionsCard({
  sessions,
  currentSessionId,
  isLoading,
  onRevoke,
  onRevokeOthers,
  revokingId,
  isRevoking,
  isRevokingOthers,
}: SessionsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const anyBusy = isRevoking || isRevokingOthers;
  const otherSessionsExist = sessions.some((s) => s.id !== currentSessionId);

  // Current session always first, then others sorted by last active
  const sorted = [
    ...sessions.filter((s) => s.id === currentSessionId),
    ...sessions.filter((s) => s.id !== currentSessionId),
  ];

  const visibleSessions = expanded ? sorted : sorted.slice(0, VISIBLE_LIMIT);
  const hiddenCount = sorted.length - VISIBLE_LIMIT;

  return (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Smartphone size={13} className="text-purple-400" />
        <p className="text-[11px] font-semibold text-white/45 uppercase tracking-wider flex-1">
          Perangkat Aktif
        </p>
        {!isLoading && sessions.length > 0 && (
          <span className="text-xs text-white/35">{sessions.length} sesi</span>
        )}
      </div>

      {isLoading ? (
        <SessionSkeleton />
      ) : sessions.length === 0 ? (
        <p className="text-sm text-white/40 py-2">Tidak ada sesi aktif.</p>
      ) : (
        <div className="space-y-1.5">
          {visibleSessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              isCurrent={session.id === currentSessionId}
              isThisRevoking={isRevoking && revokingId === session.id}
              anyBusy={anyBusy}
              onRevoke={onRevoke}
            />
          ))}

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              <ChevronDown
                size={13}
                className={cn("transition-transform duration-200", expanded && "rotate-180")}
              />
              {expanded ? "Sembunyikan" : `Lihat ${hiddenCount} sesi lainnya`}
            </button>
          )}
        </div>
      )}

      {otherSessionsExist && (
        <button
          onClick={() => onRevokeOthers()}
          disabled={anyBusy}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium text-white/55 bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] transition-colors disabled:opacity-40"
        >
          {isRevokingOthers ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <LogOut size={12} />
          )}
          Keluar dari semua perangkat lain
        </button>
      )}
    </div>
  );
}

"use client";

import { Smartphone, Monitor, Globe, Loader2, Trash2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
import type { Session } from "@/types";

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
    <div className="space-y-3">
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
          <div className="size-9 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 bg-muted rounded animate-pulse" />
            <div className="h-2.5 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
      ))}
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
  const anyBusy = isRevoking || isRevokingOthers;
  const otherSessionsExist = sessions.some((s) => s.id !== currentSessionId);

  return (
    <div className="bg-card rounded-2xl ring-1 ring-foreground/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Smartphone size={14} className="text-primary" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Perangkat Aktif
        </p>
      </div>

      {isLoading ? (
        <SessionSkeleton />
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          Tidak ada sesi aktif.
        </p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => {
            const DeviceIcon = parseDeviceIcon(session.userAgent);
            const label = parseDeviceLabel(session.deviceName, session.userAgent);
            const isCurrent = session.id === currentSessionId;
            const isThisRevoking = isRevoking && revokingId === session.id;

            return (
              <div
                key={session.id}
                className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl"
              >
                <div className="size-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <DeviceIcon size={16} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {label}
                    </p>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full shrink-0">
                        Sesi ini
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {session.ipAddress ?? "IP tidak diketahui"} · Aktif{" "}
                    {formatRelativeTime(session.lastActiveAt)}
                  </p>
                </div>

                {!isCurrent && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRevoke(session.id)}
                    disabled={anyBusy}
                    aria-label="Hapus sesi"
                  >
                    {isThisRevoking ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} className="text-destructive" />
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {otherSessionsExist && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onRevokeOthers()}
          disabled={anyBusy}
        >
          {isRevokingOthers ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <LogOut size={14} />
          )}
          Keluar dari semua perangkat lain
        </Button>
      )}
    </div>
  );
}

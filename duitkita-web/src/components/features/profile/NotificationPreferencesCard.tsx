"use client";

import { useState } from "react";
import { Bell, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationPreferences } from "@/hooks/useNotifications";
import type { UpdateNotificationPreferencesRequest } from "@/types";

const PREF_CONFIG: {
  key: keyof UpdateNotificationPreferencesRequest;
  label: string;
  description: string;
}[] = [
  { key: "budgetAlert", label: "Peringatan anggaran", description: "Notifikasi saat anggaran mendekati batas" },
  { key: "partnerActivity", label: "Aktivitas pasangan", description: "Pengeluaran baru dari pasangan" },
  { key: "weeklySummary", label: "Ringkasan mingguan", description: "Rekap pengeluaran setiap minggu" },
  { key: "reminderAlert", label: "Pengingat tagihan", description: "Notifikasi tagihan yang akan jatuh tempo" },
  { key: "recurringAlert", label: "Pengeluaran otomatis", description: "Notifikasi saat pengeluaran rutin diproses" },
];

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({ label, description, checked, disabled, onChange }: ToggleRowProps) {
  return (
    <label className="flex items-center justify-between gap-3 py-3 cursor-pointer">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/85">{label}</p>
        <p className="text-xs text-white/40">{description}</p>
      </div>
      <div className="relative shrink-0">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          className={`w-10 h-6 rounded-full transition-colors ${disabled ? "opacity-50" : ""}`}
          style={{ background: checked ? "linear-gradient(135deg, #8b2be2, #e91e8c)" : "rgba(255,255,255,0.12)" }}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              checked ? "translate-x-5" : "translate-x-1"
            }`}
          />
        </div>
      </div>
    </label>
  );
}

export function NotificationPreferencesCard() {
  const [open, setOpen] = useState(false);
  const { preferences, isLoading, updatePreferences, isUpdating } = useNotificationPreferences();

  const enabledCount = preferences
    ? PREF_CONFIG.filter(({ key }) => preferences[key]).length
    : null;

  return (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.03] transition-colors"
      >
        <Bell size={13} className="text-purple-400 shrink-0" />
        <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider flex-1 text-left">
          Notifikasi
        </span>
        {enabledCount !== null && !open && (
          <span className="text-xs text-white/35 mr-1">
            {enabledCount}/{PREF_CONFIG.length} aktif
          </span>
        )}
        <ChevronDown
          size={15}
          className={cn(
            "text-white/30 transition-transform duration-200 shrink-0",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="px-4 pb-2 border-t border-white/[0.06]">
          {isLoading ? (
            <div className="space-y-3 py-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 bg-white/[0.06] animate-pulse rounded-xl" />
              ))}
            </div>
          ) : preferences ? (
            <div className="divide-y divide-white/[0.06]">
              {PREF_CONFIG.map(({ key, label, description }) => (
                <ToggleRow
                  key={key}
                  label={label}
                  description={description}
                  checked={preferences[key]}
                  disabled={isUpdating}
                  onChange={(checked) => updatePreferences({ [key]: checked })}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

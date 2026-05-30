"use client";

import { Bell } from "lucide-react";
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
    <label className="flex items-center justify-between gap-3 cursor-pointer">
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
  const { preferences, isLoading, updatePreferences, isUpdating } = useNotificationPreferences();

  return (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Bell size={13} className="text-purple-400" />
        <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Notifikasi</span>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 bg-white/[0.06] animate-pulse rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && preferences && (
        <div className="space-y-4 divide-y divide-white/[0.06]">
          {PREF_CONFIG.map(({ key, label, description }) => (
            <div key={key} className="pt-4 first:pt-0">
              <ToggleRow
                label={label}
                description={description}
                checked={preferences[key]}
                disabled={isUpdating}
                onChange={(checked) => updatePreferences({ [key]: checked })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

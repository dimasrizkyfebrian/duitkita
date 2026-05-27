"use client";

import { Bell } from "lucide-react";
import { useNotificationPreferences } from "@/hooks/useNotifications";
import type { UpdateNotificationPreferencesRequest } from "@/types";

const PREF_CONFIG: {
  key: keyof UpdateNotificationPreferencesRequest;
  label: string;
  description: string;
}[] = [
  {
    key: "budgetAlert",
    label: "Peringatan anggaran",
    description: "Notifikasi saat anggaran mendekati batas",
  },
  {
    key: "partnerActivity",
    label: "Aktivitas pasangan",
    description: "Pengeluaran baru dari pasangan",
  },
  {
    key: "weeklySummary",
    label: "Ringkasan mingguan",
    description: "Rekap pengeluaran setiap minggu",
  },
  {
    key: "reminderAlert",
    label: "Pengingat tagihan",
    description: "Notifikasi tagihan yang akan jatuh tempo",
  },
  {
    key: "recurringAlert",
    label: "Pengeluaran otomatis",
    description: "Notifikasi saat pengeluaran rutin diproses",
  },
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
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
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
          className={`w-10 h-6 rounded-full transition-colors ${
            checked ? "bg-primary" : "bg-muted"
          } ${disabled ? "opacity-50" : ""}`}
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
  const { preferences, isLoading, updatePreferences, isUpdating } =
    useNotificationPreferences();

  return (
    <div className="bg-card rounded-2xl ring-1 ring-foreground/10 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Bell size={14} className="text-primary" />
        <span className="text-sm font-semibold text-foreground">Notifikasi</span>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && preferences && (
        <div className="space-y-4">
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
      )}
    </div>
  );
}

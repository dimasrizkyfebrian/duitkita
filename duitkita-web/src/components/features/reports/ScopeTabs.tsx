"use client";

import { Lock } from "lucide-react";
import type { ReportScope } from "@/types";

interface ScopeTabsProps {
  scope: ReportScope;
  onScopeChange: (scope: ReportScope) => void;
  hasPartner: boolean | undefined;
  desktopVariant?: boolean;
}

const TABS: { value: ReportScope; label: string }[] = [
  { value: "me", label: "Saya" },
  { value: "partner", label: "Pasangan" },
  { value: "both", label: "Berdua" },
];

export function ScopeTabs({
  scope,
  onScopeChange,
  hasPartner,
  desktopVariant = false,
}: ScopeTabsProps) {
  const partnerLocked = hasPartner === false;

  // Both mobile and desktop use the glass variant
  return (
    <div className={`flex gap-1 p-1 rounded-2xl border ${
      desktopVariant
        ? "bg-white/[0.06] border-white/[0.08]"
        : "bg-white/[0.05] border-white/[0.07] w-full"
    }`}>
      {TABS.map((tab) => {
        const locked = partnerLocked && tab.value !== "me";
        const active = scope === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => onScopeChange(tab.value)}
            className={`flex items-center justify-center gap-1.5 rounded-xl font-medium transition-all duration-200 ${
              desktopVariant ? "px-4 py-1.5 text-sm" : "flex-1 px-3 py-1.5 text-sm"
            } ${
              active
                ? "bg-white/[0.12] text-white shadow-sm"
                : "text-white/45 hover:text-white/70 hover:bg-white/[0.05]"
            }`}
          >
            {locked && <Lock size={10} className="shrink-0" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

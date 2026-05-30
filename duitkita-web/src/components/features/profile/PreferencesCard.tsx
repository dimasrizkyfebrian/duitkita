"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
] as const;

const noopSubscribe = () => () => {};

function useIsMounted(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function PreferencesCard() {
  const { theme, setTheme } = useTheme();
  const mounted = useIsMounted();
  const current = mounted ? (theme ?? "system") : null;

  return (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-white/90">Tampilan</p>
        <p className="text-xs text-white/40 mt-0.5">
          Pilih mode terang, gelap, atau ikuti sistem.
        </p>
      </div>

      <div
        className="grid grid-cols-3 gap-1 p-1 bg-white/[0.05] rounded-xl border border-white/[0.07]"
        role="radiogroup"
        aria-label="Mode tampilan"
      >
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = current === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(opt.value)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all duration-200",
                active
                  ? "bg-white/[0.12] text-white shadow-sm"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.05]",
              )}
            >
              <Icon size={15} />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

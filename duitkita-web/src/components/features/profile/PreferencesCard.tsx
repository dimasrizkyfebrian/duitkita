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
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function PreferencesCard() {
  const { theme, setTheme } = useTheme();
  const mounted = useIsMounted();

  // next-themes returns `theme` only after hydration; render neutral on SSR.
  const current = mounted ? (theme ?? "system") : null;

  return (
    <div className="bg-card rounded-2xl ring-1 ring-foreground/10 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Tampilan</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Pilih mode terang, gelap, atau ikuti sistem.
        </p>
      </div>

      <div
        className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-lg"
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
                "flex flex-col items-center justify-center gap-1 py-2 rounded-md text-xs font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon size={16} />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

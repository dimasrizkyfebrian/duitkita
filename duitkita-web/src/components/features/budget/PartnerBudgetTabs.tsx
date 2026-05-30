"use client";

import { Lock } from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type BudgetView = "me" | "partner";

interface PartnerBudgetTabsProps {
  view: BudgetView;
  onViewChange: (view: BudgetView) => void;
  noPartner: boolean;
  variant?: "default" | "glass";
}

export function PartnerBudgetTabs({
  view,
  onViewChange,
  noPartner,
  variant = "default",
}: PartnerBudgetTabsProps) {
  if (variant === "glass") {
    const tabs: { value: BudgetView; label: string }[] = [
      { value: "me", label: "Saya" },
      { value: "partner", label: "Pasangan" },
    ];
    return (
      <div className="glass-card rounded-xl p-1 flex items-center gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onViewChange(tab.value)}
            className={cn(
              "relative flex-1 py-1.5 px-4 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5",
              view === tab.value ? "text-white" : "text-white/40 hover:text-white/65",
            )}
          >
            {view === tab.value && (
              <motion.div
                layoutId="partner-tabs-glass-pill"
                className="absolute inset-0 rounded-lg"
                style={{
                  background: "linear-gradient(135deg, rgba(139,43,226,0.38), rgba(233,30,140,0.24))",
                  border: "1px solid rgba(233,30,140,0.28)",
                }}
                transition={{ type: "spring", stiffness: 450, damping: 38 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1">
              {tab.value === "partner" && noPartner && <Lock size={10} />}
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <Tabs value={view} onValueChange={(v) => onViewChange(v as BudgetView)}>
      <TabsList className="w-full">
        <TabsTrigger value="me">Saya</TabsTrigger>
        <TabsTrigger value="partner">
          {noPartner && <Lock size={11} />}
          Pasangan
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

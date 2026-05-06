"use client";

import { Lock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type BudgetView = "me" | "partner";

interface PartnerBudgetTabsProps {
  view: BudgetView;
  onViewChange: (view: BudgetView) => void;
  noPartner: boolean;
}

export function PartnerBudgetTabs({
  view,
  onViewChange,
  noPartner,
}: PartnerBudgetTabsProps) {
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

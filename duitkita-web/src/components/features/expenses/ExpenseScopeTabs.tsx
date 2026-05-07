"use client";

import { Lock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ExpenseScope } from "@/hooks/useExpenses";

interface ExpenseScopeTabsProps {
  scope: ExpenseScope;
  onScopeChange: (scope: ExpenseScope) => void;
  noPartner: boolean;
}

export function ExpenseScopeTabs({
  scope,
  onScopeChange,
  noPartner,
}: ExpenseScopeTabsProps) {
  return (
    <Tabs
      value={scope}
      onValueChange={(v) => onScopeChange(v as ExpenseScope)}
    >
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

"use client";

import { Lock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReportScope } from "@/types";

interface ScopeTabsProps {
  scope: ReportScope;
  onScopeChange: (scope: ReportScope) => void;
  hasPartner: boolean | undefined;
}

export function ScopeTabs({
  scope,
  onScopeChange,
  hasPartner,
}: ScopeTabsProps) {
  const partnerLocked = hasPartner === false;

  return (
    <Tabs value={scope} onValueChange={(v) => onScopeChange(v as ReportScope)}>
      <TabsList className="w-full">
        <TabsTrigger value="me">Saya</TabsTrigger>
        <TabsTrigger value="partner">
          {partnerLocked && <Lock size={11} />}
          Pasangan
        </TabsTrigger>
        <TabsTrigger value="both">
          {partnerLocked && <Lock size={11} />}
          Berdua
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

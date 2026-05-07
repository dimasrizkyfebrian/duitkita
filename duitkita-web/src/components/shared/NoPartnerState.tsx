"use client";

import Link from "next/link";
import { HeartCrack } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NoPartnerStateProps {
  description?: string;
}

export function NoPartnerState({
  description = "Hubungkan akun pasangan untuk lihat data berdua.",
}: NoPartnerStateProps) {
  return (
    <div className="bg-card rounded-2xl p-6 text-center space-y-3">
      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
        <HeartCrack size={20} className="text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          Belum punya pasangan
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Link href="/profile">
        <Button variant="outline" size="sm">
          Hubungkan pasangan
        </Button>
      </Link>
    </div>
  );
}

"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExpenseListPageHeader() {
  return (
    <div className="flex items-center gap-2">
      <Link href="/dashboard" aria-label="Kembali ke dashboard">
        <Button variant="ghost" size="icon-sm">
          <ChevronLeft size={18} />
        </Button>
      </Link>
      <h1 className="text-xl font-bold text-foreground">Pengeluaran</h1>
    </div>
  );
}

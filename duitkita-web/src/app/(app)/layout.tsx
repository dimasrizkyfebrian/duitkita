"use client";

import { BottomNav } from "@/components/layout/BottomNav";
import { FabButton } from "@/components/layout/FabButton";
import { ExpenseSheet } from "@/components/features/expenses/ExpenseSheet";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      <main className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
        {children}
      </main>

      <BottomNav />
      <FabButton />
      <ExpenseSheet />
    </div>
  );
}

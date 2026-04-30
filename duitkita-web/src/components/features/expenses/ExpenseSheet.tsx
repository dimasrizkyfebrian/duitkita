"use client";

import { useAppStore } from "@/stores/app.store";

export function ExpenseSheet() {
  const isOpen = useAppStore((s) => s.isExpenseSheetOpen);
  const close = useAppStore((s) => s.closeExpenseSheet);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
      onClick={close}
    >
      <div
        className="w-full max-w-md bg-card rounded-t-3xl p-6 min-h-[50vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-6" />
        <h2 className="text-lg font-bold text-foreground">Catat Pengeluaran</h2>
        <p className="text-muted-foreground text-sm mt-1">Coming soon...</p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { FabButton } from "@/components/layout/FabButton";
import { ExpenseSheet } from "@/components/features/expenses/ExpenseSheet";
import { useAuthStore } from "@/stores/auth.store";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { useOfflineSync } from "@/hooks/useOfflineSync";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  useOfflineSync();
  const [hasHydrated, setHasHydrated] = useState(() => {
    if (typeof window === "undefined") return false;
    return useAuthStore.persist?.hasHydrated() ?? false;
  });

  useEffect(() => {
    return useAuthStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-dvh overflow-hidden bg-background flex flex-col max-w-md mx-auto relative">
      <OfflineBanner />
      <main className="flex-1 overflow-y-auto pb-28 scrollbar-hide overscroll-none">
        {children}
      </main>

      <BottomNav />
      <FabButton />
      <ExpenseSheet />
    </div>
  );
}

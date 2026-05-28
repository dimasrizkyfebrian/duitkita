"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/layout/BottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { ExpenseSheet } from "@/components/features/expenses/ExpenseSheet";
import { useAuthStore } from "@/stores/auth.store";
import { useAppStore } from "@/stores/app.store";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { useOfflineSync } from "@/hooks/useOfflineSync";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isSidebarCollapsed = useAppStore((s) => s.isSidebarCollapsed);
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
    <div className="dark flex h-dvh lg:h-screen overflow-hidden desktop-bg">
      {/* Spacer pushes content right to account for fixed floating sidebar */}
      <motion.div
        className="hidden lg:block shrink-0"
        animate={{ width: isSidebarCollapsed ? 84 : 256 }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      />

      {/* Single content column */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto pb-28 lg:pb-0 scrollbar-hide overscroll-none">
          {children}
        </main>
      </div>

      {/* Mobile-only bottom nav (FAB integrated inside) */}
      <div className="lg:hidden">
        <BottomNav />
      </div>

      <ExpenseSheet />

      {/* Floating sidebar — fixed positioning, rendered outside flex flow */}
      <Sidebar />
    </div>
  );
}

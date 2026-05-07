"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import Aurora from "@/components/ui/aurora";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-900">
      {/* Aurora animated background */}
      <div className="absolute inset-0 z-0">
        <Aurora
          colorStops={["#F59E0B", "#D97706", "#FCD34D"]}
          blend={0.6}
          amplitude={0.9}
          speed={0.4}
        />
      </div>

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 z-10 bg-slate-900/55" />

      {/* Content */}
      <div className="relative z-20 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Glassmorphism card */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl px-8 py-10 shadow-2xl shadow-black/30">
            {/* Branding */}
            <div className="text-center mb-8">
              <Image
                src="/icons/icon-192x192.png"
                alt="DuitKita"
                width={56}
                height={56}
                className="inline-block rounded-2xl mb-4 shadow-lg shadow-amber-500/40"
                priority
              />
              <h1 className="text-2xl font-bold text-white">DuitKita</h1>
              <p className="text-white/55 text-sm mt-1">
                Kelola keuangan bersama pasangan
              </p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

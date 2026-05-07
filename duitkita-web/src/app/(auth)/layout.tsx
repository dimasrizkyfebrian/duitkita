"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mb-4">
            <Image
              src="/icons/icon-192x192.png"
              alt="DuitKita"
              width={56}
              height={56}
              className="rounded-2xl mx-auto"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">DuitKita</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola keuangan bersama pasangan
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

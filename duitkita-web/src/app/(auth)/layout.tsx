"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth.store";
import Aurora from "@/components/ui/aurora";
import BlurText from "@/components/ui/blur-text";

const subtitleWords = "Kelola keuangan bersama pasangan".split(" ");

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
    <div
      className="relative min-h-screen overflow-auto"
      style={{
        background:
          "linear-gradient(135deg, #1a0533 0%, #2d0b5e 50%, #1a0533 100%)",
      }}
    >
      {/* Aurora overlay */}
      <div className="fixed inset-0 z-0 opacity-55 pointer-events-none">
        <Aurora
          colorStops={["#2d0b5e", "#8b2be2", "#e91e8c"]}
          blend={0.45}
          amplitude={0.8}
          speed={0.35}
        />
      </div>

      {/* Floating orbs */}
      <div
        className="fixed -top-48 -right-48 w-[480px] h-[480px] rounded-full opacity-20 blur-3xl pointer-events-none z-0"
        style={{
          background: "radial-gradient(circle, #e91e8c 0%, transparent 70%)",
          animation: "float 5s ease-in-out infinite",
        }}
      />
      <div
        className="fixed -bottom-48 -left-48 w-[480px] h-[480px] rounded-full opacity-15 blur-3xl pointer-events-none z-0"
        style={{
          background: "radial-gradient(circle, #8b2be2 0%, transparent 70%)",
          animation: "float 7s ease-in-out infinite",
          animationDelay: "2s",
        }}
      />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none z-0"
        style={{
          background: "radial-gradient(circle, #c08aff 0%, transparent 70%)",
          animation: "float 6s ease-in-out infinite",
          animationDelay: "3.5s",
        }}
      />

      {/* Centered card */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-sm">
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-3xl px-8 py-9 shadow-2xl shadow-black/50"
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            {/* Branding */}
            <div className="flex flex-col items-center mb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                className="mb-4"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl"
                  style={{
                    background:
                      "linear-gradient(135deg, #8b2be2 0%, #e91e8c 100%)",
                    boxShadow:
                      "0 8px 32px rgba(139, 43, 226, 0.45), 0 2px 8px rgba(0,0,0,0.3)",
                  }}
                >
                  <Image
                    src="/icons/icon-192x192.png"
                    alt="DuitKita"
                    width={40}
                    height={40}
                    className="rounded-xl"
                    priority
                  />
                </div>
              </motion.div>

              <BlurText
                text="DuitKita"
                className="text-[26px] font-bold text-white justify-center tracking-tight"
                animateBy="letters"
                delay={55}
                direction="top"
              />

              <div className="flex flex-wrap justify-center gap-x-[5px] mt-1.5">
                {subtitleWords.map((word, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.55 + i * 0.07,
                      duration: 0.3,
                      ease: "easeOut",
                    }}
                    className="text-sm text-white/50"
                  >
                    {word}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Form content */}
            {children}
          </motion.div>

          {/* Footer hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="text-center text-xs text-white/25 mt-6"
          >
            DuitKita · v2 © {new Date().getFullYear()}
          </motion.p>
        </div>
      </div>
    </div>
  );
}

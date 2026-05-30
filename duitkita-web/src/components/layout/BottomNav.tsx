"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Wallet, BarChart2, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app.store";

const NAV_LEFT = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/budget", icon: Wallet, label: "Budget" },
];

const NAV_RIGHT = [
  { href: "/reports", icon: BarChart2, label: "Laporan" },
  { href: "/profile", icon: User, label: "Profil" },
];

export function BottomNav() {
  const pathname = usePathname();
  const openExpenseSheet = useAppStore((s) => s.openExpenseSheet);

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
      <nav
        className="flex items-center h-16 px-1"
        style={{
          background: "rgba(28, 10, 58, 0.72)",
          backdropFilter: "blur(24px) saturate(200%)",
          WebkitBackdropFilter: "blur(24px) saturate(200%)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: "28px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {/* Left nav items */}
        {NAV_LEFT.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return <NavItem key={item.href} {...item} isActive={isActive} />;
        })}

        {/* Center FAB */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={openExpenseSheet}
          className="mx-2 w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg, #8b2be2 0%, #e91e8c 100%)",
            boxShadow: "0 4px 16px rgba(139,43,226,0.50)",
          }}
          aria-label="Catat pengeluaran"
        >
          <Plus size={20} className="text-white" strokeWidth={2.5} />
        </motion.button>

        {/* Right nav items */}
        {NAV_RIGHT.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href);
          return <NavItem key={item.href} {...item} isActive={isActive} />;
        })}
      </nav>
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className="relative flex flex-col items-center justify-center gap-0.5 py-2 w-16 transition-colors duration-150"
    >
      {isActive && (
        <motion.div
          layoutId="bottom-nav-pill"
          className="absolute inset-x-1 inset-y-1 rounded-[20px]"
          style={{ background: "rgba(139, 43, 226, 0.28)" }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}

      <div className="relative flex flex-col items-center gap-0.5">
        <Icon
          size={20}
          strokeWidth={isActive ? 2.5 : 1.75}
          className={cn(
            "transition-colors duration-150",
            isActive ? "text-purple-300" : "text-white/40"
          )}
        />
        <span
          className={cn(
            "text-[10px] font-medium transition-colors duration-150",
            isActive ? "text-purple-200 font-semibold" : "text-white/35"
          )}
        >
          {label}
        </span>
      </div>
    </Link>
  );
}

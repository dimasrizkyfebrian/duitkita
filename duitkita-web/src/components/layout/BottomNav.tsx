"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, BarChart2, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/budget", icon: Wallet, label: "Budget" },
  { href: "/reports", icon: BarChart2, label: "Laporan" },
  { href: "/profile", icon: User, label: "Profil" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card border-t border-border pb-safe z-40">
      <div className="flex items-center h-16">
        {navItems.slice(0, 2).map((item) => (
          <NavItem key={item.href} {...item} isActive={pathname === item.href} />
        ))}

        <div className="flex-1" />

        {navItems.slice(2).map((item) => (
          <NavItem key={item.href} {...item} isActive={pathname === item.href} />
        ))}
      </div>
    </nav>
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
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-0.5 py-2",
        "transition-colors duration-150",
        isActive ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
      <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>
        {label}
      </span>
    </Link>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  BarChart2,
  Activity,
  Bell,
  BellRing,
  RefreshCw,
  AlarmClock,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Plus,
  User,
  Settings,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth.store";
import { useAppStore } from "@/stores/app.store";
import { useNotifications } from "@/hooks/useNotifications";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "duitkita_sidebar_collapsed";

const NAV_GROUPS = [
  {
    label: "UTAMA",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/budget", icon: Wallet, label: "Budget" },
      { href: "/expenses", icon: Receipt, label: "Pengeluaran" },
      { href: "/reports", icon: BarChart2, label: "Laporan" },
    ],
  },
  {
    label: "KELOLA",
    items: [
      { href: "/notifications", icon: Bell, label: "Notifikasi" },
      { href: "/activity", icon: Activity, label: "Aktivitas" },
      { href: "/reminders", icon: AlarmClock, label: "Pengingat" },
      { href: "/recurring", icon: RefreshCw, label: "Berulang" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const openExpenseSheet = useAppStore((s) => s.openExpenseSheet);
  const { isSidebarCollapsed: collapsed, setSidebarCollapsed } = useAppStore();
  const { unreadCount } = useNotifications();

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setSidebarCollapsed(stored === "true");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() {
    const next = !collapsed;
    setSidebarCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  const sidebarW = collapsed ? 68 : 240;

  return (
    <motion.aside
      animate={{ width: sidebarW }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="hidden lg:flex fixed top-4 left-4 bottom-4 z-50 flex-col rounded-2xl overflow-hidden"
      style={{
        background: "rgba(15, 5, 32, 0.85)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.06)",
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-center h-14 px-3 shrink-0 border-b border-white/[0.06]">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              key="logo-expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2.5 flex-1 overflow-hidden"
            >
              <div
                className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "linear-gradient(135deg, #8b2be2 0%, #e91e8c 100%)" }}
              >
                D
              </div>
              <span className="text-white font-semibold text-sm whitespace-nowrap purple-gradient-text">
                DuitKita
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="logo-collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold mx-auto"
              style={{ background: "linear-gradient(135deg, #8b2be2 0%, #e91e8c 100%)" }}
            >
              D
            </motion.div>
          )}
        </AnimatePresence>

        {!collapsed && (
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={15} />
          </button>
        )}
      </div>

      {/* ── Expand toggle (collapsed state) ── */}
      {collapsed && (
        <button
          onClick={toggle}
          className="mx-auto mt-2 p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          aria-label="Expand sidebar"
        >
          <ChevronRight size={15} />
        </button>
      )}

      {/* ── Catat Pengeluaran (glassmorphism) ── */}
      <div className={cn("px-2.5 mt-3 mb-1 shrink-0", collapsed && "flex justify-center px-2")}>
        <button
          onClick={openExpenseSheet}
          title={collapsed ? "Catat Pengeluaran" : undefined}
          className={cn(
            "flex items-center gap-2 rounded-xl text-sm font-medium text-white/80 transition-all duration-200",
            "hover:text-white hover:bg-white/[0.08] active:scale-95",
            "border border-white/[0.10] bg-white/[0.04]",
            collapsed
              ? "w-10 h-10 justify-center p-0"
              : "w-full px-3 py-2.5"
          )}
        >
          <Plus size={15} className="shrink-0" />
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="whitespace-nowrap"
            >
              Catat Pengeluaran
            </motion.span>
          )}
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-4 scrollbar-hide">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {/* Section label — only when expanded */}
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-2.5 mb-1.5"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="space-y-0.5">
              {group.items.map(({ href, icon: Icon, label }) => {
                const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                const isNotif = href === "/notifications";
                const showBadge = isNotif && unreadCount > 0;

                return (
                  <Link
                    key={href}
                    href={href}
                    title={collapsed ? label : undefined}
                    className={cn(
                      "relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-200 group",
                      isActive
                        ? "text-white bg-white/[0.08] border border-white/[0.10]"
                        : "text-white/45 hover:text-white/80 hover:bg-white/[0.05]",
                      collapsed && "justify-center px-0 py-2.5"
                    )}
                  >
                    <div className="relative shrink-0">
                      <Icon
                        size={16}
                        className={cn(
                          "transition-colors",
                          isActive ? "text-purple-300" : "text-white/40 group-hover:text-white/70"
                        )}
                      />
                      {/* Unread dot on icon (visible when collapsed) */}
                      {showBadge && collapsed && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-pink-500 border border-black/40" />
                      )}
                    </div>

                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -4 }}
                          transition={{ duration: 0.15 }}
                          className="whitespace-nowrap overflow-hidden flex-1"
                        >
                          {label}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Unread badge (expanded) */}
                    {showBadge && !collapsed && (
                      <span className="shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-pink-500 text-white text-[10px] font-bold px-1">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}

                    {/* Active indicator dot (only when no badge) */}
                    {isActive && !collapsed && !showBadge && (
                      <motion.span
                        layoutId="sidebar-active"
                        className="w-1 h-1 rounded-full bg-purple-400 shrink-0"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User avatar with dropdown ── */}
      <div className="shrink-0 p-2 border-t border-white/[0.06]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all duration-200",
                "text-white/60 hover:text-white hover:bg-white/[0.06] outline-none",
                collapsed && "justify-center px-0 py-2.5"
              )}
              title={collapsed ? user?.name ?? "Akun" : undefined}
            >
              <UserAvatar
                userId={user?.id ?? ""}
                name={user?.name ?? ""}
                hasAvatar={user?.hasAvatar ?? false}
                className="w-7 h-7 ring-1 ring-white/[0.12] shrink-0"
              />

              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 min-w-0 text-left overflow-hidden"
                  >
                    <p className="text-xs font-medium text-white/80 truncate">{user?.name}</p>
                    <p className="text-[10px] text-white/35 truncate">{user?.email}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {!collapsed && (
                <Settings size={13} className="shrink-0 text-white/25" />
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="w-56 bg-[#0f0520]/95 border-white/[0.10] text-white backdrop-blur-xl"
          >
            <DropdownMenuLabel className="font-normal pb-1">
              <p className="text-sm font-medium text-white/90">{user?.name}</p>
              <p className="text-xs text-white/40">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/[0.08]" />
            <DropdownMenuItem asChild className="gap-2.5 text-white/70 hover:text-white focus:text-white focus:bg-white/[0.08] cursor-pointer">
              <Link href="/profile">
                <User size={14} />
                Profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="gap-2.5 text-white/70 hover:text-white focus:text-white focus:bg-white/[0.08] cursor-pointer">
              <Link href="/notifications" className="flex items-center gap-2.5 w-full">
                <Bell size={14} />
                <span className="flex-1">Notifikasi</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-pink-500/20 text-pink-400 text-[10px] font-bold rounded-full">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/[0.08]" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="gap-2.5 text-red-400/80 hover:text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
            >
              <LogOut size={14} />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.aside>
  );
}

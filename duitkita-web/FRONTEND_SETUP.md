# DuitKita — Frontend Setup Guide

> Eksekusi panduan ini secara berurutan menggunakan Claude Code.
> Stack: Next.js 14 + Tailwind CSS + shadcn/ui + TanStack Query + Zustand + Axios + Framer Motion + next-pwa

---

## Step 1 — Scaffold Next.js Project

Pastikan posisi terminal ada di root folder monorepo `DuitKita/` (sejajar dengan `duitkita-api/`).

```bash
npx create-next-app@latest duitkita-web \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack
```

Saat ditanya interaktif, pilih semua **Yes** kecuali Turbopack (pilih **No**).

```bash
cd duitkita-web
```

---

## Step 2 — Install Semua Dependencies

```bash
# Data fetching & HTTP
npm install @tanstack/react-query@5 axios

# Global state
npm install zustand

# Animation
npm install framer-motion

# Dark mode
npm install next-themes

# PWA
npm install next-pwa

# Form handling & validation
npm install react-hook-form zod @hookform/resolvers

# Date utilities
npm install date-fns

# Class utilities (sudah ada dari shadcn tapi pastikan)
npm install clsx tailwind-merge class-variance-authority

# Dev dependencies
npm install -D @tanstack/react-query-devtools
```

---

## Step 3 — Setup shadcn/ui

```bash
npx shadcn@latest init
```

Saat ditanya konfigurasi, pilih:

- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**

Install komponen shadcn yang akan dipakai DuitKita:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add badge
npx shadcn@latest add avatar
npx shadcn@latest add progress
npx shadcn@latest add sheet
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add toast
npx shadcn@latest add tabs
npx shadcn@latest add select
npx shadcn@latest add separator
npx shadcn@latest add skeleton
```

---

## Step 4 — Setup Environment Variables

Buat file `.env.local` di root `duitkita-web/`:

```bash
cat > .env.local << 'EOF'
# URL backend Railway/Koyeb
NEXT_PUBLIC_API_URL=https://duitkita-production.up.railway.app

# App info
NEXT_PUBLIC_APP_NAME=DuitKita
NEXT_PUBLIC_APP_VERSION=1.0.0
EOF
```

Buat `.env.example` untuk git:

```bash
cat > .env.example << 'EOF'
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
NEXT_PUBLIC_APP_NAME=DuitKita
NEXT_PUBLIC_APP_VERSION=1.0.0
EOF
```

Tambahkan ke `.gitignore`:

```bash
echo ".env.local" >> .gitignore
```

---

## Step 5 — Setup Custom Design Tokens (Tailwind Config)

Ganti isi `tailwind.config.ts` dengan konfigurasi design system DuitKita:

```bash
cat > tailwind.config.ts << 'EOF'
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Amber Slate palette DuitKita
        primary: {
          DEFAULT: "#F59E0B",
          light: "#FBBF24",
          dark: "#D97706",
          tint: "#FEF3C7",
        },
        slate: {
          text: "#1E293B",
          accent: "#334155",
          muted: "#64748B",
          surface: "#F1F5F9",
          border: "#E2E8F0",
        },
        success: "#10B981",
        warning: "#F97316",
        danger: "#EF4444",
        background: {
          DEFAULT: "#FAFAF9",
          dark: "#0F172A",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          dark: "#1E293B",
        },
        // shadcn/ui compatibility
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        foreground: "hsl(var(--foreground))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        // DuitKita playful radius system
        badge: "4px",
        button: "8px",
        card: "16px",
        sheet: "24px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "pulse-once": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.25s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "pulse-once": "pulse-once 0.4s ease-in-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
EOF
```

---

## Step 6 — Setup Global CSS

Ganti isi `src/app/globals.css`:

```bash
cat > src/app/globals.css << 'EOF'
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* shadcn/ui base variables — disesuaikan ke Amber Slate palette */
    --background: 60 9% 97%;
    --foreground: 215 28% 17%;
    --card: 0 0% 100%;
    --card-foreground: 215 28% 17%;
    --popover: 0 0% 100%;
    --popover-foreground: 215 28% 17%;
    --primary: 38 92% 50%;
    --primary-foreground: 0 0% 100%;
    --secondary: 213 27% 94%;
    --secondary-foreground: 215 28% 17%;
    --muted: 213 27% 94%;
    --muted-foreground: 215 16% 47%;
    --accent: 213 27% 94%;
    --accent-foreground: 215 28% 17%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 213 27% 89%;
    --input: 213 27% 89%;
    --ring: 38 92% 50%;
    --radius: 0.75rem;
  }

  .dark {
    --background: 222 47% 7%;
    --foreground: 213 27% 89%;
    --card: 215 28% 17%;
    --card-foreground: 213 27% 89%;
    --popover: 215 28% 17%;
    --popover-foreground: 213 27% 89%;
    --primary: 43 96% 56%;
    --primary-foreground: 215 28% 17%;
    --secondary: 215 25% 27%;
    --secondary-foreground: 213 27% 89%;
    --muted: 215 25% 27%;
    --muted-foreground: 215 16% 57%;
    --accent: 215 25% 27%;
    --accent-foreground: 213 27% 89%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;
    --border: 215 25% 27%;
    --input: 215 25% 27%;
    --ring: 43 96% 56%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground font-sans antialiased;
  }

  /* Mobile safe area untuk PWA */
  html {
    height: -webkit-fill-available;
  }
  body {
    min-height: 100vh;
    min-height: -webkit-fill-available;
  }
}

@layer utilities {
  /* Custom scrollbar — lebih clean */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* Safe area untuk bottom nav di iPhone */
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom);
  }
  .mb-safe {
    margin-bottom: env(safe-area-inset-bottom);
  }
}
EOF
```

---

## Step 7 — Setup Struktur Folder

```bash
# Buat semua folder sekaligus
mkdir -p src/app/\(auth\)/login
mkdir -p src/app/\(auth\)/register
mkdir -p src/app/\(app\)/dashboard
mkdir -p src/app/\(app\)/budget
mkdir -p src/app/\(app\)/reports
mkdir -p src/app/\(app\)/profile
mkdir -p src/components/ui
mkdir -p src/components/layout
mkdir -p src/components/features/dashboard
mkdir -p src/components/features/budget
mkdir -p src/components/features/expenses
mkdir -p src/components/features/reports
mkdir -p src/components/features/profile
mkdir -p src/components/shared
mkdir -p src/lib
mkdir -p src/hooks
mkdir -p src/stores
mkdir -p src/types
mkdir -p src/config
```

Struktur folder final setelah setup:

```
duitkita-web/
├── public/
│   ├── icons/              ← PWA icons (192x192, 512x512)
│   └── manifest.json       ← PWA manifest
├── src/
│   ├── app/
│   │   ├── (auth)/         ← Route group: tanpa layout app
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx  ← Auth layout (centered card)
│   │   ├── (app)/          ← Route group: dengan bottom nav
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── budget/
│   │   │   │   └── page.tsx
│   │   │   ├── reports/
│   │   │   │   └── page.tsx
│   │   │   ├── profile/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx  ← App layout (bottom nav + FAB)
│   │   ├── globals.css
│   │   ├── layout.tsx      ← Root layout (providers)
│   │   └── page.tsx        ← Redirect ke /dashboard atau /login
│   ├── components/
│   │   ├── ui/             ← shadcn/ui components (auto-generated)
│   │   ├── layout/
│   │   │   ├── BottomNav.tsx
│   │   │   ├── FabButton.tsx
│   │   │   └── PageHeader.tsx
│   │   ├── features/
│   │   │   ├── dashboard/
│   │   │   │   ├── GreetingCard.tsx
│   │   │   │   ├── SummaryCard.tsx
│   │   │   │   ├── ActivityFeed.tsx
│   │   │   │   ├── BudgetList.tsx
│   │   │   │   └── AlertBanner.tsx
│   │   │   ├── budget/
│   │   │   │   ├── BudgetCard.tsx
│   │   │   │   ├── BudgetForm.tsx
│   │   │   │   ├── CategoryManager.tsx
│   │   │   │   └── MonthSwitcher.tsx
│   │   │   ├── expenses/
│   │   │   │   ├── ExpenseSheet.tsx    ← Bottom sheet utama
│   │   │   │   ├── NumPad.tsx          ← Custom numpad besar
│   │   │   │   ├── CategoryPicker.tsx
│   │   │   │   └── ExpenseList.tsx
│   │   │   ├── reports/
│   │   │   │   ├── DonutChart.tsx
│   │   │   │   ├── TrendChart.tsx
│   │   │   │   ├── TopExpenses.tsx
│   │   │   │   └── ReportTabs.tsx
│   │   │   └── profile/
│   │   │       ├── ProfileCard.tsx
│   │   │       ├── PartnerCard.tsx
│   │   │       ├── InviteCode.tsx
│   │   │       └── ThemeToggle.tsx
│   │   └── shared/
│   │       ├── LoadingSkeleton.tsx
│   │       ├── ErrorState.tsx
│   │       ├── EmptyState.tsx
│   │       ├── ProgressBar.tsx         ← Budget progress bar dengan warna alert
│   │       ├── BudgetBadge.tsx         ← Badge ok/warning/danger/over
│   │       ├── CurrencyDisplay.tsx     ← Format Rp dengan locale ID
│   │       └── UserAvatar.tsx          ← Avatar dengan initial letter
│   ├── lib/
│   │   ├── api.ts          ← Axios instance + interceptors
│   │   ├── utils.ts        ← cn(), formatCurrency(), formatDate(), dll
│   │   └── constants.ts    ← Alert thresholds, API routes, dll
│   ├── hooks/
│   │   ├── useBudgets.ts
│   │   ├── useExpenses.ts
│   │   ├── useReports.ts
│   │   ├── useActivity.ts
│   │   ├── useCategories.ts
│   │   └── useProfile.ts
│   ├── stores/
│   │   ├── auth.store.ts   ← Zustand: user + JWT token
│   │   └── app.store.ts    ← Zustand: activeMonth + UI state
│   ├── types/
│   │   └── index.ts        ← Semua TypeScript types/interfaces
│   └── config/
│       └── query.ts        ← TanStack Query client config
├── .env.local
├── .env.example
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Step 8 — Setup Root Layout dengan Providers

```bash
cat > src/app/layout.tsx << 'EOF'
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "@/components/shared/QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "DuitKita",
  description: "Aplikasi pencatatan keuangan untuk pasangan",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DuitKita",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F59E0B" },
    { media: "(prefers-color-scheme: dark)", color: "#FBBF24" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster
              position="top-center"
              richColors
              toastOptions={{
                duration: 2000,
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
EOF
```

---

## Step 9 — Setup QueryProvider Component

```bash
cat > src/components/shared/QueryProvider.tsx << 'EOF'
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,        // 1 menit sebelum data dianggap stale
            gcTime: 5 * 60 * 1000,       // 5 menit sebelum cache dibersihkan
            retry: 1,                    // Retry 1x jika gagal
            refetchOnWindowFocus: true,  // Refetch saat kembali ke app
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
EOF
```

---

## Step 10 — Setup Axios Instance

```bash
cat > src/lib/api.ts << 'EOF'
import axios from "axios";
import { useAuthStore } from "@/stores/auth.store";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — attach JWT token otomatis
api.interceptors.request.use(
  (config) => {
    // Ambil token dari Zustand store (harus pakai getState, bukan hook)
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 (token expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired atau invalid — auto logout
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
EOF
```

---

## Step 11 — Setup Zustand Stores

### Auth Store

```bash
cat > src/stores/auth.store.ts << 'EOF'
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) =>
        set({ user, token, isAuthenticated: true }),

      updateUser: (updatedUser) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedUser } : null,
        })),

      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: "duitkita-auth",        // key di localStorage
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({     // hanya simpan token & user, bukan fungsi
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
EOF
```

### App Store

```bash
cat > src/stores/app.store.ts << 'EOF'
import { create } from "zustand";

interface AppState {
  // Active month untuk semua halaman yang butuh filter bulan
  activeYear: number;
  activeMonth: number;
  setActiveMonth: (year: number, month: number) => void;

  // Bottom sheet catat pengeluaran
  isExpenseSheetOpen: boolean;
  openExpenseSheet: () => void;
  closeExpenseSheet: () => void;

  // Pre-fill kategori jika user klik dari budget card
  selectedCategoryId: string | null;
  setSelectedCategoryId: (id: string | null) => void;
}

const now = new Date();

export const useAppStore = create<AppState>()((set) => ({
  activeYear: now.getFullYear(),
  activeMonth: now.getMonth() + 1,

  setActiveMonth: (year, month) =>
    set({ activeYear: year, activeMonth: month }),

  isExpenseSheetOpen: false,
  openExpenseSheet: () => set({ isExpenseSheetOpen: true }),
  closeExpenseSheet: () =>
    set({ isExpenseSheetOpen: false, selectedCategoryId: null }),

  selectedCategoryId: null,
  setSelectedCategoryId: (id) => set({ selectedCategoryId: id }),
}));
EOF
```

---

## Step 12 — Setup TypeScript Types

```bash
cat > src/types/index.ts << 'EOF'
// ─────────────────────────────────────────
// Entity Types (mirror dari backend entities)
// ─────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  createdAt: string;
}

export interface MonthlyBudget {
  id: string;
  userId: string;
  categoryId: string;
  category: Category;
  year: number;
  month: number;
  baseAmount: number;
  rolloverAmount: number;
  totalAmount: number;
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  alertStatus: AlertStatus;
  isFinalized: boolean;
}

export interface Expense {
  id: string;
  userId: string;
  categoryId: string;
  category: Category;
  monthlyBudgetId: string;
  amount: number;
  note: string | null;
  expenseDate: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  actorId: string;
  actorName: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  meta: ActivityMeta;
  createdAt: string;
}

// ─────────────────────────────────────────
// Enums
// ─────────────────────────────────────────

export type AlertStatus = "ok" | "warning" | "danger" | "over";

export type ActivityAction = "created" | "updated" | "deleted";

export type ActivityEntityType = "expense" | "budget";

// ─────────────────────────────────────────
// Meta types
// ─────────────────────────────────────────

export interface ActivityMeta {
  amount?: number;
  note?: string | null;
  categoryName?: string;
  categoryIcon?: string | null;
  expenseDate?: string;
  baseAmount?: number;
  year?: number;
  month?: number;
}

// ─────────────────────────────────────────
// Report Types
// ─────────────────────────────────────────

export interface MonthlyReport {
  userId: string;
  userName: string;
  year: number;
  month: number;
  totalBudgeted: number;
  totalRollover: number;
  totalEffectiveBudget: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentageUsed: number;
  categories: CategoryReportItem[];
}

export interface CategoryReportItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  baseAmount: number;
  rolloverAmount: number;
  totalAmount: number;
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  alertStatus: AlertStatus;
  expenseCount: number;
  topExpenses: TopExpense[];
}

export interface TopExpense {
  id: string;
  amount: number;
  note: string | null;
  expenseDate: string;
}

export interface TrendItem {
  year: number;
  month: number;
  totalSpent: number;
  totalBudget: number;
  percentageUsed: number;
}

// ─────────────────────────────────────────
// API Request/Response Types
// ─────────────────────────────────────────

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface CreateExpenseRequest {
  categoryId: string;
  amount: number;
  note?: string;
  expenseDate: string; // ISO: "2025-05-14"
}

export interface CreateBudgetRequest {
  categoryId: string;
  year: number;
  month: number;
  baseAmount: number;
}

export interface UpdateBudgetRequest {
  baseAmount?: number;
}

export interface CreateCategoryRequest {
  name: string;
  icon?: string;
}

export interface PaginatedActivity {
  data: Activity[];
  total: number;
  limit: number;
  offset: number;
}
EOF
```

---

## Step 13 — Setup Utility Functions

```bash
cat > src/lib/utils.ts << 'EOF'
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AlertStatus } from "@/types";

// shadcn/ui utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format angka ke Rupiah
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format singkat: 1.500.000 → 1,5jt
export function formatCurrencyShort(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace(".", ",")}jt`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}rb`;
  }
  return amount.toString();
}

// Format tanggal ke bahasa Indonesia
export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateString));
}

// Format tanggal relatif (5 menit lalu, kemarin, dll)
export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays === 1) return "Kemarin";
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return formatDate(dateString);
}

// Nama bulan Indonesia
export const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? "";
}

// Hitung sisa hari dalam bulan ini
export function getRemainingDays(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.getDate() - now.getDate();
}

// Warna berdasarkan alertStatus
export function getAlertColor(status: AlertStatus): string {
  switch (status) {
    case "ok": return "text-success";
    case "warning": return "text-warning";
    case "danger": return "text-warning";
    case "over": return "text-danger";
    default: return "text-slate-muted";
  }
}

// Background berdasarkan alertStatus
export function getAlertBg(status: AlertStatus): string {
  switch (status) {
    case "ok": return "bg-green-100 text-green-800";
    case "warning": return "bg-amber-100 text-amber-800";
    case "danger": return "bg-orange-100 text-orange-800";
    case "over": return "bg-red-100 text-red-800";
    default: return "bg-slate-100 text-slate-800";
  }
}

// Label badge berdasarkan alertStatus
export function getAlertLabel(status: AlertStatus): string {
  switch (status) {
    case "ok": return "Aman";
    case "warning": return "Hampir habis";
    case "danger": return "Kritis";
    case "over": return "Over!";
    default: return "";
  }
}

// Progress bar color berdasarkan alertStatus
export function getProgressColor(status: AlertStatus): string {
  switch (status) {
    case "ok": return "bg-success";
    case "warning": return "bg-warning";
    case "danger": return "bg-warning";
    case "over": return "bg-danger";
    default: return "bg-slate-surface";
  }
}

// Get 2 initial letter dari nama
export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}
EOF
```

---

## Step 14 — Setup Constants

```bash
cat > src/lib/constants.ts << 'EOF'
// Alert thresholds — konsisten dengan backend
export const ALERT_WARNING_THRESHOLD = 80;  // persen
export const ALERT_DANGER_THRESHOLD = 95;   // persen

// API routes — semua endpoint backend
export const API_ROUTES = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
  },
  users: {
    me: "/users/me",
    updateMe: "/users/me",
    changePassword: "/users/me/password",
  },
  categories: {
    list: "/categories",
    create: "/categories",
    update: (id: string) => `/categories/${id}`,
    delete: (id: string) => `/categories/${id}`,
  },
  budgets: {
    list: "/budgets",
    create: "/budgets",
    update: (id: string) => `/budgets/${id}`,
    delete: (id: string) => `/budgets/${id}`,
    partner: "/budgets/partner",
    finalize: "/budgets/finalize",
  },
  expenses: {
    list: "/expenses",
    create: "/expenses",
    update: (id: string) => `/expenses/${id}`,
    delete: (id: string) => `/expenses/${id}`,
    byBudget: (budgetId: string) => `/expenses/by-budget/${budgetId}`,
    partner: "/expenses/partner",
  },
  reports: {
    monthly: "/reports/monthly",
    couple: "/reports/couple",
    trend: "/reports/trend",
    categoryTrend: "/reports/trend/category",
    rollover: "/reports/rollover",
  },
  activity: {
    list: "/activity",
    recent: "/activity/recent",
  },
  couples: {
    link: "/couples/link",
    partner: "/couples/partner",
    unlink: "/couples/partner",
  },
} as const;

// Query keys — untuk TanStack Query cache invalidation
export const QUERY_KEYS = {
  budgets: (year: number, month: number) => ["budgets", year, month],
  budgetsPartner: (year: number, month: number) => ["budgets", "partner", year, month],
  expenses: (year: number, month: number, categoryId?: string) =>
    ["expenses", year, month, categoryId].filter(Boolean),
  categories: () => ["categories"],
  activity: () => ["activity"],
  activityRecent: () => ["activity", "recent"],
  reports: {
    monthly: (year: number, month: number) => ["reports", "monthly", year, month],
    couple: (year: number, month: number) => ["reports", "couple", year, month],
    trend: (monthsBack: number) => ["reports", "trend", monthsBack],
    categoryTrend: (monthsBack: number) => ["reports", "trend", "category", monthsBack],
  },
  profile: () => ["profile"],
  partner: () => ["partner"],
} as const;

// App config
export const APP_CONFIG = {
  activityRecentLimit: 3,
  activityPageLimit: 20,
  trendMonthsBack: 6,
  inviteCodeLength: 6,
} as const;
EOF
```

---

## Step 15 — Setup PWA

### Buat PWA Manifest

```bash
cat > public/manifest.json << 'EOF'
{
  "name": "DuitKita",
  "short_name": "DuitKita",
  "description": "Aplikasi pencatatan keuangan untuk pasangan",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#FAFAF9",
  "theme_color": "#F59E0B",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
EOF
```

Buat placeholder icons folder:

```bash
mkdir -p public/icons
# Nanti isi dengan icon DuitKita yang sudah dibuat
# Format: PNG, ukuran 192x192 dan 512x512
# Bisa generate di: https://maskable.app atau https://favicon.io
```

### Setup next-pwa di next.config.ts

```bash
cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // nonaktif saat dev
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",  // untuk foto profil dari Supabase Storage
      },
    ],
  },
};

module.exports = withPWA(nextConfig);
EOF
```

---

## Step 16 — Setup Redirect di Root Page

```bash
cat > src/app/page.tsx << 'EOF'
import { redirect } from "next/navigation";

export default function RootPage() {
  // Redirect ke dashboard — middleware yang akan handle auth check
  redirect("/dashboard");
}
EOF
```

---

## Step 17 — Setup Auth Layout

```bash
cat > src/app/\(auth\)/layout.tsx << 'EOF'
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo DuitKita */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-4">
            <span className="text-white font-bold text-xl">DK</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-text">DuitKita</h1>
          <p className="text-slate-muted text-sm mt-1">Kelola keuangan bersama pasangan</p>
        </div>
        {children}
      </div>
    </div>
  );
}
EOF
```

---

## Step 18 — Setup App Layout (dengan Bottom Nav)

```bash
cat > src/app/\(app\)/layout.tsx << 'EOF'
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
      {/* Main content — dengan padding bawah untuk bottom nav */}
      <main className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
        {children}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* FAB — Catat Pengeluaran */}
      <FabButton />

      {/* Bottom Sheet — muncul saat FAB di-tap */}
      <ExpenseSheet />
    </div>
  );
}
EOF
```

---

## Step 19 — Placeholder Pages (akan diisi bertahap)

```bash
# Dashboard page
cat > src/app/\(app\)/dashboard/page.tsx << 'EOF'
export default function DashboardPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-slate-text">Dashboard</h1>
      <p className="text-slate-muted text-sm mt-1">Coming soon...</p>
    </div>
  );
}
EOF

# Budget page
cat > src/app/\(app\)/budget/page.tsx << 'EOF'
export default function BudgetPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-slate-text">Budget</h1>
      <p className="text-slate-muted text-sm mt-1">Coming soon...</p>
    </div>
  );
}
EOF

# Reports page
cat > src/app/\(app\)/reports/page.tsx << 'EOF'
export default function ReportsPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-slate-text">Laporan</h1>
      <p className="text-slate-muted text-sm mt-1">Coming soon...</p>
    </div>
  );
}
EOF

# Profile page
cat > src/app/\(app\)/profile/page.tsx << 'EOF'
export default function ProfilePage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-slate-text">Profil</h1>
      <p className="text-slate-muted text-sm mt-1">Coming soon...</p>
    </div>
  );
}
EOF

# Login page
cat > src/app/\(auth\)/login/page.tsx << 'EOF'
export default function LoginPage() {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-text mb-6">Masuk</h2>
      <p className="text-slate-muted text-sm">Coming soon...</p>
    </div>
  );
}
EOF

# Register page
cat > src/app/\(auth\)/register/page.tsx << 'EOF'
export default function RegisterPage() {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-text mb-6">Daftar</h2>
      <p className="text-slate-muted text-sm">Coming soon...</p>
    </div>
  );
}
EOF
```

---

## Step 20 — Placeholder Layout Components

```bash
# BottomNav placeholder
cat > src/components/layout/BottomNav.tsx << 'EOF'
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
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white dark:bg-surface-dark border-t border-slate-border dark:border-slate-accent pb-safe z-40">
      <div className="flex items-center h-16">
        {/* First 2 items */}
        {navItems.slice(0, 2).map((item) => (
          <NavItem key={item.href} {...item} isActive={pathname === item.href} />
        ))}

        {/* FAB space */}
        <div className="flex-1" />

        {/* Last 2 items */}
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
        isActive ? "text-primary" : "text-slate-muted"
      )}
    >
      <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
      <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>
        {label}
      </span>
    </Link>
  );
}
EOF

# FabButton placeholder
cat > src/components/layout/FabButton.tsx << 'EOF'
"use client";

import { Plus } from "lucide-react";
import { useAppStore } from "@/stores/app.store";
import { motion } from "framer-motion";

export function FabButton() {
  const openExpenseSheet = useAppStore((s) => s.openExpenseSheet);

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md pointer-events-none z-50">
      <div className="flex justify-center pb-safe">
        <div className="h-16 flex items-center pointer-events-auto">
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={openExpenseSheet}
            className="w-14 h-14 -mt-5 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 transition-shadow hover:shadow-xl"
          >
            <Plus size={24} color="white" strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
EOF

# ExpenseSheet placeholder
cat > src/components/features/expenses/ExpenseSheet.tsx << 'EOF'
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
        className="w-full max-w-md bg-white dark:bg-surface-dark rounded-t-3xl p-6 min-h-[50vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-surface rounded-full mx-auto mb-6" />
        <h2 className="text-lg font-bold text-slate-text">Catat Pengeluaran</h2>
        <p className="text-slate-muted text-sm mt-1">Coming soon...</p>
      </div>
    </div>
  );
}
EOF
```

---

## Step 21 — Install tailwindcss-animate (diperlukan shadcn)

```bash
npm install tailwindcss-animate
```

---

## Step 22 — Test Run

```bash
npm run dev
```

Buka `http://localhost:3000` di browser. Pastikan:

- Redirect otomatis ke `/dashboard`
- Halaman dashboard tampil dengan teks "Dashboard - Coming soon..."
- Bottom nav terlihat di bawah dengan 4 icon + space di tengah
- FAB amber muncul di tengah bottom nav
- Tidak ada error di console

---

## Checklist

- [ ] `create-next-app` berhasil dengan TypeScript + Tailwind + App Router
- [ ] Semua npm dependencies terinstall tanpa error
- [ ] shadcn/ui berhasil di-init dan komponen terinstall
- [ ] `.env.local` sudah diisi dengan `NEXT_PUBLIC_API_URL`
- [ ] `tailwind.config.ts` sudah berisi Amber Slate color tokens
- [ ] `globals.css` sudah berisi CSS variables dark mode
- [ ] Semua folder struktur sudah terbuat
- [ ] `QueryProvider` terbuat dan terhubung di root layout
- [ ] Axios instance terbuat dengan JWT interceptor
- [ ] Zustand stores terbuat (auth + app)
- [ ] TypeScript types terbuat di `src/types/index.ts`
- [ ] Utility functions terbuat di `src/lib/utils.ts`
- [ ] Constants terbuat di `src/lib/constants.ts`
- [ ] PWA manifest terbuat di `public/manifest.json`
- [ ] `next.config.ts` sudah berisi next-pwa config
- [ ] Semua placeholder pages terbuat
- [ ] BottomNav, FabButton, ExpenseSheet placeholder terbuat
- [ ] `npm run dev` berjalan tanpa error
- [ ] App redirect ke `/dashboard` dan layout terlihat benar

---

## Langkah Selanjutnya (setelah checklist selesai)

Setelah setup berhasil, development dilanjutkan per fitur dengan urutan:

1. **Auth flow** — halaman login, register, middleware proteksi route
2. **Dashboard** — GreetingCard, SummaryCard, ActivityFeed, BudgetList
3. **Expense Sheet** — NumPad, CategoryPicker, form submit + toast
4. **Budget page** — BudgetCard, BudgetForm, CategoryManager
5. **Reports page** — DonutChart, TrendChart, ReportTabs
6. **Profile page** — ProfileCard, InviteCode, ThemeToggle
7. **PWA icons** — generate ikon DuitKita 192px dan 512px
8. **Deploy ke Vercel** — connect GitHub repo, set env variables

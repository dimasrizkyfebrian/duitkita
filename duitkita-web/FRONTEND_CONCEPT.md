# DuitKita — Frontend Concept Document

> Dokumen ini merangkum semua keputusan konsep yang sudah disepakati
> sebelum masuk ke implementation plan dan coding.

---

## Topik 1 — Platform & Target Device

| Keputusan | Detail |
|-----------|--------|
| Target utama | Mobile (HP) — paling sering dipakai saat outdoor & setelah bayar cashless |
| Pendekatan | Mobile-first, responsive di semua device |
| PWA | Ya — bisa di-install di homescreen tanpa App Store |
| Library PWA | `next-pwa` — tinggal install & konfigurasi minimal |
| Deploy | Vercel (gratis, unlimited project) |

**Alasan PWA:** Karena catat pengeluaran dilakukan saat di luar rumah setelah bayar,
membuka app dari homescreen (tanpa buka browser dulu) mengurangi friction yang signifikan.

---

## Topik 2 — Visual Identity & Design System

### Color Palette — Amber Slate

| Token | Hex | Penggunaan |
|-------|-----|-----------|
| `primary` | `#F59E0B` | CTA, tombol utama, active nav, progress bar |
| `primary-light` | `#FBBF24` | Hover state, tint ringan |
| `primary-dark` | `#D97706` | Pressed state |
| `primary-tint` | `#FEF3C7` | Badge background, surface tint |
| `slate-text` | `#1E293B` | Text primary |
| `slate-accent` | `#334155` | Accent, secondary elements |
| `slate-muted` | `#64748B` | Placeholder, muted text |
| `slate-surface` | `#F1F5F9` | Card background, surface |
| `success` | `#10B981` | Budget aman (<80%) |
| `warning` | `#F97316` | Budget hampir habis (80–94%) |
| `danger` | `#EF4444` | Over budget (≥100%), error |
| `background` | `#FAFAF9` | App background light mode |

### Dark Mode Tokens

| Token | Hex | Penggunaan |
|-------|-----|-----------|
| `primary` (dark) | `#FBBF24` | Lebih terang agar kontras di dark bg |
| `background` (dark) | `#0F172A` | App background dark mode |
| `surface` (dark) | `#1E293B` | Card, bottom sheet dark mode |
| `border` (dark) | `#334155` | Divider, outline dark mode |

> **Aturan penting:** Amber TIDAK dipakai sebagai warna teks — hanya untuk elemen
> besar (tombol, card header, progress bar) karena kontras rendah di background putih.

### Alert Color Chain (Budget Status)

```
< 80%   → success  #10B981  → badge "Aman"
80–94%  → warning  #F97316  → badge "Hampir habis"
95–99%  → warning+ #F97316  → badge "Kritis"
≥ 100%  → danger   #EF4444  → badge "Over!"
```

### Typography

| Pilihan | Detail |
|---------|--------|
| Font family | Plus Jakarta Sans (Google Fonts, gratis) |
| Display | 28px / weight 700 — untuk angka besar (nominal budget) |
| H1 | 22px / weight 600 — judul halaman |
| H2 | 18px / weight 600 — section header |
| Body | 15px / weight 400 — konten utama |
| Label | 13px / weight 500 — label, metadata |
| Caption | 11px / weight 400 — keterangan kecil, timestamp |

### Iconography

| Pilihan | Detail |
|---------|--------|
| Library | Lucide Icons (sudah bundle dengan shadcn/ui) |
| Style | Outlined, stroke-based — terasa modern dan tidak kaku |

### Border Radius System

| Name | Value | Penggunaan |
|------|-------|-----------|
| XS | `rounded-sm` / 4px | Badge, tag kecil |
| SM | `rounded-lg` / 8px | Input field, button |
| MD | `rounded-2xl` / 16px | Card, list item |
| LG | `rounded-3xl` / 24px | Bottom sheet, modal |

### Animation — Framer Motion

| Elemen | Spesifikasi |
|--------|-------------|
| Page transition | fade + slide up, duration 0.25s ease-out |
| Card enter | stagger 0.05s per item, duration 0.2s |
| Button press | scale 0.97, duration 0.1s |
| Bottom sheet | slide up y: 100%→0, duration 0.3s |
| Alert badge | pulse scale 1→1.05→1, sekali saja |
| Progress bar | fill dari 0 saat mount, duration 0.6s |

### Dark Mode

Library: `next-themes` — toggle di halaman Profil, persisten via localStorage.

---

## Topik 3 — Navigasi & Layout

### Pola Navigasi: Bottom Nav + FAB Tengah (Opsi C)

```
[ Home ] [ Budget ] [ + ] [ Laporan ] [ Profil ]
                    ^^^
              FAB amber, tombol catat pengeluaran
```

Benchmark: Gojek, Tokopedia — pattern paling familiar di kalangan pengguna HP Indonesia.

### Struktur Dashboard (4 Zone)

```
┌─────────────────────────────────┐
│  Zone 1 — Header                │  ← Greeting + nama + periode bulan
│  "Selamat pagi, Dimas 👋"       │     Background amber gradient
├─────────────────────────────────┤
│  Zone 2 — Summary Card          │  ← Float di atas header (z-index)
│  Total budget · Terpakai · Sisa │     White card, 3 angka utama
├─────────────────────────────────┤
│  Zone 3 — Recent Activity       │  ← 3 item terbaru, link "lihat semua"
│  [D] Kamu catat Transport -35rb │     Avatar initial + warna berbeda per user
│  [P] Pasangan catat Kencan...   │
├─────────────────────────────────┤
│  Zone 4 — Budget per Kategori   │  ← Full list, progress bar + badge status
│  Uang makan    ████████░  62%   │
│  Transport     ████████████ 83% │
│  Kencan        ████████████ !!!  │
└─────────────────────────────────┘
```

**Kenapa urutan ini:** Mengikuti pola "makro → konteks → detail".
Zone 3 (activity) sebelum Zone 4 (budget list) karena activity adalah
alasan utama user membuka app — untuk lihat pasangan habis belanja apa.

---

## Topik 4 — Halaman & Fitur Utama

### Halaman 1 — Home / Dashboard (`/dashboard`)

**Fitur utama:**
- Greeting card personal (nama + periode bulan + sisa hari)
- Summary card: total budget, total terpakai, total sisa
- Alert banner otomatis jika ada kategori ≥80% (bisa di-dismiss)
- Recent activity: 3 item terbaru berdua, avatar inisial per user
- Budget list per kategori: progress bar + badge status + angka sisa
- Pull-to-refresh gesture

### Halaman 2 — Budget (`/budget`)

**Fitur utama:**
- Set budget bulanan per kategori (input base amount)
- List semua kategori milik user
- Kelola kategori: tambah, edit nama & ikon, hapus
- Tampilkan rollover amount: "termasuk sisa bulan lalu +Rp X"
- Tombol "Mulai bulan baru" untuk trigger rollover eksplisit
- Month switcher di header (bulan lalu read-only jika finalized)

### Halaman 3 — Catat Pengeluaran (FAB → Bottom Sheet)

**Penting: bukan halaman penuh — tampil sebagai bottom sheet**

**Fitur utama:**
- Bottom sheet slide-up dari tombol FAB
- Custom numpad besar untuk input nominal (bukan keyboard default)
- Pilih kategori (dropdown/grid)
- Preview sisa budget kategori yang dipilih: "Sisa: Rp X"
- Input catatan/keterangan (opsional)
- Pilih tanggal (default hari ini)
- Konfirmasi: toast "Pengeluaran tercatat" + animasi sukses 1.5 detik
- Dismiss dengan swipe down

### Halaman 4 — Laporan (`/reports`)

**Fitur utama:**
- Month switcher untuk navigasi antar bulan
- Tab: "Saya" / "Pasangan" / "Berdua"
- Donut/pie chart: distribusi pengeluaran per kategori
- Bar chart: tren pengeluaran 6 bulan terakhir
- Top 5 pengeluaran terbesar bulan ini
- Detail per kategori: budget vs actual
- Riwayat rollover per kategori

### Halaman 5 — Profil (`/profile`)

**Fitur utama:**
- Edit nama & email
- Upload foto profil
- Dark mode toggle langsung di halaman ini
- Kartu "Pasangan kamu": nama + foto jika terhubung, prompt jika belum
- Invite pasangan via kode unik 6 digit (generate → share → input)
- Ganti password
- Tombol logout yang jelas

---

## Topik 5 — Data Fetching & State Management

### Stack yang Dipilih

| Layer | Library | Fungsi |
|-------|---------|--------|
| HTTP Client | Axios | Semua request ke NestJS API, interceptor JWT |
| Server state | TanStack Query (React Query) | Fetch, cache, invalidasi otomatis |
| Global state | Zustand | Auth state, active month, UI state |
| Dark mode | next-themes | Persistensi dark mode |

### Yang Di-handle TanStack Query (Server State)

```
useQuery(['budgets', year, month])     → GET /budgets?year=&month=
useQuery(['expenses', year, month])    → GET /expenses?year=&month=
useQuery(['activity'])                 → GET /activity/recent
useQuery(['reports', year, month])     → GET /reports/monthly?year=&month=
useMutation → POST /expenses           → onSuccess: invalidate(['budgets'], ['activity'])
```

**Alasan invalidasi:** Setelah catat pengeluaran baru, TanStack Query otomatis
refetch budget list dan activity — dashboard update tanpa reload halaman.

### Yang Di-handle Zustand (Global State)

```typescript
// Auth store
{
  user: User | null,
  token: string | null,
  setAuth: (user, token) => void,
  logout: () => void
}

// App store
{
  activeYear: number,
  activeMonth: number,
  setActiveMonth: (year, month) => void,
  isExpenseSheetOpen: boolean,
  setExpenseSheetOpen: (open) => void
}
```

### Axios Instance Setup

```typescript
// lib/api.ts
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

// Auto-attach JWT token ke setiap request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout jika token expired (401)
api.interceptors.response.use(null, (error) => {
  if (error.response?.status === 401) useAuthStore.getState().logout()
  return Promise.reject(error)
})
```

---

## Ringkasan Tech Stack Frontend

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Font | Plus Jakarta Sans |
| Icons | Lucide Icons |
| Animation | Framer Motion |
| Data fetching | TanStack Query v5 |
| HTTP client | Axios |
| Global state | Zustand |
| Dark mode | next-themes |
| PWA | next-pwa |
| Deploy | Vercel (free) |

---

## Deployment Stack Lengkap DuitKita

```
Frontend  → Vercel (free, auto-deploy dari GitHub)
Backend   → Koyeb / Railway (free tier)
Database  → Supabase PostgreSQL (free tier)
Repo      → GitHub monorepo: duitkita/
              ├── duitkita-api/   (NestJS)
              └── duitkita-web/   (Next.js)
```

---

*Dokumen ini adalah hasil brainstorm 5 topik konsep frontend DuitKita.*
*Langkah selanjutnya: Implementation Plan → Setup project → Development.*

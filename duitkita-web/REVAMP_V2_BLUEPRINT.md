# DuitKita Web — Revamp V2 Frontend Blueprint

Pedoman pengembangan **`duitkita-web`** setelah backend Revamp V2 (Phase 1–3 + avatar) selesai.

| Dokumen terkait                                                                    | Peran                                      |
| ---------------------------------------------------------------------------------- | ------------------------------------------ |
| [`DESIGN_SYSTEM_V2.md`](./DESIGN_SYSTEM_V2.md)                                     | Visual, UX, halaman, komponen — **REVAMP** |
| [`../duitkita-api/REVAMP_V2_BLUEPRINT.md`](../duitkita-api/REVAMP_V2_BLUEPRINT.md) | Kontrak API, migration, testing backend    |

---

## 1) Tujuan dokumen ini

1. Daftar jelas **apa yang belum ada di frontend** vs API yang sudah live
2. Prioritas eksekusi untuk solo developer (P0 / P1 / P2)
3. Roadmap **resilience & UX ops** (boundaries, SSR, offline) — terpisah dari fitur produk
4. Definition of Done per fitur agar integrasi tidak setengah-setengah

**Out of scope di sini:** detail implementasi backend, migration SQL, Supabase server config.

---

## 2) Kondisi frontend saat ini (Mei 2026)

### Sudah ada (v1 / partial V2)

| Area                      | Status | Catatan                                                                     |
| ------------------------- | ------ | --------------------------------------------------------------------------- |
| Auth login/register       | Ada    | Belum simpan / rotate **refresh token**                                     |
| Budget, expense, category | Ada    | CRUD + partner scope                                                        |
| Reports on-screen         | Ada    | monthly, couple, trend, rollover — **bukan** forecast/health-score API baru |
| Activity feed             | Ada    |                                                                             |
| Profil dasar              | Ada    | Nama, password, link partner (`POST /couples/link`)                         |
| PWA shell                 | Ada    | manifest, `offline/page.tsx` — **bukan** sync queue                         |
| Design system             | Ada    | Amber Slate, shadcn — lihat `FRONTEND_CONCEPT.md`                           |

### Belum ada / belum konsisten

| Area                              | Gap                                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| ~~Response envelope~~             | ~~Sebagian service masih `res.data` langsung~~ → **Done (F1)**: interceptor auto-unwrap  |
| ~~Refresh token & sessions~~      | ~~API ada, UI/logic belum~~ → **Done (F4)**: refresh flow + retry queue                  |
| Couple **invitations**            | Masih pola link langsung by email                                                        |
| Recurring expenses                | API ada, UI belum                                                                        |
| Bill reminders                    | API ada, UI belum                                                                        |
| Forecast & health score           | API ada, UI belum                                                                        |
| Notification inbox                | API ada, UI belum                                                                        |
| PDF export jobs                   | API ada, UI belum                                                                        |
| Profile avatar                    | Draft lokal (`UserAvatar`, upload profil) — belum wajib di-merge                         |
| Route `loading.tsx` / `error.tsx` | Belum komprehensif di `(app)/*`                                                          |
| Offline outbox + replay           | Belum                                                                                    |

---

## 3) Kontrak API yang wajib dipahami FE

### Base URL

`NEXT_PUBLIC_API_URL` — semua request lewat `src/lib/api.ts` (axios + Bearer dari Zustand).

### Response envelope (Phase 2 backend)

**Success (JSON):**

```json
{
  "success": true,
  "data": { ... },
  "requestId": "uuid",
  "timestamp": "ISO-8601",
  "path": "/users/me"
}
```

**Error:**

```json
{
  "success": false,
  "error": { "code": "...", "message": "..." },
  "requestId": "uuid",
  "timestamp": "...",
  "path": "..."
}
```

**Pengecualian:** `204 No Content`, download **blob** (PDF, gambar avatar) — tidak dibungkus envelope.

**Helper:** `src/lib/api-envelope.ts` → `unwrapApiData<T>(payload)`.

### Auth

- Login/register mengembalikan `accessToken`, `refreshToken`, `user` (termasuk `hasAvatar`)
- Simpan refresh token (secure storage); panggil `POST /auth/refresh` sebelum access expired
- Avatar: `GET /users/:id/avatar` butuh header Authorization — gunakan `responseType: 'blob'`, bukan URL publik

---

## 4) Legenda prioritas

| Label  | Arti                                          |
| ------ | --------------------------------------------- |
| **P0** | Wajib agar Revamp V2 terasa lengkap di produk |
| **P1** | Penting untuk trust, retention, polish        |
| **P2** | Boleh menyusul                                |

---

## 5) Backlog fitur — mapping API → UI

### 5.1 Foundation (kerjakan dulu)

| #   | Task                      | API / teknik         | Deliverable FE                                                                                                    | Prioritas | Status  |
| --- | ------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------- | --------- | ------- |
| F1  | Envelope di semua service | `unwrapApiData`      | Refactor `auth`, `budget`, `expense`, `report`, `activity`, `profile`, `dashboard`                                | **P0**    | **Done** |
| F2  | Types V2                  | DTO backend          | Extend `src/types/index.ts`: export job, notification, recurring, reminder, forecast, health, invitation, session | **P0**    | **Done** |
| F3  | `API_ROUTES` lengkap      | —                    | Tambah rute di `src/lib/constants.ts` (lihat §8)                                                                  | **P0**    | **Done** |
| F4  | Refresh token flow        | `POST /auth/refresh` | Simpan refresh; interceptor 401 → refresh sekali → retry; logout jika gagal                                       | **P0**    | **Done** |
| F5  | Error UX                  | envelope `requestId` | Toast + halaman error tampilkan `requestId` untuk lapor bug                                                       | **P1**    | **Done** |

### 5.2 Trust & pasangan (Phase 1 API)

| #   | Task              | Endpoint                                                              | UI                                                                  | Prioritas |
| --- | ----------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------- | --------- |
| T1  | Undangan pasangan | `POST /couples/invitations`, `GET .../incoming`, accept/reject/cancel | Ganti UX `PartnerInviteSheet` — daftar undangan masuk, terima/tolak | **P0**    |
| T2  | Sesi aktif        | `GET /auth/sessions`, `DELETE .../:id`, `DELETE .../others`           | Section Profil → Keamanan: perangkat aktif                          | **P1**    |
| T3  | Security audit    | `GET /users/me/security-audit`                                        | Log aktivitas + pagination                                          | **P2**    |

### 5.3 Reliability (tanpa halaman baru)

| #   | Task                                                           | Catatan |
| --- | -------------------------------------------------------------- | ------- |
| R1  | Query `year`, `month`, `monthsBack` — angka valid, selaras DTO |
| R2  | Mutation: disable submit saat `isPending`                      |
| R3  | Tangani budget **finalized** — pesan error jelas dari API      |

### 5.4 Recurring expenses (Phase 3A)

| #    | Task            | Endpoint                           | UI                                                        | Prioritas |
| ---- | --------------- | ---------------------------------- | --------------------------------------------------------- | --------- |
| 3A-1 | Service + hook  | CRUD `/recurring-expenses`         | `recurring-expense.service.ts`, `useRecurringExpenses.ts` | **P0**    |
| 3A-2 | Halaman / sheet | —                                  | Daftar + form (kategori, jumlah, jadwal, catatan)         | **P0**    |
| 3A-3 | Pause / resume  | `POST .../pause`, `.../resume`     | Toggle status + badge `isActive`                          | **P0**    |
| 3A-4 | Run due         | `POST /recurring-expenses/run-due` | Tombol dev atau trigger saat buka app (throttle)          | **P1**    |

**Setelah mutation:** invalidate `expenses`, `budgets`, `activity`, `reports`.

### 5.5 Bill reminders (Phase 3B)

| #    | Task               | Endpoint                              | UI                                          | Prioritas       |
| ---- | ------------------ | ------------------------------------- | ------------------------------------------- | --------------- |
| 3B-1 | Service + hook     | `/reminders`                          | `reminder.service.ts`, `useReminders.ts`    | **P0**          |
| 3B-2 | List + filter      | `?status=upcoming`, `overdue`, `done` | Tab/halaman + badge nav (opsional)          | **P0**          |
| 3B-3 | CRUD               | POST/PATCH/DELETE                     | Form judul, jumlah, due date, remind before | **P0**          |
| 3B-4 | Mark done / snooze | `mark-done`, `snooze`                 | Checkbox / swipe + preset snooze            | **P0** / **P1** |

**UX:** overdue = warna danger; empty state jelas.

### 5.6 Forecast & health score (Phase 3C–3D)

| #    | Task              | Endpoint                                     | UI                                                        | Prioritas |
| ---- | ----------------- | -------------------------------------------- | --------------------------------------------------------- | --------- |
| 3C-1 | Forecast card     | `GET /reports/forecast?year&month&scope`     | Kartu Dashboard dan/atau Laporan                          | **P0**    |
| 3D-1 | Health score card | `GET /reports/health-score?year&month&scope` | Gauge/skor + saving rate, adherence, volatility, insights | **P0**    |

**UX:** scope `me` / `both` (forecast juga `partner`); sinkron dengan bulan yang dipilih di app store.

### 5.7 Notification center (Phase 3D)

| #    | Task        | Endpoint                                       | UI                                                   | Prioritas       |
| ---- | ----------- | ---------------------------------------------- | ---------------------------------------------------- | --------------- |
| 3D-2 | Inbox       | `GET /notifications`                           | Halaman/sheet + unread count                         | **P0**          |
| 3D-3 | Read        | `PATCH .../:id/read`, `read-all`               | Tap = read; tombol tandai semua                      | **P0** / **P1** |
| 3D-4 | Preferences | `GET/PATCH /users/me/notification-preferences` | Toggle di Profil (budget, partner, weekly, reminder) | **P1**          |

**UX:** polling ~60s atau refetch on window focus (belum ada WebSocket).

### 5.8 PDF export (Phase 3E)

| #    | Task           | Endpoint                                                              | UI                                                  | Prioritas |
| ---- | -------------- | --------------------------------------------------------------------- | --------------------------------------------------- | --------- |
| 3E-1 | Request export | `POST /reports/exports` body: `{ format: "pdf", year, month, scope }` | Tombol di Laporan                                   | **P0**    |
| 3E-2 | Riwayat job    | `GET /reports/exports`                                                | List status: pending, processing, completed, failed | **P0**    |
| 3E-3 | Download       | `GET .../download` blob                                               | Simpan/buka PDF; share sheet mobile                 | **P0**    |
| 3E-4 | Expired        | `expiresAt` di response                                               | Disable download + copy jelas                       | **P1**    |

**UX:** loading beberapa detik (generate sinkron di API); jangan block seluruh app — gunakan toast + progress di panel export.

### 5.9 Profile avatar

| #    | Task               | Endpoint                                        | UI                                               | Prioritas |
| ---- | ------------------ | ----------------------------------------------- | ------------------------------------------------ | --------- |
| AV-1 | Upload / hapus     | `POST/DELETE /users/me/avatar` multipart `file` | Tombol kamera di Profil; max 2 MB, jpeg/png/webp | **P1**    |
| AV-2 | Tampil             | `GET /users/me/avatar`, `GET /users/:id/avatar` | `UserAvatar` + `useAvatarUrl` (blob URL)         | **P1**    |
| AV-3 | Partner & activity | `hasAvatar` di `Partner`                        | `PartnerCard`, `ActivityListItem` (opsional)     | **P2**    |

**Catatan:** draft sudah ada di working tree — review sebelum merge; jangan pakai `<img src={supabasePublicUrl}>`.

### 5.10 Penyesuaian layar existing

| Layar      | Perubahan                                                           |
| ---------- | ------------------------------------------------------------------- |
| Profil     | Undangan (bukan hanya link email); notification preferences; avatar |
| Laporan    | Forecast, health score, panel export PDF                            |
| Dashboard  | Opsional: ringkasan forecast + health + badge notifikasi            |
| Bottom nav | Opsional: entry Reminders atau Notifications                        |

---

## 6) Resilience & UX platform

Ini **wajib masuk roadmap** agar PWA terasa matang — terpisah dari checklist fitur di atas.

### 6.1 App Router boundaries

**Gap:** hampir tidak ada `loading.tsx` / `error.tsx` per route di `app/(app)/`.

| Task             | Lokasi disarankan                                                         | Prioritas |
| ---------------- | ------------------------------------------------------------------------- | --------- |
| Skeleton loading | `(app)/dashboard`, `budget`, `expenses`, `reports`, `profile`, `activity` | **P0**    |
| Error + retry    | `error.tsx` per route di atas                                             | **P0**    |
| Global fallback  | `app/error.tsx`                                                           | **P1**    |
| 404              | `not-found.tsx`                                                           | **P2**    |

**UX error:** tampilkan pesan ramah + tombol “Coba lagi” + `requestId` dari envelope jika ada.

### 6.2 Arsitektur rendering

**Gap:** dominan `"use client"` + React Query di browser; belum manfaat SSR/streaming.

| Task                                             | Manfaat                 | Prioritas |
| ------------------------------------------------ | ----------------------- | --------- |
| RSC untuk layout `(app)` shell                   | First paint lebih cepat | **P1**    |
| Suspense per section (dashboard cards)           | Progressive loading     | **P2**    |
| Client hanya untuk form, sheet, chart interaktif | Pragmatis solo dev      | —         |

**Batasan:** JWT di `localStorage` → data privat tetap di-fetch client kecuali nanti pindah httpOnly cookie (V3).

### 6.3 Offline & sync

**Gap:** ada halaman `/offline` dan PWA install; **belum** antrian mutation + replay.

| Task               | Detail                                              | Prioritas |
| ------------------ | --------------------------------------------------- | --------- |
| Banner offline     | Deteksi `navigator.onLine`                          | **P0**    |
| Outbox (IndexedDB) | Queue: create/update expense, create reminder, dll. | **P1**    |
| Replay on `online` | FIFO; tampilkan status per item “menunggu sync”     | **P1**    |
| Conflict handling  | Tangani 409/412 dari API dengan copy untuk user     | **P1**    |
| Scope offline      | **Tidak** untuk export PDF atau upload avatar besar | —         |

### 6.4 React Query hygiene

| Task                                                              | Prioritas |
| ----------------------------------------------------------------- | --------- |
| `staleTime` per domain (profil lebih lama, activity lebih pendek) | **P1**    |
| `retry` hanya untuk network error, bukan 4xx                      | **P1**    |
| Invalidate keys terdokumentasi (§8)                               | **P0**    |

---

## 7) Urutan sprint (disarankan)

| Sprint | Fokus                                        | Keluaran                                                    |
| ------ | -------------------------------------------- | ----------------------------------------------------------- |
| **A**  | F1–F4, route loading/error                   | Semua service pakai envelope; refresh token; skeleton utama |
| **B**  | 3B reminders, 3A recurring, 3D notifications | 3 halaman/sheet produk baru                                 |
| **C**  | 3C forecast, 3D health score                 | Insight di dashboard/laporan                                |
| **D**  | 3E PDF export                                | Export + download + riwayat                                 |
| **E**  | T1 invitations, T2 sessions, AV avatar       | Trust + profil lengkap                                      |
| **F**  | Offline outbox, RSC bertahap                 | Platform maturity                                           |

Satu sprint ≈ 1–2 minggu part-time solo; sesuaikan dengan kapasitas.

---

## 8) Struktur kode yang disarankan

### File baru

```
src/lib/
  api-envelope.ts          # ada — pakai di semua service
  services/
    recurring-expense.service.ts
    reminder.service.ts
    notification.service.ts
    report-export.service.ts
    auth-session.service.ts   # refresh, sessions
    couple-invitation.service.ts

src/hooks/
  useRecurringExpenses.ts
  useReminders.ts
  useNotifications.ts
  useReportExports.ts
  useForecast.ts
  useHealthScore.ts
  useAuthSession.ts

src/components/features/
  recurring/
  reminders/
  notifications/
  reports/ExportPanel.tsx
  profile/InvitationsCard.tsx
  profile/SessionsCard.tsx

src/components/shared/
  UserAvatar.tsx             # draft ada
  OfflineBanner.tsx
```

### `API_ROUTES` — tambahan ke `constants.ts`

```ts
auth: {
  refresh: "/auth/refresh",
  sessions: "/auth/sessions",
  session: (id: string) => `/auth/sessions/${id}`,
  revokeOthers: "/auth/sessions/others",
},
couples: {
  invitations: "/couples/invitations",
  invitationsIncoming: "/couples/invitations/incoming",
  invitationAccept: (id: string) => `/couples/invitations/${id}/accept`,
  invitationReject: (id: string) => `/couples/invitations/${id}/reject`,
  invitationCancel: (id: string) => `/couples/invitations/${id}/cancel`,
  // link, partner, unlink — sudah ada
},
recurringExpenses: { list: "/recurring-expenses", runDue: "/recurring-expenses/run-due", ... },
reminders: { list: "/reminders", ... },
notifications: { list: "/notifications", readAll: "/notifications/read-all", ... },
users: {
  notificationPreferences: "/users/me/notification-preferences",
  securityAudit: "/users/me/security-audit",
  // me, avatar — sebagian sudah ada
},
reports: {
  forecast: "/reports/forecast",
  healthScore: "/reports/health-score",
  exports: "/reports/exports",
  exportDetail: (id: string) => `/reports/exports/${id}`,
  exportDownload: (id: string) => `/reports/exports/${id}/download`,
},
```

### `QUERY_KEYS` — tambahan

```ts
recurring: () => ["recurring-expenses"],
reminders: (status?: string) => ["reminders", status].filter(Boolean),
notifications: () => ["notifications"],
notificationPreferences: () => ["notification-preferences"],
forecast: (y, m, scope) => ["reports", "forecast", y, m, scope],
healthScore: (y, m, scope) => ["reports", "health-score", y, m, scope],
reportExports: () => ["report-exports"],
avatar: (userId: string) => ["avatar", userId],
sessions: () => ["auth-sessions"],
invitationsIncoming: () => ["couple-invitations", "incoming"],
```

---

## 9) Definition of Done — per fitur frontend

Sebuah fitur FE dianggap **selesai** jika:

1. Service memanggil API dengan `unwrapApiData` (atau blob khusus)
2. Types + `API_ROUTES` + `QUERY_KEYS` terupdate
3. Hook React Query (query + mutation) dengan invalidate yang benar
4. UI: loading skeleton, empty state, error state
5. Diuji manual terhadap API lokal/staging (happy + 1 error path)
6. Mobile: usable di viewport sempit (sheet, thumb zone)
7. Tidak regress halaman existing (budget/expense tetap jalan)

---

## 10) Checklist manual sebelum release FE V2

- [ ] Login → refresh token → buka app > access TTL → masih authenticated
- [ ] Undangan pasangan: kirim → terima di akun B → budget partner terlihat
- [ ] Recurring: buat → run-due → expense muncul di bulan aktif
- [ ] Reminder: overdue tampil → mark done → hilang dari tab upcoming
- [ ] Notifikasi: unread count benar setelah event
- [ ] Forecast & health score: angka masuk akal untuk bulan berjalan
- [ ] Export PDF: generate → download → buka file
- [ ] Avatar: upload → tampil di profil → pasangan bisa lihat (jika linked)
- [ ] Mode offline: banner muncul; (setelah Sprint F) queue + sync

---

## 11) Catatan keputusan (isi bertahap)

- **2026-05-16:** Dokumen ini dibuat; backend Phase 3 + avatar selesai & e2e lulus. FE masih v1 untuk fitur produk baru; resilience (boundaries, offline queue, SSR) dicatat eksplisit.
- **2026-05-26:** Foundation F1–F5 selesai. F1: interceptor auto-unwrap envelope + `ApiEnvelopeError` class untuk structured error. F2: semua V2 types ditambahkan (Session, RecurringExpense, BillReminder, Notification, CoupleInvitation, SpendingForecast, FinancialHealthScore, ReportExportView, SecurityAuditLog, dll). F3: `API_ROUTES` + `QUERY_KEYS` lengkap untuk auth sessions, couple invitations, recurring expenses, reminders, notifications, reports (forecast, health-score, exports). F4: refresh token flow dengan 401 retry queue + `setTokens` di auth store. F5: `apiErrorToast()` helper yang surface `requestId` di toast description.

---

_Living document — update setelah setiap sprint FE selesai._

# duitkita-web

Vue 3 + TypeScript PWA frontend for DuitKita (couples budgeting app).
Online-only by design — installable to the home screen, no offline data sync.

## Structure

Feature-based under `src/`:

- `app/` — router and app-level wiring
- `features/<name>/` — components, composables, stores, api calls, and views scoped to one feature (`auth`, `dashboard`, ...)
- `shared/` — components/composables/layouts/utils reused across features
- `lib/` — `http.ts` (authenticated axios client, access-token header + 401 refresh retry), `publicHttp.ts` (plain client for pre-auth endpoints)
- `types/` — shared TypeScript types (e.g. API envelope)

Auth session: access token kept in memory only (Pinia store), refresh token in `localStorage`. See `src/features/auth/stores/auth.store.ts`.

## Setup

```sh
npm install
cp .env.example .env   # point VITE_API_BASE_URL at your local duitkita-api
npm run dev
```

## Scripts

```sh
npm run dev          # dev server
npm run build         # type-check + production build
npm run lint          # oxlint + eslint --fix
npm run format         # prettier --write
npm run test:unit      # vitest
```

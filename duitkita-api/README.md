# DuitKita API

REST API backend for **DuitKita** — a couples budgeting app that lets two partners track spending, set monthly budgets, and view combined financial reports.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| ORM | TypeORM 0.3 |
| Database | PostgreSQL (Supabase) |
| Auth | JWT (Passport) |
| Validation | class-validator + class-transformer |
| Docs | Swagger / OpenAPI |
| Logging | nestjs-pino |
| Security | Helmet, rate limiting (throttler), CORS |
| Package manager | pnpm |

## Features

- **Auth** — register, login, JWT-protected routes
- **Users** — profile management, password change
- **Categories** — per-user spending categories (CRUD)
- **Monthly Budgets** — set per-category budgets with automatic rollover from unspent amounts; finalize a month to carry surplus forward
- **Expenses** — record expenses linked to a budget and category; filter by month or category
- **Couples** — link/unlink with a partner by email; view your partner's budgets and expenses
- **Reports** — monthly budget-vs-actual summary, combined couple report, multi-month spending trend, per-category trend, rollover history
- **Activity Feed** — paginated shared activity log for the couple (budget creations, expense entries, etc.)

## Project Structure

```
src/
├── common/
│   ├── constants/        # Response message strings per module
│   ├── decorators/       # @CurrentUser()
│   ├── guards/           # JwtAuthGuard
│   └── utils/            # Shared helpers (e.g. period validation)
├── config/               # database.config.ts, jwt.config.ts
├── database/
│   ├── entities/         # TypeORM entities (User, Category, MonthlyBudget, Expense, Couple, Activity)
│   └── migrations/       # Versioned schema migrations
└── modules/
    ├── auth/             # POST /auth/register, POST /auth/login
    ├── users/            # GET/PATCH /users/me, PATCH /users/me/password
    ├── categories/       # CRUD /categories
    ├── budgets/          # CRUD /budgets + finalize + partner view
    ├── expenses/         # CRUD /expenses + partner view
    ├── couples/          # POST /couples/link, GET/DELETE /couples/partner
    ├── reports/          # GET /reports/monthly|couple|trend|trend/category|rollover/:id
    └── activity/         # GET /activity, GET /activity/recent
```

## API Endpoints

All routes except `/auth/*` require `Authorization: Bearer <token>`.

| Module | Method | Path | Description |
|---|---|---|---|
| Auth | POST | `/auth/register` | Create account, returns JWT |
| Auth | POST | `/auth/login` | Authenticate, returns JWT |
| Users | GET | `/users/me` | Get own profile |
| Users | PATCH | `/users/me` | Update display name |
| Users | PATCH | `/users/me/password` | Change password |
| Categories | POST | `/categories` | Create category |
| Categories | GET | `/categories` | List own categories |
| Categories | GET | `/categories/:id` | Get category |
| Categories | PATCH | `/categories/:id` | Update category |
| Categories | DELETE | `/categories/:id` | Delete category |
| Budgets | POST | `/budgets` | Create monthly budget |
| Budgets | GET | `/budgets?year&month` | List own budgets for a month |
| Budgets | GET | `/budgets/:id` | Get budget |
| Budgets | PATCH | `/budgets/:id` | Update base amount |
| Budgets | DELETE | `/budgets/:id` | Delete budget |
| Budgets | GET | `/budgets/partner?year&month` | View partner's budgets |
| Budgets | POST | `/budgets/finalize?year&month` | Finalize month, create rollovers |
| Expenses | POST | `/expenses` | Record expense |
| Expenses | GET | `/expenses?year&month[&categoryId]` | List own expenses for a month |
| Expenses | GET | `/expenses/:id` | Get expense |
| Expenses | PATCH | `/expenses/:id` | Update expense |
| Expenses | DELETE | `/expenses/:id` | Delete expense |
| Expenses | GET | `/expenses/by-budget/:budgetId` | List expenses for a budget |
| Expenses | GET | `/expenses/partner?year&month[&categoryId]` | View partner's expenses |
| Couples | POST | `/couples/link` | Link with partner by email |
| Couples | GET | `/couples/partner` | Get partner profile |
| Couples | DELETE | `/couples/partner` | Unlink partner |
| Reports | GET | `/reports/monthly?year&month` | Budget vs actual per category |
| Reports | GET | `/reports/couple?year&month` | Combined report for both partners |
| Reports | GET | `/reports/trend[?monthsBack]` | Total spending trend over N months |
| Reports | GET | `/reports/trend/category[?monthsBack]` | Per-category trend over N months |
| Reports | GET | `/reports/rollover/:categoryId[?monthsBack]` | Rollover history for a category |
| Activity | GET | `/activity[?limit&offset]` | Paginated couple activity feed |
| Activity | GET | `/activity/recent[?limit]` | Recent activity (dashboard widget) |

Interactive docs are available at `http://localhost:3001/api/docs` when the server is running.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (`npm i -g pnpm`)
- A PostgreSQL database (Supabase free tier works)

### Setup

```bash
# Clone the repo
git clone <repo-url>
cd duitkita-api

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env — fill in DATABASE_URL and JWT_SECRET
```

### Environment Variables

| Variable | Description | Example |
|---|---|---|
| `PORT` | Port to listen on | `3001` |
| `NODE_ENV` | Environment | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret used to sign JWTs | any long random string |
| `JWT_EXPIRES_IN` | JWT expiry duration | `7d` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000` |

### Run Migrations

```bash
pnpm run migration:run
```

### Start the Server

```bash
# Development (hot-reload)
pnpm run start:dev

# Production
pnpm run build
pnpm run start:prod
```

## Database Migrations

Schema changes go through migrations only (`synchronize: false`).

```bash
# Generate a migration from entity changes
npx ts-node --project tsconfig.typeorm.json -r tsconfig-paths/register \
  ./node_modules/typeorm/cli migration:generate src/database/migrations/<MigrationName> \
  -d src/config/database.config.ts

# Apply pending migrations
pnpm run migration:run

# Revert the last migration
pnpm run migration:revert
```

> The TypeORM CLI uses `tsconfig.typeorm.json` (CommonJS target). The default `tsconfig.json` uses NodeNext, which is incompatible with the TypeORM CLI.

## Testing

```bash
pnpm run test              # Unit tests
pnpm run test:watch        # Watch mode
pnpm run test:cov          # Coverage report
pnpm run test:e2e          # End-to-end tests

# Run a single test file
pnpm run test -- --testPathPattern=auth
```

## Key Design Decisions

- **Integer amounts** — all monetary values are stored as integers in Rupiah (no floats, no rounding errors)
- **Rollover budgets** — unspent budget rolls over automatically when a month is finalized; `base_amount + rollover_amount = total_amount`
- **UUID primary keys** — all entities use `PrimaryGeneratedColumn('uuid')`
- **Couples model** — a `couples` table links two user IDs; partner visibility is enforced at the service layer
- **Activity log** — significant actions (budget create/update, expense create/delete, couple link/unlink) are written to an `activities` table and surfaced through the feed endpoints

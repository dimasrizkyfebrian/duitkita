# DuitKita — Recent Activity Module Development Guide

> This guide focuses on **business flow and logic** rather than full implementation.
> Claude Code should match the patterns already established in the existing codebase.

---

## Feature Overview

Recent Activity is a **shared activity feed** between two users in the same couple.
When either partner performs a write action (create/update/delete expense, create/update
budget), a new activity record is created and both partners can read the feed.

Key rules:

- Activity is only visible to users who are in the **same couple**
- A user with **no couple linked** cannot see any activity feed
- The feed is **read-only** — no editing or deleting activity records
- Activity records are created **inside the existing service methods** via a shared `ActivityService`
- Use **Pino logger** (already installed) to log activity creation for observability

---

## File Structure

```
src/
├── activity/
│   ├── activity.module.ts
│   ├── activity.controller.ts
│   ├── activity.service.ts       ← injected into other modules
│   └── dto/
│       └── query-activity.dto.ts
├── entities/
│   └── activity.entity.ts        ← new entity
```

---

## Database — New Entity

### Table: `activities`

| Column        | Type                  | Description                                        |
| ------------- | --------------------- | -------------------------------------------------- |
| `id`          | `uuid` PK             | Auto-generated                                     |
| `couple_id`   | `uuid` FK → `couples` | Which couple this activity belongs to              |
| `actor_id`    | `uuid` FK → `users`   | Who performed the action                           |
| `action`      | `enum`                | The type of action (see below)                     |
| `entity_type` | `enum`                | What was acted upon                                |
| `entity_id`   | `uuid`                | The ID of the affected record                      |
| `meta`        | `jsonb`               | Extra context (category name, amount, month, etc.) |
| `created_at`  | `timestamp`           | When it happened                                   |

### Action Enum

```typescript
export enum ActivityAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
}
```

### Entity Type Enum

```typescript
export enum ActivityEntityType {
  EXPENSE = 'expense',
  BUDGET = 'budget',
}
```

### Meta Field Shape (jsonb — not strictly typed in DB)

For `expense` activities:

```json
{
  "amount": 85000,
  "note": "Dinner at Sushi Tei",
  "categoryName": "Dating",
  "categoryIcon": "💑",
  "expenseDate": "2025-05-14"
}
```

For `budget` activities:

```json
{
  "categoryName": "Dating",
  "categoryIcon": "💑",
  "baseAmount": 500000,
  "year": 2025,
  "month": 5
}
```

> The `meta` field stores denormalized display data.
> This avoids extra joins when rendering the activity feed.
> It reflects the **state at the time of the action**, not the current state.

---

## Entity Definition (TypeORM)

Follow the same patterns as existing entities in `src/entities/`.

Key points for Claude Code:

- Use `@PrimaryGeneratedColumn('uuid')`
- `action` and `entityType` should use `@Column({ type: 'enum', enum: ... })`
- `meta` should use `@Column({ type: 'jsonb', nullable: true })`
- Add `@ManyToOne` relations to `User` (as `actor`) and `Couple`
- Add `@CreateDateColumn` for `createdAt`
- Register the new entity in `AppDataSource` (database config) and `AppModule` TypeORM config
- **Generate and run a new migration** after the entity is created

---

## Business Flow

### 1. When is an activity record created?

Activity should be logged on these write operations:

| Trigger                    | Action    | Entity Type |
| -------------------------- | --------- | ----------- |
| `ExpensesService.create()` | `created` | `expense`   |
| `ExpensesService.update()` | `updated` | `expense`   |
| `ExpensesService.remove()` | `deleted` | `expense`   |
| `BudgetsService.create()`  | `created` | `budget`    |
| `BudgetsService.update()`  | `updated` | `budget`    |

> `BudgetsService.remove()` and `BudgetsService.finalizeMonth()` are
> intentionally excluded — these are housekeeping actions, not meaningful
> user-facing activities.

---

### 2. How does ActivityService get called?

`ActivityService` exposes a **single public method**:

```typescript
async log(params: {
  userId: string;       // the actor
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  meta: Record<string, any>;
}): Promise<void>
```

Inside this method, the service:

1. Looks up the `couple` record where `user1_id = userId OR user2_id = userId`
2. If no couple is found → **silently returns** (no error thrown, activity just not logged)
3. If couple is found → creates and saves the `Activity` record
4. Logs via **Pino**: `logger.info({ actorId, action, entityType, entityId }, 'activity logged')`

The `log()` call is **fire-and-forget** from the caller's perspective.
Wrap the call in `try/catch` inside the existing service methods so that
a logging failure **never breaks the main operation**.

---

### 3. How to call it from existing services

In `ExpensesService` and `BudgetsService`, inject `ActivityService`
and call `this.activityService.log(...)` **after** the main save succeeds.

Pattern to follow in `ExpensesService.create()`:

```
1. (existing logic) validate category, find budget, create expense → save
2. (new) call activityService.log with:
   - userId = the actor
   - action = ActivityAction.CREATED
   - entityType = ActivityEntityType.EXPENSE
   - entityId = saved expense's ID
   - meta = { amount, note, categoryName, categoryIcon, expenseDate }
3. return the saved expense (unchanged)
```

Same pattern applies to `update()` and `remove()` in both services.
For `remove()`, capture the category name/icon **before** deleting since
the record won't exist after `expenseRepo.remove()`.

---

### 4. Circular dependency prevention

`ActivityModule` must **not** import `BudgetsModule` or `ExpensesModule`.
`BudgetsModule` and `ExpensesModule` import `ActivityModule`.
Direction is strictly one-way:

```
BudgetsModule   ──imports──▶  ActivityModule
ExpensesModule  ──imports──▶  ActivityModule
                               (no reverse imports)
```

Export `ActivityService` from `ActivityModule` so other modules can use it.

---

## Read Endpoints — Controller & Service Logic

### Endpoints

| Method | Endpoint           | Query Params                               | Description                     |
| ------ | ------------------ | ------------------------------------------ | ------------------------------- |
| `GET`  | `/activity`        | `limit` (default 20), `offset` (default 0) | Paginated feed for the couple   |
| `GET`  | `/activity/recent` | `limit` (default 5)                        | Quick feed for dashboard widget |

### Authorization logic (in service)

Both endpoints follow this flow:

```
1. Find the couple where user is user1 or user2
2. If no couple → throw 404 "No partner linked"
3. Query activities WHERE couple_id = couple.id
4. Order by created_at DESC
5. Apply limit + offset for pagination
6. Join actor (user) to get actor name
7. Return list
```

### Response shape per activity item

```json
{
  "id": "uuid",
  "actorId": "uuid",
  "actorName": "Kamu",
  "action": "created",
  "entityType": "expense",
  "entityId": "uuid",
  "meta": {
    "amount": 85000,
    "note": "Dinner at Sushi Tei",
    "categoryName": "Dating",
    "categoryIcon": "💑",
    "expenseDate": "2025-05-14"
  },
  "createdAt": "2025-05-14T10:23:00.000Z"
}
```

### Pagination response wrapper

```json
{
  "data": [ ...activity items... ],
  "total": 47,
  "limit": 20,
  "offset": 0
}
```

---

## Query DTO

```typescript
// src/activity/dto/query-activity.dto.ts

export class QueryActivityDto {
  limit?: number; // default 20, max 50
  offset?: number; // default 0
}
```

Use `@IsOptional()`, `@IsInt()`, `@Min(1)`, `@Max(50)` from `class-validator`.
Use `new DefaultValuePipe(20)` and `ParseIntPipe` in the controller,
matching the same pattern used in `reports.controller.ts`.

---

## Pino Logger Integration

Since Pino is already installed, inject the NestJS logger or use the Pino
instance consistent with how it's used elsewhere in the codebase.

Log these events inside `ActivityService`:

```typescript
// On successful activity log
logger.info(
  { actorId, coupleId, action, entityType, entityId },
  'activity:logged',
);

// On silently skipped (no couple found)
logger.debug(
  { userId, action, entityType },
  'activity:skipped — user has no couple',
);

// On error (inside catch block)
logger.error(
  { err, userId, action, entityType },
  'activity:failed — could not save activity',
);
```

---

## Migration

After creating `activity.entity.ts`:

```bash
npm run migration:generate -- src/migrations/002-add-activities

npm run migration:run
```

Verify in Supabase Table Editor that the `activities` table is created with:

- `id`, `couple_id`, `actor_id`, `action`, `entity_type`, `entity_id`, `meta`, `created_at`
- `action` and `entity_type` are Postgres `enum` types
- `meta` is `jsonb`

---

## Module Registration Checklist

- [ ] `activity.entity.ts` created and added to `AppDataSource` entities array
- [ ] `activity.entity.ts` added to `AppModule` TypeORM entities array
- [ ] Migration generated and run successfully
- [ ] `ActivityModule` created, `ActivityService` exported
- [ ] `ActivityModule` imported in `BudgetsModule`
- [ ] `ActivityModule` imported in `ExpensesModule`
- [ ] `ActivityService` injected in `BudgetsService` constructor
- [ ] `ActivityService` injected in `ExpensesService` constructor
- [ ] `activityService.log()` called (wrapped in try/catch) in all 5 trigger points
- [ ] `GET /activity` and `GET /activity/recent` working and returning correct data
- [ ] Only users in the same couple can see the feed (401/404 for unlinked users)
- [ ] Pino logs appear correctly for `activity:logged`, `activity:skipped`, `activity:failed`
- [ ] `npm run start:dev` runs without circular dependency warnings

---

## Testing Flow

```
1. Login as User A (you)
2. POST /expenses → record an expense
3. GET /activity → verify the activity appears with your name as actor
4. Login as User B (partner)
5. GET /activity → verify the SAME activity appears (shared couple feed)
6. Verify actorName shows User A's name, not User B

7. Login as User A
8. PATCH /expenses/:id → update the expense
9. GET /activity/recent → verify "updated" activity appears at top

10. DELETE /expenses/:id
11. GET /activity/recent → verify "deleted" activity appears with meta intact
    (meta should still show the amount/category even though expense is deleted)

12. Create a new user with NO couple linked
13. GET /activity → should return 404 "No partner linked"
```

---

## Frontend Display Guide

How to render each activity type as a human-readable string:

```
expense + created  → "{actorName} mencatat pengeluaran {meta.categoryIcon} {meta.categoryName} sebesar Rp {meta.amount}"
expense + updated  → "{actorName} mengubah pengeluaran {meta.categoryIcon} {meta.categoryName} menjadi Rp {meta.amount}"
expense + deleted  → "{actorName} menghapus pengeluaran {meta.categoryIcon} {meta.categoryName} sebesar Rp {meta.amount}"
budget  + created  → "{actorName} menetapkan budget {meta.categoryIcon} {meta.categoryName} bulan {meta.month}/{meta.year} sebesar Rp {meta.baseAmount}"
budget  + updated  → "{actorName} mengubah budget {meta.categoryIcon} {meta.categoryName} bulan {meta.month}/{meta.year} menjadi Rp {meta.baseAmount}"
```

This string formatting belongs entirely on the **frontend** —
the backend only returns raw structured data.

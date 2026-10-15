-- push_subscriptions (Sprint 3 — Web Push)
--
-- Why this file exists: schema sync is AutoMigrate-on-boot, but main.go only
-- runs it when APP_ENV=development, and the deployed service runs with
-- APP_ENV=production (.github/workflows/backend-cd.yml). So a new table does
-- NOT appear in production on deploy — it has to be created once by hand.
-- Run this against the production database BEFORE deploying the Sprint 3
-- backend, or every POST /api/v1/push/subscriptions returns 500.
--
-- Mirrors domain.PushSubscription (model/domain/push_subscription.go) and the
-- conventions AutoMigrate produced for the existing tables: uuid primary key
-- defaulting to gen_random_uuid(), nullable timestamptz with no database
-- default (GORM's autoCreateTime/autoUpdateTime fill them in Go), and
-- idx_<table>_<column> index names.
--
-- Safe to re-run: every statement is guarded.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id         uuid        NOT NULL DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL,
    endpoint   text        NOT NULL,
    p256dh     text        NOT NULL,
    auth       text        NOT NULL,
    created_at timestamptz,
    updated_at timestamptz,
    CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
    CONSTRAINT fk_push_subscriptions_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
    ON public.push_subscriptions USING btree (user_id);

-- Not just a constraint for its own sake: PushSubscriptionRepository.Upsert
-- does ON CONFLICT (endpoint), which needs a unique index on that column or
-- the insert errors out. One endpoint is one browser install, so the same
-- endpoint re-subscribing (or being handed to another account) must update
-- the existing row rather than add a second one.
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint
    ON public.push_subscriptions USING btree (endpoint);

-- Every other table in this schema has RLS on with no policies: the API
-- connects as the table owner and bypasses it, while Supabase's auto-exposed
-- data API gets nothing. Match that rather than leaving this one table
-- readable through the public API.
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

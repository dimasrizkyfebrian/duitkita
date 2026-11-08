-- Income (Pemasukan) — schema
--
-- Same reason as 001_push_subscriptions.sql: AutoMigrate only runs when
-- APP_ENV=development, so production needs this applied by hand.
-- Run this against the production database BEFORE deploying the backend that
-- ships income: the account balance query will reference the incomes table,
-- so without it every request that computes a balance (GET /accounts, ...)
-- fails with 500. The change is purely additive (one new table), so running
-- it ahead of the deploy is safe for the backend that is live now.
--
-- Mirrors what AutoMigrate produces for domain.Income (model/domain/income.go).
-- The only intended difference: GORM's generated constraint names may differ.
--
-- Safe to re-run: every statement is guarded.

CREATE TABLE IF NOT EXISTS public.incomes (
    id          uuid                  NOT NULL DEFAULT gen_random_uuid(),
    user_id     uuid                  NOT NULL,
    account_id  uuid,
    source      character varying(20) NOT NULL,
    amount      bigint                NOT NULL,
    note        character varying(255),
    income_date date                  NOT NULL,
    created_at  timestamptz,
    updated_at  timestamptz,
    CONSTRAINT incomes_pkey PRIMARY KEY (id)
);

-- account_id is nullable: an income does not have to land in an account.
-- ON DELETE SET NULL is only a safety net — the API archives accounts and
-- never deletes them.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_incomes_user') THEN
        ALTER TABLE public.incomes
            ADD CONSTRAINT fk_incomes_user FOREIGN KEY (user_id)
            REFERENCES public.users (id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_incomes_account') THEN
        ALTER TABLE public.incomes
            ADD CONSTRAINT fk_incomes_account FOREIGN KEY (account_id)
            REFERENCES public.accounts (id) ON DELETE SET NULL;
    END IF;
END $$;

-- Back the income list / monthly totals and the account balance query.
CREATE INDEX IF NOT EXISTS idx_incomes_user_date
    ON public.incomes USING btree (user_id, income_date);
CREATE INDEX IF NOT EXISTS idx_incomes_account_date
    ON public.incomes USING btree (account_id, income_date);

-- Same as every other table here (see 001_push_subscriptions.sql): RLS on
-- with no policies, so the API (table owner) is unaffected while Supabase's
-- auto-exposed data API gets nothing.
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

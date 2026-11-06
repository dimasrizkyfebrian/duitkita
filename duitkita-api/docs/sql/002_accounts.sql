-- Accounts / wallets (Feature A) — schema
--
-- Same reason as 001_push_subscriptions.sql: AutoMigrate only runs when
-- APP_ENV=development, so production needs these changes applied by hand.
-- Run this against the production database BEFORE deploying the backend that
-- ships accounts: that backend writes expenses.account_id on every insert,
-- so without the column every POST /api/v1/expenses returns 500. The changes
-- are purely additive (new tables, new nullable columns), so running it ahead
-- of the deploy is safe for the backend that is live now.
--
-- Run 003_seed_institutions.sql after this one.
--
-- Mirrors what AutoMigrate produces for domain.FinancialInstitution,
-- domain.Account, domain.AccountBalanceAdjustment and the new AccountID
-- fields on domain.Expense / domain.RecurringExpense (model/domain/*.go).
-- The only intended difference: ADD COLUMN appends account_id at the end of
-- expenses / recurring_expenses instead of in the middle, which nothing
-- depends on.
--
-- Safe to re-run: every statement is guarded.

CREATE TABLE IF NOT EXISTS public.financial_institutions (
    id         uuid                   NOT NULL DEFAULT gen_random_uuid(),
    code       character varying(50)  NOT NULL,
    name       character varying(100) NOT NULL,
    type       character varying(10)  NOT NULL,
    logo_path  character varying(255),
    sort_order bigint                 NOT NULL DEFAULT 0,
    is_active  boolean                NOT NULL DEFAULT true,
    CONSTRAINT financial_institutions_pkey PRIMARY KEY (id)
);

-- 003_seed_institutions.sql upserts with ON CONFLICT (code), which needs a
-- unique index on that column.
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_institutions_code
    ON public.financial_institutions USING btree (code);

CREATE TABLE IF NOT EXISTS public.accounts (
    id                   uuid                   NOT NULL DEFAULT gen_random_uuid(),
    user_id              uuid                   NOT NULL,
    institution_id       uuid                   NOT NULL,
    name                 character varying(100) NOT NULL,
    opening_balance      bigint,
    opening_balance_date date,
    archived_at          timestamptz,
    created_at           timestamptz,
    updated_at           timestamptz,
    CONSTRAINT accounts_pkey PRIMARY KEY (id),
    CONSTRAINT fk_accounts_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE,
    CONSTRAINT fk_accounts_institution FOREIGN KEY (institution_id)
        REFERENCES public.financial_institutions (id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id
    ON public.accounts USING btree (user_id);

CREATE TABLE IF NOT EXISTS public.account_balance_adjustments (
    id               uuid                   NOT NULL DEFAULT gen_random_uuid(),
    account_id       uuid                   NOT NULL,
    previous_balance bigint                 NOT NULL,
    new_balance      bigint                 NOT NULL,
    delta            bigint                 NOT NULL,
    note             character varying(255),
    created_at       timestamptz,
    CONSTRAINT account_balance_adjustments_pkey PRIMARY KEY (id),
    CONSTRAINT fk_account_balance_adjustments_account FOREIGN KEY (account_id)
        REFERENCES public.accounts (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_account_balance_adjustments_account_id
    ON public.account_balance_adjustments USING btree (account_id);

-- Nullable: every existing expense / recurring expense becomes "no account",
-- which stays a valid choice. ON DELETE SET NULL is only a safety net — the
-- API archives accounts and never deletes them.
ALTER TABLE public.expenses
    ADD COLUMN IF NOT EXISTS account_id uuid;
ALTER TABLE public.recurring_expenses
    ADD COLUMN IF NOT EXISTS account_id uuid;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_expenses_account') THEN
        ALTER TABLE public.expenses
            ADD CONSTRAINT fk_expenses_account FOREIGN KEY (account_id)
            REFERENCES public.accounts (id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_recurring_expenses_account') THEN
        ALTER TABLE public.recurring_expenses
            ADD CONSTRAINT fk_recurring_expenses_account FOREIGN KEY (account_id)
            REFERENCES public.accounts (id) ON DELETE SET NULL;
    END IF;
END $$;

-- Backs the balance query (SUM of an account's expenses since its opening
-- balance date) and the ?account_id= filter on GET /expenses.
CREATE INDEX IF NOT EXISTS idx_expenses_account_date
    ON public.expenses USING btree (account_id, expense_date);

-- Same as every other table here (see 001_push_subscriptions.sql): RLS on
-- with no policies, so the API (table owner) is unaffected while Supabase's
-- auto-exposed data API gets nothing.
ALTER TABLE public.financial_institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_balance_adjustments ENABLE ROW LEVEL SECURITY;

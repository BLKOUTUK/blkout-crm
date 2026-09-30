-- ============================================
-- BLKOUT Commerce Schema — campaigns + pre_orders + memberships
-- Version: 1.0.0
-- Created: 2026-05-02
-- Plan: /home/robbe/.claude/plans/it-would-be-useful-replicated-teapot.md
-- Milestone: M1
-- ============================================
-- Adds the commerce spine to the CRM. Every commerce surface
-- (memberships, pre-orders, campaign waitlists) writes back to
-- contacts as the unified record-of-truth — NO parallel sales DB.
--
-- Run via: node ~/blkout-platform/scripts/supabase-query.mjs
--          "$(cat ~/blkout-platform/apps/crm/migrations/004_commerce_schema.sql)"
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES (idempotent — re-runnable)
-- ============================================

DO $$ BEGIN
    CREATE TYPE campaign_kind_enum AS ENUM ('apparel', 'print', 'course', 'membership', 'travel', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE campaign_state_enum AS ENUM ('waitlist', 'live', 'closed', 'fulfilled', 'sold_out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE campaign_signup_source_enum AS ENUM ('shop', 'newsletter', 'direct', 'referral');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE pre_order_status_enum AS ENUM ('paid', 'refunded', 'fulfilled', 'shipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE membership_tier_enum AS ENUM ('free', 'three', 'ten');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE membership_status_enum AS ENUM ('active', 'paused', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE membership_source_enum AS ENUM ('zeffy', 'stripe', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- CAMPAIGNS
-- ============================================

CREATE TABLE IF NOT EXISTS public.commerce_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    lede TEXT,
    kind campaign_kind_enum NOT NULL,

    -- Goals
    target_units INTEGER,
    target_amount_pence BIGINT,
    current_units INTEGER NOT NULL DEFAULT 0,
    current_amount_pence BIGINT NOT NULL DEFAULT 0,

    -- Schedule
    opens_at TIMESTAMPTZ,
    closes_at TIMESTAMPTZ,
    min_threshold_units INTEGER NOT NULL DEFAULT 1,
    max_capacity INTEGER, -- nullable for non-capacity-bound campaigns

    -- Lifecycle
    state campaign_state_enum NOT NULL DEFAULT 'waitlist',

    -- Presentation
    hero_image_url TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS commerce_campaigns_slug_idx ON public.commerce_campaigns (slug);
CREATE INDEX IF NOT EXISTS commerce_campaigns_state_idx ON public.commerce_campaigns (state);

-- ============================================
-- CAMPAIGN_SIGNUPS — waitlist entries, with bring-a-friend
-- ============================================

CREATE TABLE IF NOT EXISTS public.commerce_signups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.commerce_campaigns(id) ON DELETE CASCADE,
    -- RESTRICT not CASCADE — CRM is archive, contact deletes shouldn't auto-delete signup audit trail.
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
    source campaign_signup_source_enum NOT NULL DEFAULT 'shop',
    signed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    motivation_text TEXT,
    tier_chosen TEXT,

    -- Bring-a-friend referral mechanic
    referral_code TEXT UNIQUE NOT NULL,
    referred_by UUID REFERENCES public.commerce_signups(id) ON DELETE SET NULL,

    -- Attribution
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,

    UNIQUE (campaign_id, contact_id)
);

CREATE INDEX IF NOT EXISTS commerce_signups_campaign_idx ON public.commerce_signups (campaign_id);
CREATE INDEX IF NOT EXISTS commerce_signups_contact_idx ON public.commerce_signups (contact_id);
CREATE INDEX IF NOT EXISTS commerce_signups_referral_code_idx ON public.commerce_signups (referral_code);
CREATE INDEX IF NOT EXISTS commerce_signups_referred_by_idx ON public.commerce_signups (referred_by);

-- ============================================
-- PRE_ORDERS — pledges that converted to payment
-- ============================================

CREATE TABLE IF NOT EXISTS public.pre_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.commerce_campaigns(id) ON DELETE RESTRICT,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,

    -- Payment
    stripe_payment_intent_id TEXT UNIQUE,
    amount_pence BIGINT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    variant TEXT, -- size/colour/etc

    -- Travel-extensible (v2): structured rooms/flights/extras as JSON
    line_items_json JSONB,

    -- Lifecycle
    status pre_order_status_enum NOT NULL DEFAULT 'paid',
    placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    shipped_at TIMESTAMPTZ,

    -- Attribution
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT
);

CREATE INDEX IF NOT EXISTS pre_orders_campaign_idx ON public.pre_orders (campaign_id);
CREATE INDEX IF NOT EXISTS pre_orders_contact_idx ON public.pre_orders (contact_id);
CREATE INDEX IF NOT EXISTS pre_orders_status_idx ON public.pre_orders (status);

-- ============================================
-- MEMBERSHIPS — CBS tier subscriptions, mostly via Zeffy
-- ============================================

CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- RESTRICT not CASCADE — membership records preserved as institutional memory.
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
    tier membership_tier_enum NOT NULL,
    status membership_status_enum NOT NULL DEFAULT 'active',
    source membership_source_enum NOT NULL,

    -- External IDs
    zeffy_member_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,

    -- Lifecycle
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,

    -- Attribution (captured via form hidden fields where the source supports it)
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT
);

CREATE INDEX IF NOT EXISTS memberships_contact_idx ON public.memberships (contact_id);
CREATE INDEX IF NOT EXISTS memberships_status_idx ON public.memberships (status);
CREATE INDEX IF NOT EXISTS memberships_tier_idx ON public.memberships (tier);

-- ============================================
-- updated_at trigger for campaigns (RLS aside)
-- ============================================

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS commerce_campaigns_touch_updated_at ON public.commerce_campaigns;
CREATE TRIGGER commerce_campaigns_touch_updated_at
    BEFORE UPDATE ON public.commerce_campaigns
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================
-- ROW-LEVEL SECURITY
-- ============================================
-- Pattern matches 003_financial_rls_policies.sql:
-- public read for surfaces meant to be visible (campaigns + aggregate counts);
-- anon insert for the signup form on /shop;
-- authenticated full read/update for admin work.
--
-- TIGHTER policies (per-user scoping by email match) deferred until auth flow lands.

ALTER TABLE public.commerce_campaigns           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commerce_signups    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships         ENABLE ROW LEVEL SECURITY;

-- campaigns — public read, authenticated write
DROP POLICY IF EXISTS "Public can view commerce_campaigns" ON public.commerce_campaigns;
CREATE POLICY "Public can view commerce_campaigns"
    ON public.commerce_campaigns FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert commerce_campaigns" ON public.commerce_campaigns;
CREATE POLICY "Authenticated can insert commerce_campaigns"
    ON public.commerce_campaigns FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update commerce_campaigns" ON public.commerce_campaigns;
CREATE POLICY "Authenticated can update commerce_campaigns"
    ON public.commerce_campaigns FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- campaign_signups — anon insert (signup form), authenticated read/update
DROP POLICY IF EXISTS "Anon can insert commerce_signups" ON public.commerce_signups;
CREATE POLICY "Anon can insert commerce_signups"
    ON public.commerce_signups FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can insert commerce_signups" ON public.commerce_signups;
CREATE POLICY "Authenticated can insert commerce_signups"
    ON public.commerce_signups FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can view commerce_signups" ON public.commerce_signups;
CREATE POLICY "Authenticated can view commerce_signups"
    ON public.commerce_signups FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can update commerce_signups" ON public.commerce_signups;
CREATE POLICY "Authenticated can update commerce_signups"
    ON public.commerce_signups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- pre_orders — anon insert (Stripe webhook proxy), authenticated read/update
DROP POLICY IF EXISTS "Anon can insert pre_orders" ON public.pre_orders;
CREATE POLICY "Anon can insert pre_orders"
    ON public.pre_orders FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can insert pre_orders" ON public.pre_orders;
CREATE POLICY "Authenticated can insert pre_orders"
    ON public.pre_orders FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can view pre_orders" ON public.pre_orders;
CREATE POLICY "Authenticated can view pre_orders"
    ON public.pre_orders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can update pre_orders" ON public.pre_orders;
CREATE POLICY "Authenticated can update pre_orders"
    ON public.pre_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- memberships — server-side write only (Zeffy webhook uses service role, bypasses RLS),
-- authenticated read/update for admin views.
DROP POLICY IF EXISTS "Authenticated can view memberships" ON public.memberships;
CREATE POLICY "Authenticated can view memberships"
    ON public.memberships FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert memberships" ON public.memberships;
CREATE POLICY "Authenticated can insert memberships"
    ON public.memberships FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update memberships" ON public.memberships;
CREATE POLICY "Authenticated can update memberships"
    ON public.memberships FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- VERIFICATION
-- ============================================
-- After running, M1 verify:
--   SELECT to_regclass('public.commerce_campaigns'),
--          to_regclass('public.commerce_signups'),
--          to_regclass('public.pre_orders'),
--          to_regclass('public.memberships');
-- All four should return non-null.
--
-- RLS verify:
--   SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname='public' AND tablename IN ('campaigns','campaign_signups','pre_orders','memberships');
-- All four should show rowsecurity = true.
--
-- Idempotency verify: re-running this file should be a no-op (no errors).

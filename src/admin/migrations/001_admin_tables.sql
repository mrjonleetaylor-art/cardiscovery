-- ============================================================
-- Migration 001: Admin tables
-- Run this in your Supabase SQL editor before using the admin.
-- ============================================================

-- ── admin_vehicles ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_vehicles (
  id                TEXT PRIMARY KEY,
  row_type          TEXT NOT NULL CHECK (row_type IN ('BASE', 'VARIANT')),
  base_id           TEXT NOT NULL,
  variant_code      TEXT,
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'archived')),
  archived_at       TIMESTAMPTZ,
  last_import_id    UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Core identity
  make              TEXT NOT NULL,
  model             TEXT NOT NULL,
  year              INTEGER NOT NULL,
  body_type         TEXT NOT NULL,

  -- Commercial (full price per row, never a delta)
  price_aud         NUMERIC,

  -- Images
  cover_image_url   TEXT,
  gallery_image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_source      TEXT,
  license_note      TEXT,

  -- Specs + narrative as flexible JSON blob
  -- Keys are canonical SPEC_COLUMN_DEFS[].key values from specSchema.ts
  -- VARIANT rows store only overrides; null = inherit from BASE at render time
  specs             JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS admin_vehicles_base_id_idx   ON public.admin_vehicles (base_id);
CREATE INDEX IF NOT EXISTS admin_vehicles_status_idx    ON public.admin_vehicles (status);
CREATE INDEX IF NOT EXISTS admin_vehicles_row_type_idx  ON public.admin_vehicles (row_type);

-- ── admin_import_batches ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_import_batches (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_admin_id   UUID,
  file_name             TEXT NOT NULL,
  file_hash             TEXT,
  stats                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  errors                JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_csv_stored        BOOLEAN NOT NULL DEFAULT false,
  notes                 TEXT
);

-- ── admin_archive_logs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_archive_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id        TEXT NOT NULL,
  import_id         UUID,
  archived_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason            TEXT CHECK (reason IN ('missing_from_import', 'manual_archive', 'other')),
  previous_status   TEXT,
  new_status        TEXT
);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.admin_vehicles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_archive_logs   ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can access admin tables.
-- For a stricter setup, replace `TO authenticated` with a custom role.
CREATE POLICY "admin_vehicles_all"       ON public.admin_vehicles       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "import_batches_all"       ON public.admin_import_batches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "archive_logs_all"         ON public.admin_archive_logs   FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Grant admin flag ──────────────────────────────────────────────────────────
-- To grant a user admin access, run:
--   UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"is_admin": true}'
--   WHERE email = 'your@email.com';
--
-- Or via the Supabase Dashboard → Auth → Users → Edit user metadata.

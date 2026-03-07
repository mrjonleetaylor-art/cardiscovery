-- ============================================================
-- Migration 003: Top-level spec columns for charge times and dimensions
--
-- Adds dedicated columns for EV charge times and exterior dimensions.
-- These are stored as top-level columns (not in the specs JSONB blob)
-- to allow efficient filtering and direct access in the pipeline.
-- ============================================================

ALTER TABLE admin_vehicles
  ADD COLUMN IF NOT EXISTS spec_efficiency_charge_time_ac  text,
  ADD COLUMN IF NOT EXISTS spec_efficiency_charge_time_dc  text,
  ADD COLUMN IF NOT EXISTS spec_dimensions_length          integer,
  ADD COLUMN IF NOT EXISTS spec_dimensions_width           integer,
  ADD COLUMN IF NOT EXISTS spec_dimensions_height          integer;

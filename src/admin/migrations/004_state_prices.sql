-- Migration 004: add state_prices column for per-state drive-away pricing
ALTER TABLE admin_vehicles
  ADD COLUMN IF NOT EXISTS state_prices JSONB;

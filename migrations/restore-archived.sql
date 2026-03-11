-- restore-archived.sql
-- Restores rows accidentally archived by the importer today.
-- Safe: only touches rows archived within the last 24 hours.
-- Intentionally archived rows (older updated_at) are untouched.

UPDATE admin_vehicles
SET
  status     = 'draft',
  updated_at = now()
WHERE
  status     = 'archived'
  AND updated_at >= now() - interval '24 hours';

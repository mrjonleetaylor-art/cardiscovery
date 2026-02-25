/**
 * CRUD operations for admin_vehicles, admin_archive_logs tables.
 *
 * All operations go through Supabase. No hard deletes — archiving
 * sets status='archived' and archived_at=now().
 */

import { supabase } from '../../lib/supabase';
import { AdminVehicle, AdminVehicleStatus, ArchiveReason, VehicleArchiveLog } from '../adminTypes';
import { SPEC_COLUMNS } from '../csv/specSchema';

// ─── Helpers ────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

/** Coerce the raw Supabase row into a typed AdminVehicle. */
function rowToVehicle(row: Record<string, unknown>): AdminVehicle {
  return {
    id: row.id as string,
    row_type: row.row_type as AdminVehicle['row_type'],
    base_id: row.base_id as string,
    variant_code: (row.variant_code as string) ?? null,
    status: row.status as AdminVehicleStatus,
    archived_at: (row.archived_at as string) ?? null,
    last_import_id: (row.last_import_id as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    make: row.make as string,
    model: row.model as string,
    year: row.year as number,
    body_type: row.body_type as string,
    price_aud: (row.price_aud as number) ?? null,
    cover_image_url: (row.cover_image_url as string) ?? null,
    gallery_image_urls: (row.gallery_image_urls as string[]) ?? [],
    image_source: (row.image_source as string) ?? null,
    license_note: (row.license_note as string) ?? null,
    specs: (row.specs as Record<string, string | null>) ?? {},
  };
}

// ─── List / fetch ─────────────────────────────────────────────────────────────

export interface ListVehiclesOptions {
  /** Filter by status. Default: ['draft', 'live'] (archived excluded). */
  statuses?: AdminVehicleStatus[];
  /** If false (default), return BASE rows only. If true, include VARIANTs. */
  includeVariants?: boolean;
  /** Optionally filter by a specific base_id to get all variants of a base. */
  baseId?: string;
}

export async function listVehicles(opts: ListVehiclesOptions = {}): Promise<AdminVehicle[]> {
  const statuses = opts.statuses ?? ['draft', 'live'];

  let query = supabase
    .from('admin_vehicles')
    .select('*')
    .in('status', statuses)
    .order('updated_at', { ascending: false });

  if (!opts.includeVariants) {
    query = query.eq('row_type', 'BASE');
  }

  if (opts.baseId) {
    query = query.eq('base_id', opts.baseId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(rowToVehicle);
}

export async function getVehicle(id: string): Promise<AdminVehicle | null> {
  const { data, error } = await supabase
    .from('admin_vehicles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToVehicle(data as Record<string, unknown>);
}

export async function getVariantsForBase(baseId: string): Promise<AdminVehicle[]> {
  const { data, error } = await supabase
    .from('admin_vehicles')
    .select('*')
    .eq('base_id', baseId)
    .eq('row_type', 'VARIANT')
    .order('variant_code');
  if (error) throw error;
  return (data ?? []).map(rowToVehicle);
}

/** Fetch all vehicle IDs currently in the DB (including archived). Used by import. */
export async function getAllVehicleIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('admin_vehicles').select('id');
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.id as string));
}

/** Fetch all non-archived vehicle IDs. Used to detect missing rows during import. */
export async function getLiveVehicleIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('admin_vehicles')
    .select('id')
    .neq('status', 'archived');
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.id as string));
}

// ─── Create / Update ──────────────────────────────────────────────────────────

export type NewVehicleData = Omit<AdminVehicle, 'created_at' | 'updated_at'>;

export async function createVehicle(data: NewVehicleData): Promise<AdminVehicle> {
  const ts = now();
  const row = { ...data, created_at: ts, updated_at: ts };

  const { data: inserted, error } = await supabase
    .from('admin_vehicles')
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return rowToVehicle(inserted as Record<string, unknown>);
}

export async function updateVehicle(
  id: string,
  patch: Partial<Omit<AdminVehicle, 'id' | 'created_at'>>,
): Promise<AdminVehicle> {
  const { data, error } = await supabase
    .from('admin_vehicles')
    .update({ ...patch, updated_at: now() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return rowToVehicle(data as Record<string, unknown>);
}

// ─── Archive / Restore ────────────────────────────────────────────────────────

export async function archiveVehicle(
  id: string,
  reason: ArchiveReason = 'manual_archive',
  importId?: string,
): Promise<void> {
  const vehicle = await getVehicle(id);
  if (!vehicle) throw new Error(`Vehicle ${id} not found`);

  const ts = now();
  await supabase
    .from('admin_vehicles')
    .update({
      status: 'archived',
      archived_at: ts,
      last_import_id: importId ?? vehicle.last_import_id,
      updated_at: ts,
    })
    .eq('id', id);

  // Write audit log
  const log: Omit<VehicleArchiveLog, 'id'> = {
    vehicle_id: id,
    import_id: importId ?? null,
    archived_at: ts,
    reason,
    previous_status: vehicle.status,
    new_status: 'archived',
  };
  await supabase.from('admin_archive_logs').insert(log);
}

export async function restoreVehicle(id: string): Promise<void> {
  await supabase
    .from('admin_vehicles')
    .update({ status: 'draft', updated_at: now() })
    .eq('id', id);
}

// ─── Duplicate ────────────────────────────────────────────────────────────────

export async function duplicateVehicle(
  sourceId: string,
  newId: string,
  newBaseId: string,
  newVariantCode: string | null,
): Promise<AdminVehicle> {
  const source = await getVehicle(sourceId);
  if (!source) throw new Error(`Source vehicle ${sourceId} not found`);

  const ts = now();
  const newRow: AdminVehicle = {
    ...source,
    id: newId,
    base_id: newBaseId,
    variant_code: newVariantCode,
    status: 'draft',
    archived_at: null,
    last_import_id: null,
    created_at: ts,
    updated_at: ts,
  };

  const { data, error } = await supabase
    .from('admin_vehicles')
    .insert(newRow)
    .select()
    .single();

  if (error) throw error;
  return rowToVehicle(data as Record<string, unknown>);
}

// ─── Bulk upsert (used by import) ────────────────────────────────────────────

/**
 * Insert a new vehicle from an import row.
 * All fields written as-is; blank specs stored as null.
 */
export async function importInsert(
  row: AdminVehicle,
  importId: string,
): Promise<void> {
  const ts = now();
  await supabase.from('admin_vehicles').insert({
    ...row,
    last_import_id: importId,
    created_at: ts,
    updated_at: ts,
  });
}

/**
 * Update an existing BASE vehicle from an import row.
 * Blank CSV fields (null in row) are NOT written — existing DB values are preserved.
 */
export async function importUpdateBase(
  existing: AdminVehicle,
  csvRow: Partial<AdminVehicle>,
  importId: string,
): Promise<void> {
  const patch: Record<string, unknown> = { last_import_id: importId, updated_at: now() };

  // Only overwrite identity/commercial fields if CSV provided a value
  const scalarFields = [
    'make', 'model', 'year', 'body_type', 'price_aud',
    'cover_image_url', 'image_source', 'license_note',
  ] as const;

  for (const f of scalarFields) {
    if (csvRow[f] !== null && csvRow[f] !== undefined) {
      patch[f] = csvRow[f];
    }
  }

  if (csvRow.status) patch.status = csvRow.status;

  // gallery_image_urls: only overwrite if non-empty in CSV
  if (csvRow.gallery_image_urls && csvRow.gallery_image_urls.length > 0) {
    patch.gallery_image_urls = csvRow.gallery_image_urls;
  }

  // Specs: merge — only overwrite keys where CSV provided a non-null value
  if (csvRow.specs) {
    const mergedSpecs = { ...(existing.specs ?? {}) };
    for (const key of SPEC_COLUMNS) {
      const val = csvRow.specs[key];
      if (val !== null && val !== undefined) {
        mergedSpecs[key] = val;
      }
    }
    patch.specs = mergedSpecs;
  }

  await supabase.from('admin_vehicles').update(patch).eq('id', existing.id);
}

/**
 * Upsert a VARIANT vehicle from an import row.
 * All fields (including nulls) are written — null means "inherit from base at render time".
 */
export async function importUpsertVariant(
  row: AdminVehicle,
  importId: string,
  isNew: boolean,
): Promise<void> {
  const ts = now();
  if (isNew) {
    await supabase.from('admin_vehicles').insert({
      ...row,
      last_import_id: importId,
      created_at: ts,
      updated_at: ts,
    });
  } else {
    await supabase
      .from('admin_vehicles')
      .update({ ...row, last_import_id: importId, updated_at: ts })
      .eq('id', row.id);
  }
}

/**
 * Seed admin_vehicles from the in-repo public dataset.
 *
 * Converts each StructuredVehicle into a single BASE row and upserts
 * it into admin_vehicles. Existing rows (matched by id) are left
 * untouched (ignoreDuplicates: true), so re-running is safe.
 *
 * Specs are read from the first trim's structured specs and stored
 * into the JSONB specs blob using SPEC_COLUMN_DEFS key mapping.
 */

import { supabase } from '../../lib/supabase';
import { structuredVehicles } from '../../data/structuredVehicles';
import { StructuredVehicle, StructuredSpecs } from '../../types/specs';
import { SPEC_COLUMN_DEFS, PIPE_SEPARATOR } from '../csv/specSchema';

// ── Spec mapping ──────────────────────────────────────────────────────────────

/** Resolve a dot-path like "overview.fuelType" against a StructuredSpecs object. */
function getSpecValue(specs: StructuredSpecs, path: string): string | null {
  const [category, field] = path.split('.') as [keyof StructuredSpecs, string];
  if (!category || !field) return null;
  const section = specs[category] as Record<string, unknown> | undefined;
  if (!section) return null;
  const val = section[field];
  if (val == null) return null;
  return String(val);
}

function buildSpecsBlob(vehicle: StructuredVehicle): Record<string, string | null> {
  const firstTrim = vehicle.trims[0];
  const blob: Record<string, string | null> = {};

  for (const def of SPEC_COLUMN_DEFS) {
    if (def.category === 'narrative') {
      switch (def.key) {
        case 'ai_summary':
          blob[def.key] = vehicle.aiSummary ?? null;
          break;
        case 'best_for':
          blob[def.key] = vehicle.bestFor?.length
            ? vehicle.bestFor.join(PIPE_SEPARATOR)
            : null;
          break;
        case 'trade_offs':
          blob[def.key] = vehicle.tradeOffs?.length
            ? vehicle.tradeOffs.join(PIPE_SEPARATOR)
            : null;
          break;
        case 'positioning_summary':
          blob[def.key] = vehicle.positioningSummary ?? null;
          break;
        case 'tags':
          blob[def.key] = vehicle.tags?.length
            ? vehicle.tags.join(PIPE_SEPARATOR)
            : null;
          break;
        default:
          blob[def.key] = null;
      }
    } else {
      blob[def.key] = firstTrim ? getSpecValue(firstTrim.specs, def.path) : null;
    }
  }

  return blob;
}

// ── Seeder ────────────────────────────────────────────────────────────────────

/** Returns the number of vehicles attempted (not the number actually inserted). */
export async function seedAdminFromDataset(): Promise<number> {
  const ts = new Date().toISOString();

  const rows = structuredVehicles.map((vehicle) => {
    const firstTrim = vehicle.trims[0];
    return {
      id: vehicle.id,
      row_type: 'BASE' as const,
      base_id: vehicle.id,
      variant_code: null,
      status: 'draft' as const,
      archived_at: null,
      last_import_id: null,
      created_at: ts,
      updated_at: ts,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      body_type: firstTrim?.specs.overview.bodyType ?? '',
      price_aud: firstTrim?.basePrice ?? null,
      cover_image_url: vehicle.images[0] ?? null,
      gallery_image_urls: vehicle.images,
      image_source: null,
      license_note: null,
      specs: buildSpecsBlob(vehicle),
    };
  });

  const { error } = await supabase
    .from('admin_vehicles')
    .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });

  if (error) throw error;
  return rows.length;
}

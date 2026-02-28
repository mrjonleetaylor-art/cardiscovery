/**
 * CSV import — parse, validate, and apply a CSV file to admin_vehicles.
 *
 * Rules (non-negotiable):
 *   1. Validate headers — all required + spec columns must be present.
 *   2. Validate each row (row_type, base_id, required BASE fields, year, price).
 *   3. Derive IDs where blank.
 *   4. Ensure IDs are unique within the file.
 *   5. Two-pass write: BASE rows first, then VARIANT rows.
 *   6. BASE existing: blank CSV fields do NOT overwrite DB values.
 *   7. VARIANT: blank fields stored as null (inherit at render time).
 *   8. DB rows absent from CSV → archive (status='archived', archived_at=now()).
 *   9. Transactional: if any fatal errors, create ImportBatch with errors, abort writes.
 *  10. Create ImportBatch with stats + errors regardless of outcome.
 */

import { supabase } from '../../lib/supabase';
import {
  AdminVehicle,
  AdminRowType,
  AdminVehicleStatus,
  CsvParseResult,
  ImportBatch,
  ImportResult,
  ImportRowError,
  ImportStats,
  ValidatedCsvRow,
} from '../adminTypes';
import { REQUIRED_COLUMNS, SPEC_COLUMNS, PIPE_SEPARATOR } from './specSchema';
import {
  BODY_TYPES,
  DRIVETRAINS,
  FUEL_TYPES,
  TRANSMISSIONS,
  EnumOption,
  allowedEnumLabels,
  normalizeEnum,
  suggestEnumLabel,
} from '../lib/enums';
import {
  getAllVehicleIds,
  getLiveVehicleIds,
  getVehicle,
  importInsert,
  importUpdateBase,
  importUpsertVariant,
  archiveVehicle,
} from '../lib/adminVehicles';

// ─── CSV text parser ──────────────────────────────────────────────────────────

function parseRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseCsvText(text: string): { headers: string[]; rawRows: Record<string, string>[] } {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) return { headers: [], rawRows: [] };

  const headers = parseRow(lines[0]).map((h) => h.trim());
  const rawRows = lines.slice(1).map((line) => {
    const values = parseRow(line);
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? '').trim()]));
  });

  return { headers, rawRows };
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function v(raw: Record<string, string>, key: string): string {
  return (raw[key] ?? '').trim();
}

function rowErr(rowNum: number, id: string | null, field: string, message: string): ImportRowError {
  return { row_number: rowNum, vehicle_id: id, field, message };
}

const DEPENDENCY_SPEC_KEYS = [
  'admin_requires_variant',
  'admin_excludes_pack',
  'admin_requires_pack',
] as const;

function isValidPipeSeparated(value: string): boolean {
  if (!value) return true;
  return value
    .split(PIPE_SEPARATOR)
    .every((part) => part.trim().length > 0);
}

const CONTROLLED_SPEC_ENUM_LISTS: Record<string, EnumOption[]> = {
  spec_overview_fuel_type: FUEL_TYPES,
  spec_overview_drivetrain: DRIVETRAINS,
  spec_overview_transmission: TRANSMISSIONS,
};

function normalizeControlledEnum(
  rowNum: number,
  id: string | null,
  field: string,
  rawValue: string,
  enumList: EnumOption[],
  errors: ImportRowError[],
): string | null {
  if (!rawValue) return null;
  const normalized = normalizeEnum(rawValue, enumList);
  if (!normalized) {
    const suggestion = suggestEnumLabel(rawValue, enumList);
    errors.push(
      rowErr(
        rowNum,
        id,
        field,
        `Invalid value "${rawValue}". Allowed values: ${allowedEnumLabels(enumList)}${
          suggestion ? `. Did you mean ${suggestion}?` : ''
        }`,
      ),
    );
    return null;
  }
  return normalized;
}

// ─── Parse + validate ─────────────────────────────────────────────────────────

export function parseCsv(text: string): CsvParseResult {
  const { headers, rawRows } = parseCsvText(text);

  // 1. Header validation
  const headerErrors: string[] = [];
  const missingRequired = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  const missingSpec = SPEC_COLUMNS.filter((c) => !headers.includes(c));

  if (missingRequired.length) {
    headerErrors.push(`Missing required columns: ${missingRequired.join(', ')}`);
  }
  if (missingSpec.length) {
    headerErrors.push(`Missing spec columns: ${missingSpec.join(', ')}`);
  }

  if (headerErrors.length) {
    return { rows: [], errors: [], headerErrors, isValid: false };
  }

  // 2. Row validation
  const rows: ValidatedCsvRow[] = [];
  const errors: ImportRowError[] = [];
  const seenIds = new Set<string>();
  const seenVariantKeys = new Set<string>();

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const rowNum = i + 2; // 1-indexed, +1 for header row
    const rowErrors: ImportRowError[] = [];

    // row_type
    const rowType = v(raw, 'row_type') as AdminRowType;
    if (rowType !== 'BASE' && rowType !== 'VARIANT') {
      rowErrors.push(rowErr(rowNum, null, 'row_type', `row_type must be BASE or VARIANT, got "${rowType}"`));
    }

    // base_id
    const baseId = v(raw, 'base_id');
    if (!baseId) {
      rowErrors.push(rowErr(rowNum, null, 'base_id', 'base_id is required'));
    }

    // variant_code
    const variantCode = v(raw, 'variant_code') || null;
    if (rowType === 'BASE' && variantCode) {
      rowErrors.push(rowErr(rowNum, baseId || null, 'variant_code', 'BASE rows must have blank variant_code'));
    }
    if (rowType === 'VARIANT' && !variantCode) {
      rowErrors.push(rowErr(rowNum, baseId || null, 'variant_code', 'VARIANT rows require a non-empty variant_code'));
    }

    // id — derive if blank
    let id = v(raw, 'id');
    if (!id) {
      if (rowType === 'BASE') id = baseId;
      else if (rowType === 'VARIANT' && baseId && variantCode) id = `${baseId}${variantCode}`;
    }

    // BASE id must equal base_id
    if (rowType === 'BASE' && id && baseId && id !== baseId) {
      rowErrors.push(rowErr(rowNum, id, 'id', `BASE row id must equal base_id (got id="${id}", base_id="${baseId}")`));
    }

    // Required BASE fields for new rows (we'll check "new" during write, just validate presence)
    const make = v(raw, 'make');
    const model = v(raw, 'model');
    const yearRaw = v(raw, 'year');
    const bodyTypeRaw = v(raw, 'body_type');
    const normalizedBodyType = normalizeControlledEnum(
      rowNum,
      id || null,
      'body_type',
      bodyTypeRaw,
      BODY_TYPES,
      rowErrors,
    );
    const bodyType = normalizedBodyType ?? '';

    // year
    let year = 0;
    if (yearRaw) {
      year = parseInt(yearRaw, 10);
      if (isNaN(year) || year < 1900 || year > 2100) {
        rowErrors.push(rowErr(rowNum, id || null, 'year', `year must be a valid integer, got "${yearRaw}"`));
        year = 0;
      }
    }

    // price_aud
    const priceRaw = v(raw, 'price_aud');
    let priceAud: number | null = null;
    if (priceRaw) {
      priceAud = parseFloat(priceRaw.replace(/[,$]/g, ''));
      if (isNaN(priceAud)) {
        rowErrors.push(rowErr(rowNum, id || null, 'price_aud', `price_aud must be numeric, got "${priceRaw}"`));
        priceAud = null;
      }
    }

    // status
    const statusRaw = v(raw, 'status');
    let status: AdminVehicleStatus | null = null;
    if (statusRaw) {
      if (['draft', 'live', 'archived'].includes(statusRaw)) {
        status = statusRaw as AdminVehicleStatus;
      } else {
        rowErrors.push(rowErr(rowNum, id || null, 'status', `status must be draft/live/archived, got "${statusRaw}"`));
      }
    }

    const rawVariantKind = v(raw, 'admin_variant_kind');
    const dependencyValues = Object.fromEntries(
      DEPENDENCY_SPEC_KEYS.map((key) => [key, v(raw, key)]),
    ) as Record<(typeof DEPENDENCY_SPEC_KEYS)[number], string>;

    let normalizedVariantKind: 'variant' | 'pack' | null = null;
    if (rowType === 'BASE') {
      if (rawVariantKind) {
        rowErrors.push(rowErr(rowNum, id || null, 'admin_variant_kind', 'BASE rows must have blank admin_variant_kind'));
      }
    } else if (rowType === 'VARIANT') {
      if (!rawVariantKind) {
        normalizedVariantKind = 'variant';
      } else if (rawVariantKind === 'variant' || rawVariantKind === 'pack') {
        normalizedVariantKind = rawVariantKind;
      } else {
        rowErrors.push(
          rowErr(
            rowNum,
            id || null,
            'admin_variant_kind',
            `admin_variant_kind must be 'pack', 'variant', or blank, got "${rawVariantKind}"`,
          ),
        );
      }
    }

    const hasDependencyMetadata = DEPENDENCY_SPEC_KEYS.some((key) => dependencyValues[key].length > 0);
    if (rowType === 'BASE' && hasDependencyMetadata) {
      rowErrors.push(rowErr(rowNum, id || null, 'specs', 'BASE rows must not include dependency metadata'));
    }

    for (const key of DEPENDENCY_SPEC_KEYS) {
      const value = dependencyValues[key];
      if (!isValidPipeSeparated(value)) {
        rowErrors.push(rowErr(rowNum, id || null, key, `${key} must be a pipe-separated string with no empty entries`));
      }
    }

    if (rowType === 'VARIANT' && hasDependencyMetadata && normalizedVariantKind !== 'pack') {
      rowErrors.push(
        rowErr(
          rowNum,
          id || null,
          'admin_variant_kind',
          'Rows using pack dependency metadata must set admin_variant_kind=pack',
        ),
      );
    }

    // ID uniqueness within file
    if (id && seenIds.has(id)) {
      rowErrors.push(rowErr(rowNum, id, 'id', `Duplicate id "${id}" in CSV`));
    } else if (id) {
      seenIds.add(id);
    }

    // Variant uniqueness: (base_id, variant_code)
    if (rowType === 'VARIANT' && baseId && variantCode) {
      const variantKey = `${baseId}::${variantCode}`;
      if (seenVariantKeys.has(variantKey)) {
        rowErrors.push(rowErr(rowNum, id || null, 'variant_code', `Duplicate variant_code "${variantCode}" for base_id "${baseId}"`));
      } else {
        seenVariantKeys.add(variantKey);
      }
    }

    // gallery_image_urls — pipe-separated
    const galleryRaw = v(raw, 'gallery_image_urls');
    const galleryUrls = galleryRaw
      ? galleryRaw.split(PIPE_SEPARATOR).map((u) => u.trim()).filter(Boolean)
      : [];

    // Spec columns
    const specs: Record<string, string | null> = {};
    for (const key of SPEC_COLUMNS) {
      const val = v(raw, key);
      if (key === 'admin_variant_kind') {
        specs[key] = normalizedVariantKind;
      } else if (CONTROLLED_SPEC_ENUM_LISTS[key]) {
        const normalized = normalizeControlledEnum(
          rowNum,
          id || null,
          key,
          val,
          CONTROLLED_SPEC_ENUM_LISTS[key],
          rowErrors,
        );
        specs[key] = normalized;
      } else {
        specs[key] = val || null;
      }
    }

    // Collect errors
    errors.push(...rowErrors);
    if (rowErrors.length > 0) continue; // skip building ValidatedCsvRow for fatally invalid rows

    // Determine if every non-required field is blank (used for skipping no-op rows)
    const isBlankRow =
      !make && !model && !yearRaw && !bodyType && !statusRaw && !priceRaw &&
      !v(raw, 'cover_image_url') && !galleryRaw && !v(raw, 'image_source') && !v(raw, 'license_note') &&
      SPEC_COLUMNS.every((k) => !v(raw, k));

    rows.push({
      rowNumber: rowNum,
      id: id!,
      row_type: rowType,
      base_id: baseId,
      variant_code: variantCode,
      make,
      model,
      year,
      body_type: bodyType,
      status,
      price_aud: priceAud,
      cover_image_url: v(raw, 'cover_image_url') || null,
      gallery_image_urls: galleryUrls,
      image_source: v(raw, 'image_source') || null,
      license_note: v(raw, 'license_note') || null,
      specs,
      isBlankRow,
    });
  }

  return {
    rows,
    errors,
    headerErrors: [],
    isValid: errors.length === 0,
  };
}

// ─── Apply import ─────────────────────────────────────────────────────────────

export async function applyImport(
  parseResult: CsvParseResult,
  fileName: string,
  adminUserId: string | null,
): Promise<ImportResult> {
  const importId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const baseStats: ImportStats = {
    total_rows: parseResult.rows.length,
    base_rows: parseResult.rows.filter((r) => r.row_type === 'BASE').length,
    variant_rows: parseResult.rows.filter((r) => r.row_type === 'VARIANT').length,
    created: 0,
    updated: 0,
    archived: 0,
    errors: parseResult.errors.length,
  };

  // Abort if there are any fatal errors
  if (!parseResult.isValid) {
    const batch = await storeImportBatch({
      id: importId,
      created_at: createdAt,
      created_by_admin_id: adminUserId,
      file_name: fileName,
      file_hash: null,
      stats: { ...baseStats, errors: parseResult.errors.length + parseResult.headerErrors.length },
      errors: parseResult.errors,
      raw_csv_stored: false,
      notes: parseResult.headerErrors.join('; ') || null,
    });

    return { batch, success: false, stats: baseStats, errors: parseResult.errors };
  }

  // Fetch current DB state
  const allDbIds = await getAllVehicleIds();
  const liveDbIds = await getLiveVehicleIds();
  const dbBaseIds = await getAllDbBaseIds();

  const csvIds = new Set(parseResult.rows.map((r) => r.id));
  const baseRows = parseResult.rows.filter((r) => r.row_type === 'BASE');
  const variantRows = parseResult.rows.filter((r) => r.row_type === 'VARIANT');
  const packImportNotes = await buildPackImportNotes(baseRows, variantRows);

  // Validate VARIANT base_ids: base must exist in DB BASE rows or in this file's BASE rows
  const csvBaseIds = new Set(baseRows.map((r) => r.base_id));
  const additionalErrors: ImportRowError[] = [];

  for (const vRow of variantRows) {
    const baseExistsInDb = dbBaseIds.has(vRow.base_id);
    const baseExistsInCsv = csvBaseIds.has(vRow.base_id);
    if (!baseExistsInDb && !baseExistsInCsv) {
      additionalErrors.push({
        row_number: vRow.rowNumber,
        vehicle_id: vRow.id,
        field: 'base_id',
        message: `VARIANT base_id "${vRow.base_id}" not found in DB or in this CSV`,
      });
    }
  }

  if (additionalErrors.length > 0) {
    const batch = await storeImportBatch({
      id: importId,
      created_at: createdAt,
      created_by_admin_id: adminUserId,
      file_name: fileName,
      file_hash: null,
      stats: { ...baseStats, errors: additionalErrors.length },
      errors: additionalErrors,
      raw_csv_stored: false,
      notes: packImportNotes,
    });
    return { batch, success: false, stats: baseStats, errors: additionalErrors };
  }

  // ── Apply writes ─────────────────────────────────────────────────────────
  const writeErrors: ImportRowError[] = [];
  let created = 0;
  let updated = 0;

  // Pass 1: BASE rows
  for (const row of baseRows) {
    try {
      const existing = allDbIds.has(row.id) ? await getVehicle(row.id) : null;
      if (existing) {
        await importUpdateBase(existing, csvRowToAdminVehicle(row), importId);
        updated++;
      } else {
        // New BASE — require make/model/year/body_type
        if (!row.make || !row.model || !row.year || !row.body_type) {
          writeErrors.push({
            row_number: row.rowNumber,
            vehicle_id: row.id,
            field: null,
            message: 'New BASE row requires make, model, year, and body_type',
          });
          continue;
        }
        await importInsert(
          {
            ...csvRowToAdminVehicle(row),
            status: row.status ?? 'draft',
          },
          importId,
        );
        created++;
      }
    } catch (err) {
      writeErrors.push({
        row_number: row.rowNumber,
        vehicle_id: row.id,
        field: null,
        message: String(err),
      });
    }
  }

  // Pass 2: VARIANT rows
  for (const row of variantRows) {
    try {
      const isNew = !allDbIds.has(row.id);
      await importUpsertVariant(csvRowToAdminVehicle(row), importId, isNew);
      if (isNew) created++;
      else updated++;
    } catch (err) {
      writeErrors.push({
        row_number: row.rowNumber,
        vehicle_id: row.id,
        field: null,
        message: String(err),
      });
    }
  }

  // Archive missing rows — DB rows not present in CSV
  let archived = 0;
  for (const dbId of liveDbIds) {
    if (!csvIds.has(dbId)) {
      try {
        await archiveVehicle(dbId, 'missing_from_import', importId);
        archived++;
      } catch (err) {
        writeErrors.push({ row_number: -1, vehicle_id: dbId, field: null, message: String(err) });
      }
    }
  }

  const finalStats: ImportStats = {
    ...baseStats,
    created,
    updated,
    archived,
    errors: writeErrors.length,
  };

  const batch = await storeImportBatch({
    id: importId,
    created_at: createdAt,
    created_by_admin_id: adminUserId,
    file_name: fileName,
    file_hash: null,
    stats: finalStats,
    errors: writeErrors,
    raw_csv_stored: false,
    notes: packImportNotes,
  });

  return {
    batch,
    success: writeErrors.length === 0,
    stats: finalStats,
    errors: writeErrors,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function csvRowToAdminVehicle(row: ValidatedCsvRow): AdminVehicle {
  return {
    id: row.id,
    row_type: row.row_type,
    base_id: row.base_id,
    variant_code: row.variant_code,
    status: row.status ?? 'draft',
    archived_at: null,
    last_import_id: null,
    created_at: '',
    updated_at: '',
    make: row.make,
    model: row.model,
    year: row.year,
    body_type: row.body_type,
    price_aud: row.price_aud,
    cover_image_url: row.cover_image_url,
    gallery_image_urls: row.gallery_image_urls,
    image_source: row.image_source,
    license_note: row.license_note,
    specs: row.specs,
  };
}

async function getAllDbBaseIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('admin_vehicles')
    .select('id')
    .eq('row_type', 'BASE');
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.id as string));
}

async function buildPackImportNotes(
  baseRows: ValidatedCsvRow[],
  variantRows: ValidatedCsvRow[],
): Promise<string | null> {
  const packRows = variantRows.filter((row) => row.specs['admin_variant_kind'] === 'pack');
  if (packRows.length === 0) return null;

  const notes: string[] = [
    'Pack rows are treated as delta pricing (AUD): price_aud is added on top of the selected trim.',
  ];

  const csvBasePrices = new Map<string, number>();
  for (const row of baseRows) {
    if (row.price_aud != null) csvBasePrices.set(row.base_id, row.price_aud);
  }

  const dbBasePriceCache = new Map<string, number | null>();
  for (const packRow of packRows) {
    if (packRow.price_aud == null) continue;

    let basePrice = csvBasePrices.get(packRow.base_id) ?? null;
    if (basePrice == null) {
      if (!dbBasePriceCache.has(packRow.base_id)) {
        const dbBase = await getVehicle(packRow.base_id);
        dbBasePriceCache.set(
          packRow.base_id,
          dbBase && dbBase.row_type === 'BASE' ? dbBase.price_aud : null,
        );
      }
      basePrice = dbBasePriceCache.get(packRow.base_id) ?? null;
    }

    if (basePrice != null && packRow.price_aud > basePrice) {
      notes.push(
        `Warning row ${packRow.rowNumber} (${packRow.id}): pack delta $${packRow.price_aud.toLocaleString()} exceeds base price $${basePrice.toLocaleString()} for ${packRow.base_id}.`,
      );
    }
  }

  return notes.join(' ');
}

async function storeImportBatch(batch: ImportBatch): Promise<ImportBatch> {
  const { error } = await supabase.from('admin_import_batches').insert({
    id: batch.id,
    created_at: batch.created_at,
    created_by_admin_id: batch.created_by_admin_id,
    file_name: batch.file_name,
    file_hash: batch.file_hash,
    stats: batch.stats,
    errors: batch.errors,
    raw_csv_stored: batch.raw_csv_stored,
    notes: batch.notes,
  });
  if (error) console.error('Failed to store import batch:', error);
  return batch;
}

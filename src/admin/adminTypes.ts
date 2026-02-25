/** Status of an admin vehicle record. */
export type AdminVehicleStatus = 'draft' | 'live' | 'archived';

/** Row type — BASE is the canonical record, VARIANT stores overrides only. */
export type AdminRowType = 'BASE' | 'VARIANT';

/** Archive reason for audit log. */
export type ArchiveReason = 'missing_from_import' | 'manual_archive' | 'other';

/**
 * Flat vehicle record stored in admin_vehicles.
 *
 * Specs are stored as a flexible JSON blob keyed by the canonical spec column keys
 * defined in csv/specSchema.ts. VARIANT rows store only their overrides — null means
 * "inherit from BASE at render time".
 */
export interface AdminVehicle {
  id: string;
  row_type: AdminRowType;
  /** For BASE: equals id. For VARIANT: the BASE record's id. */
  base_id: string;
  /** Null for BASE. Non-empty string for VARIANT (appended to base_id to form the VARIANT id). */
  variant_code: string | null;
  status: AdminVehicleStatus;
  archived_at: string | null;
  last_import_id: string | null;
  created_at: string;
  updated_at: string;

  // Core identity
  make: string;
  model: string;
  year: number;
  body_type: string;

  // Commercial — full price per row, never a delta
  price_aud: number | null;

  // Images
  cover_image_url: string | null;
  gallery_image_urls: string[];
  image_source: string | null;
  license_note: string | null;

  /**
   * All spec + narrative fields keyed by canonical SPEC_COLUMN_DEFS[].key values.
   * Null means blank/not set. For VARIANT rows null = inherit from BASE.
   */
  specs: Record<string, string | null>;
}

/** AdminVehicle with all VARIANT blanks resolved against its BASE. */
export interface ResolvedAdminVehicle extends AdminVehicle {
  /** Discriminant — always true on resolved records. */
  isResolved: true;
}

/** Import batch record stored in admin_import_batches. */
export interface ImportBatch {
  id: string;
  created_at: string;
  created_by_admin_id: string | null;
  file_name: string;
  file_hash: string | null;
  stats: ImportStats;
  errors: ImportRowError[];
  raw_csv_stored: boolean;
  notes: string | null;
}

export interface ImportStats {
  total_rows: number;
  base_rows: number;
  variant_rows: number;
  created: number;
  updated: number;
  archived: number;
  errors: number;
}

export interface ImportRowError {
  row_number: number;
  vehicle_id: string | null;
  field: string | null;
  message: string;
}

/** Audit log entry stored in admin_archive_logs. */
export interface VehicleArchiveLog {
  id: string;
  vehicle_id: string;
  import_id: string | null;
  archived_at: string;
  reason: ArchiveReason;
  previous_status: AdminVehicleStatus;
  new_status: AdminVehicleStatus;
}

/** Validated + normalised CSV row ready for a DB write. */
export interface ValidatedCsvRow {
  rowNumber: number;
  id: string;
  row_type: AdminRowType;
  base_id: string;
  variant_code: string | null;
  make: string;
  model: string;
  year: number;
  body_type: string;
  /** null = blank in CSV → use existing value for BASE, or default 'draft' for new BASE */
  status: AdminVehicleStatus | null;
  price_aud: number | null;
  cover_image_url: string | null;
  gallery_image_urls: string[];
  image_source: string | null;
  license_note: string | null;
  /** null value per key = blank in CSV */
  specs: Record<string, string | null>;
  /** True if every non-identity field is blank (useful for skipping no-op rows) */
  isBlankRow: boolean;
}

/** Result of parsing + validating a CSV file. */
export interface CsvParseResult {
  rows: ValidatedCsvRow[];
  errors: ImportRowError[];
  headerErrors: string[];
  /** False if any fatal header or row-level errors exist. */
  isValid: boolean;
}

/** Final result returned to the UI after an import attempt. */
export interface ImportResult {
  batch: ImportBatch;
  success: boolean;
  stats: ImportStats;
  errors: ImportRowError[];
}

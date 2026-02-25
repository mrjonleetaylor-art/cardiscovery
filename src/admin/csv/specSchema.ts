/**
 * SINGLE SOURCE OF TRUTH — Admin CSV schema.
 *
 * SPEC_COLUMN_DEFS defines every spec/narrative field that appears in the CSV
 * and in the AdminVehicle.specs blob. The `key` is the canonical CSV column name.
 * The `path` documents which field in StructuredSpecs it maps to (used by the
 * admin→public compatibility bridge in adminResolver.ts).
 *
 * This module is imported by:
 *   - csvExport.ts     — to build the CSV header row
 *   - csvImport.ts     — to validate headers and map values
 *   - adminVehicles.ts — for form field enumeration
 *   - adminResolver.ts — for the public compatibility bridge
 *
 * Do NOT add or remove columns without updating all consumers.
 */

export interface SpecColumnDef {
  /** Canonical CSV column name; also the key used in AdminVehicle.specs. */
  key: string;
  /** Human-readable label used in the admin form. */
  label: string;
  /** Dot-path into StructuredSpecs (e.g. "overview.fuelType") or top-level key. */
  path: string;
  /** Form section grouping. */
  category: 'overview' | 'efficiency' | 'performance' | 'connectivity' | 'safety' | 'narrative';
  /** True if the field should render as a textarea in the admin form. */
  multiline?: boolean;
}

export const SPEC_COLUMN_DEFS: SpecColumnDef[] = [
  // ── Overview ──────────────────────────────────────────────────────────────
  { key: 'spec_overview_fuel_type',    label: 'Fuel Type',    path: 'overview.fuelType',    category: 'overview' },
  { key: 'spec_overview_drivetrain',   label: 'Drivetrain',   path: 'overview.drivetrain',  category: 'overview' },
  { key: 'spec_overview_transmission', label: 'Transmission', path: 'overview.transmission',category: 'overview' },
  { key: 'spec_overview_seating',      label: 'Seating',      path: 'overview.seating',     category: 'overview' },
  { key: 'spec_overview_warranty',     label: 'Warranty',     path: 'overview.warranty',    category: 'overview' },

  // ── Efficiency ─────────────────────────────────────────────────────────────
  { key: 'spec_efficiency_fuel_economy',        label: 'Fuel Economy',        path: 'efficiency.fuelEconomy',       category: 'efficiency' },
  { key: 'spec_efficiency_real_world_estimate', label: 'Real World Estimate', path: 'efficiency.realWorldEstimate', category: 'efficiency' },
  { key: 'spec_efficiency_fuel_tank',           label: 'Fuel Tank',           path: 'efficiency.fuelTank',          category: 'efficiency' },
  { key: 'spec_efficiency_estimated_range',     label: 'Estimated Range',     path: 'efficiency.estimatedRange',    category: 'efficiency' },
  { key: 'spec_efficiency_service_interval',    label: 'Service Interval',    path: 'efficiency.serviceInterval',   category: 'efficiency' },
  { key: 'spec_efficiency_annual_running_cost', label: 'Annual Running Cost', path: 'efficiency.annualRunningCost', category: 'efficiency' },
  { key: 'spec_efficiency_ownership_summary',   label: 'Ownership Summary',   path: 'efficiency.ownershipSummary',  category: 'efficiency', multiline: true },

  // ── Performance ────────────────────────────────────────────────────────────
  { key: 'spec_performance_power',             label: 'Power',             path: 'performance.power',           category: 'performance' },
  { key: 'spec_performance_torque',            label: 'Torque',            path: 'performance.torque',          category: 'performance' },
  { key: 'spec_performance_zero_to_hundred',   label: '0–100 km/h',       path: 'performance.zeroToHundred',   category: 'performance' },
  { key: 'spec_performance_top_speed',         label: 'Top Speed',         path: 'performance.topSpeed',        category: 'performance' },
  { key: 'spec_performance_weight',            label: 'Weight',            path: 'performance.weight',          category: 'performance' },
  { key: 'spec_performance_power_to_weight',   label: 'Power to Weight',   path: 'performance.powerToWeight',   category: 'performance' },
  { key: 'spec_performance_suspension',        label: 'Suspension',        path: 'performance.suspension',      category: 'performance' },
  { key: 'spec_performance_engine',            label: 'Engine',            path: 'performance.engine',          category: 'performance' },
  { key: 'spec_performance_driving_character', label: 'Driving Character', path: 'performance.drivingCharacter',category: 'performance', multiline: true },

  // ── Connectivity ───────────────────────────────────────────────────────────
  { key: 'spec_connectivity_screen_size',       label: 'Screen Size',       path: 'connectivity.screenSize',      category: 'connectivity' },
  { key: 'spec_connectivity_digital_cluster',   label: 'Digital Cluster',   path: 'connectivity.digitalCluster',  category: 'connectivity' },
  { key: 'spec_connectivity_apple_carplay',     label: 'Apple CarPlay',     path: 'connectivity.appleCarPlay',    category: 'connectivity' },
  { key: 'spec_connectivity_android_auto',      label: 'Android Auto',      path: 'connectivity.androidAuto',     category: 'connectivity' },
  { key: 'spec_connectivity_wireless_charging', label: 'Wireless Charging', path: 'connectivity.wirelessCharging',category: 'connectivity' },
  { key: 'spec_connectivity_sound_system',      label: 'Sound System',      path: 'connectivity.soundSystem',     category: 'connectivity' },
  { key: 'spec_connectivity_app_support',       label: 'App Support',       path: 'connectivity.appSupport',      category: 'connectivity' },
  { key: 'spec_connectivity_ota_updates',       label: 'OTA Updates',       path: 'connectivity.otaUpdates',      category: 'connectivity' },
  { key: 'spec_connectivity_tech_summary',      label: 'Tech Summary',      path: 'connectivity.techSummary',     category: 'connectivity', multiline: true },

  // ── Safety ─────────────────────────────────────────────────────────────────
  { key: 'spec_safety_ancap_rating',          label: 'ANCAP Rating',          path: 'safety.ancapRating',         category: 'safety' },
  { key: 'spec_safety_adaptive_cruise',       label: 'Adaptive Cruise',       path: 'safety.adaptiveCruise',      category: 'safety' },
  { key: 'spec_safety_blind_spot_monitoring', label: 'Blind Spot Monitoring', path: 'safety.blindSpotMonitoring', category: 'safety' },
  { key: 'spec_safety_lane_keep_assist',      label: 'Lane Keep Assist',      path: 'safety.laneKeepAssist',      category: 'safety' },
  { key: 'spec_safety_aeb',                   label: 'AEB',                   path: 'safety.aeb',                 category: 'safety' },
  { key: 'spec_safety_airbags',               label: 'Airbags',               path: 'safety.airbags',             category: 'safety' },
  { key: 'spec_safety_rear_cross_traffic',    label: 'Rear Cross Traffic',    path: 'safety.rearCrossTraffic',    category: 'safety' },
  { key: 'spec_safety_safety_summary',        label: 'Safety Summary',        path: 'safety.safetySummary',       category: 'safety', multiline: true },

  // ── Narrative ──────────────────────────────────────────────────────────────
  { key: 'ai_summary',          label: 'AI Summary',                 path: 'ai_summary',          category: 'narrative', multiline: true },
  { key: 'best_for',            label: 'Best For (pipe-separated)',  path: 'best_for',            category: 'narrative' },
  { key: 'trade_offs',          label: 'Trade-offs (pipe-separated)',path: 'trade_offs',          category: 'narrative' },
  { key: 'positioning_summary', label: 'Positioning Summary',        path: 'positioning_summary', category: 'narrative', multiline: true },
  { key: 'tags',                label: 'Tags (pipe-separated)',      path: 'tags',                category: 'narrative' },
] as const;

/** Spec column keys in declared order. */
export const SPEC_COLUMNS = SPEC_COLUMN_DEFS.map((d) => d.key);

/**
 * Required identity CSV columns (must appear in every file).
 * NOTE: `id` is present but may be blank — system derives it if so.
 */
export const REQUIRED_COLUMNS = [
  'row_type',
  'base_id',
  'variant_code',
  'id',
  'make',
  'model',
  'year',
  'body_type',
  'status',
  'price_aud',
  'cover_image_url',
  'gallery_image_urls',
  'image_source',
  'license_note',
] as const;

/** Complete ordered column list used for the CSV header row. */
export const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...SPEC_COLUMNS] as const;

export type RequiredColumnKey = (typeof REQUIRED_COLUMNS)[number];
export type SpecColumnKey = (typeof SPEC_COLUMNS)[number];
export type AllColumnKey = (typeof ALL_COLUMNS)[number];

/** Pipe separator used for array fields in CSV (gallery, best_for, trade_offs, tags). */
export const PIPE_SEPARATOR = '|';

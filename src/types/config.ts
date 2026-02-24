/**
 * A single patch applied by a variant or subvariant.
 *
 * Spec paths:  "specs.{category}.{field}"  e.g. "specs.performance.power"
 * Image paths: "images"          op "replace" | "append"
 *              "images.hero"     op "set"  (keeps gallery, overrides hero display)
 */
export interface Effect {
  path: string;
  op: 'set' | 'replace' | 'append';
  value: unknown;
}

/** A selectable Layer-1 or Layer-2 configuration option. */
export interface ConfigOption {
  id: string;
  name: string;
  description?: string;
  priceDelta?: number;
  effects: Effect[];
}

/** Full selection state across all four layers. */
export interface VehicleConfigSelection {
  variantId?: string | null;    // Layer 1
  subvariantId?: string | null; // Layer 2
  trimId?: string | null;       // Layer 3 (existing)
  packIds: string[];            // Layer 4 (existing)
}

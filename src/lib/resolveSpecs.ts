import {
  StructuredVehicle,
  StructuredSpecs,
  SpecAdjustment,
  Pack,
  ResolvedSpecs,
} from '../types/specs';

/**
 * Returns a new StructuredSpecs with each adjustment applied.
 * Never mutates the original object.
 */
export function applySpecAdjustments(
  specs: StructuredSpecs,
  adjustments: SpecAdjustment[]
): StructuredSpecs {
  const result = JSON.parse(JSON.stringify(specs)) as StructuredSpecs;
  for (const adj of adjustments) {
    const category = result[adj.category] as Record<string, string | number | undefined>;
    if (category !== undefined) {
      category[adj.field] = adj.value;
    }
  }
  return result;
}

/**
 * Resolves the full spec set and price for a vehicle given an optional trim
 * selection and optional pack selections.
 *
 * - Defaults to the first trim when trimId is omitted or not found.
 * - Applies every selected pack's specAdjustments on top of the trim base specs.
 * - totalPrice = trim.basePrice + sum of selected pack priceDelta values.
 */
export function resolveSpecs(
  vehicle: StructuredVehicle,
  trimId?: string,
  selectedPackIds?: string[]
): ResolvedSpecs {
  const trim =
    (trimId ? vehicle.trims.find(t => t.id === trimId) : null) ??
    vehicle.trims[0];

  const selectedPacks: Pack[] = [];
  const allAdjustments: SpecAdjustment[] = [];
  let totalPrice = trim.basePrice;

  for (const packId of selectedPackIds ?? []) {
    const pack = trim.packs.find(p => p.id === packId);
    if (pack) {
      selectedPacks.push(pack);
      totalPrice += pack.priceDelta;
      if (pack.specAdjustments) {
        allAdjustments.push(...pack.specAdjustments);
      }
    }
  }

  return {
    specs: applySpecAdjustments(trim.specs, allAdjustments),
    totalPrice,
    selectedTrim: trim,
    selectedPacks,
  };
}

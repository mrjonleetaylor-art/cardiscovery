import { StructuredVehicle, ResolvedSpecs, SpecAdjustment, StructuredSpecs } from '../types/specs';
import { ConfigOption, Effect, VehicleConfigSelection } from '../types/config';
import { resolveSpecs, applySpecAdjustments } from './resolveSpecs';

export interface ResolvedVehicle extends ResolvedSpecs {
  /** Gallery after replace/append image effects have been applied. */
  resolvedImages: string[];
  /** Hero URL: explicit override from images.hero effect, otherwise resolvedImages[0]. */
  heroImageUrl: string | null;
}

/**
 * Converts a dot-path effect ("specs.performance.power") to a SpecAdjustment.
 * Returns null for non-spec paths.
 */
function toSpecAdjustment(effect: Effect): SpecAdjustment | null {
  if (!effect.path.startsWith('specs.')) return null;
  const parts = effect.path.split('.');
  if (parts.length !== 3) return null;
  const [, category, field] = parts;
  return {
    category: category as keyof StructuredSpecs,
    field,
    value: effect.value as string | number,
  };
}

/**
 * Applies a list of ConfigOption effects to the current spec + image state.
 * Returns updated specs, images array, and optional hero override.
 */
function applyOptionEffects(
  option: ConfigOption,
  specs: StructuredSpecs,
  images: string[],
  heroOverride: string | null,
): { specs: StructuredSpecs; images: string[]; heroOverride: string | null } {
  let nextSpecs = specs;
  let nextImages = images;
  let nextHero = heroOverride;

  const specAdjs: SpecAdjustment[] = [];

  for (const effect of option.effects) {
    if (effect.path === 'images') {
      if (effect.op === 'replace') {
        nextImages = effect.value as string[];
      } else if (effect.op === 'append') {
        const toAdd = (effect.value as string[]).filter(u => !nextImages.includes(u));
        nextImages = [...nextImages, ...toAdd];
      }
    } else if (effect.path === 'images.hero') {
      nextHero = effect.value as string;
    } else {
      const adj = toSpecAdjustment(effect);
      if (adj) specAdjs.push(adj);
    }
  }

  if (specAdjs.length > 0) {
    nextSpecs = applySpecAdjustments(nextSpecs, specAdjs);
  }

  return { specs: nextSpecs, images: nextImages, heroOverride: nextHero };
}

/**
 * Resolves a vehicle against a full four-layer selection.
 *
 * Effect application order:
 *   1. Variant effects (Layer 1)
 *   2. Subvariant effects (Layer 2)
 *   3. Pack specAdjustments (handled internally by resolveSpecs)
 *
 * Vehicles without variants/subvariants are passed through unchanged.
 */
export function resolveConfiguredVehicle(
  vehicle: StructuredVehicle,
  selection: VehicleConfigSelection,
): ResolvedVehicle {
  // Base resolution: trim + packs (existing behaviour, unchanged).
  const base = resolveSpecs(vehicle, selection.trimId ?? undefined, selection.packIds);

  let images: string[] = [...vehicle.images];
  let heroOverride: string | null = null;
  let specs = base.specs;
  let priceDelta = 0;

  // Layer 1 — variant
  if (selection.variantId) {
    const variant = vehicle.variants?.find(v => v.id === selection.variantId);
    if (variant) {
      ({ specs, images, heroOverride } = applyOptionEffects(variant, specs, images, heroOverride));
      priceDelta += variant.priceDelta ?? 0;
    }
  }

  // Layer 2 — subvariant
  if (selection.subvariantId) {
    const sub = vehicle.subvariants?.find(s => s.id === selection.subvariantId);
    if (sub) {
      ({ specs, images, heroOverride } = applyOptionEffects(sub, specs, images, heroOverride));
      priceDelta += sub.priceDelta ?? 0;
    }
  }

  // Layer 5 — configGroups (single first, then multi, in declared order)
  if (vehicle.configGroups?.length) {
    const groupSelection = selection.selectedOptionsByGroup ?? {};
    const allGroups = vehicle.configGroups;
    const singleGroups = allGroups.filter(g => g.type === 'single');
    const multiGroups = allGroups.filter(g => g.type === 'multi');

    for (const group of [...singleGroups, ...multiGroups]) {
      const selectedIds = groupSelection[group.id] ?? [];
      const optionsToApply = group.type === 'single'
        ? group.options.filter(o => o.id === selectedIds[0])
        : group.options.filter(o => selectedIds.includes(o.id));

      for (const option of optionsToApply) {
        ({ specs, images, heroOverride } = applyOptionEffects(option, specs, images, heroOverride));
        priceDelta += option.priceDelta ?? 0;
      }
    }
  }

  return {
    ...base,
    specs,
    totalPrice: base.totalPrice + priceDelta,
    resolvedImages: images,
    heroImageUrl: heroOverride ?? images[0] ?? null,
  };
}

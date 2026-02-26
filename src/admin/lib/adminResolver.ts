/**
 * Canonical resolver for admin vehicles.
 *
 * resolveAdminVehicle(base, variant?) → ResolvedAdminVehicle
 *   - For every spec field: if variant value is null/blank → use base value.
 *   - For gallery_image_urls: if variant array is empty → inherit base gallery.
 *   - For price_aud: if variant is null → inherit base price.
 *
 * This resolver is the single bridge between the admin BASE/VARIANT storage model
 * and any display surface (admin preview + future public rendering).
 *
 * adminVehicleToStructuredVehicle() adapts the resolved flat record into the
 * StructuredVehicle shape expected by the existing public UI components.
 */

import { AdminVehicle, ResolvedAdminVehicle } from '../adminTypes';
import { SPEC_COLUMN_DEFS } from '../csv/specSchema';
import type { StructuredVehicle, StructuredSpecs, Pack, SpecAdjustment } from '../../types/specs';

// ─── Admin resolver ───────────────────────────────────────────────────────────

/**
 * Merges base + variant into a fully populated AdminVehicle.
 * VARIANT null fields inherit the BASE value.
 * VARIANT empty arrays ([]) are treated as "explicit none" — do not inherit.
 */
export function resolveAdminVehicle(
  base: AdminVehicle,
  variant?: AdminVehicle | null,
): ResolvedAdminVehicle {
  if (!variant) {
    return { ...base, isResolved: true };
  }

  const resolvedSpecs: Record<string, string | null> = {};
  for (const def of SPEC_COLUMN_DEFS) {
    const vVal = variant.specs[def.key];
    resolvedSpecs[def.key] = vVal !== null && vVal !== '' ? vVal : (base.specs[def.key] ?? null);
  }

  return {
    ...base,
    ...variant,
    // Identity fallbacks: VARIANT must always have these, but just in case
    make: variant.make || base.make,
    model: variant.model || base.model,
    year: variant.year || base.year,
    body_type: variant.body_type || base.body_type,
    // Price: inherit from base if variant is null
    price_aud: variant.price_aud ?? base.price_aud,
    // Images: inherit from base if variant has none
    cover_image_url: variant.cover_image_url ?? base.cover_image_url,
    gallery_image_urls:
      variant.gallery_image_urls.length > 0
        ? variant.gallery_image_urls
        : base.gallery_image_urls,
    // Merged specs
    specs: resolvedSpecs,
    isResolved: true,
  };
}

// ─── Public compatibility bridge ─────────────────────────────────────────────

/**
 * Converts a resolved AdminVehicle into the StructuredVehicle shape consumed
 * by the public UI (Discovery, Profile, Compare, Garage).
 *
 * This is used ONLY by the admin preview — the public app continues to read
 * from src/data/structuredVehicles.ts until that data source is migrated.
 *
 * The output matches the StructuredVehicle contract exactly so that
 * resolveConfiguredVehicle() and all downstream components work unchanged.
 *
 * @param resolved  The fully-resolved BASE (or VARIANT) admin vehicle.
 * @param packVariants  Optional raw pack VARIANT rows for this base. Each will be
 *                      resolved against `resolved` and converted into a Pack.
 */
export function adminVehicleToStructuredVehicle(
  resolved: ResolvedAdminVehicle,
  packVariants: AdminVehicle[] = [],
): StructuredVehicle {
  const s = resolved.specs;

  const images: string[] = [];
  if (resolved.cover_image_url) images.push(resolved.cover_image_url);
  for (const url of resolved.gallery_image_urls) {
    if (url && !images.includes(url)) images.push(url);
  }

  const specs: StructuredSpecs = {
    overview: {
      bodyType: resolved.body_type || s['spec_overview_fuel_type'] || undefined,
      fuelType: s['spec_overview_fuel_type'] || undefined,
      drivetrain: s['spec_overview_drivetrain'] || undefined,
      transmission: s['spec_overview_transmission'] || undefined,
      seating: s['spec_overview_seating'] ? Number(s['spec_overview_seating']) : undefined,
      warranty: s['spec_overview_warranty'] || undefined,
    },
    efficiency: {
      fuelEconomy: s['spec_efficiency_fuel_economy'] || undefined,
      realWorldEstimate: s['spec_efficiency_real_world_estimate'] || undefined,
      fuelTank: s['spec_efficiency_fuel_tank'] || undefined,
      estimatedRange: s['spec_efficiency_estimated_range'] || undefined,
      serviceInterval: s['spec_efficiency_service_interval'] || undefined,
      annualRunningCost: s['spec_efficiency_annual_running_cost'] || undefined,
      ownershipSummary: s['spec_efficiency_ownership_summary'] || undefined,
    },
    performance: {
      power: s['spec_performance_power'] || undefined,
      torque: s['spec_performance_torque'] || undefined,
      zeroToHundred: s['spec_performance_zero_to_hundred'] || undefined,
      topSpeed: s['spec_performance_top_speed'] || undefined,
      weight: s['spec_performance_weight'] || undefined,
      powerToWeight: s['spec_performance_power_to_weight'] || undefined,
      suspension: s['spec_performance_suspension'] || undefined,
      engine: s['spec_performance_engine'] || undefined,
      drivingCharacter: s['spec_performance_driving_character'] || undefined,
    },
    connectivity: {
      screenSize: s['spec_connectivity_screen_size'] || undefined,
      digitalCluster: s['spec_connectivity_digital_cluster'] || undefined,
      appleCarPlay: s['spec_connectivity_apple_carplay'] || undefined,
      androidAuto: s['spec_connectivity_android_auto'] || undefined,
      wirelessCharging: s['spec_connectivity_wireless_charging'] || undefined,
      soundSystem: s['spec_connectivity_sound_system'] || undefined,
      appSupport: s['spec_connectivity_app_support'] || undefined,
      otaUpdates: s['spec_connectivity_ota_updates'] || undefined,
      techSummary: s['spec_connectivity_tech_summary'] || undefined,
    },
    safety: {
      ancapRating: s['spec_safety_ancap_rating'] || undefined,
      adaptiveCruise: s['spec_safety_adaptive_cruise'] || undefined,
      blindSpotMonitoring: s['spec_safety_blind_spot_monitoring'] || undefined,
      laneKeepAssist: s['spec_safety_lane_keep_assist'] || undefined,
      aeb: s['spec_safety_aeb'] || undefined,
      airbags: s['spec_safety_airbags'] ? Number(s['spec_safety_airbags']) : undefined,
      rearCrossTraffic: s['spec_safety_rear_cross_traffic'] || undefined,
      safetySummary: s['spec_safety_safety_summary'] || undefined,
    },
  };

  const parsePipe = (val: string | null | undefined): string[] =>
    val ? val.split('|').map((v) => v.trim()).filter(Boolean) : [];

  // ── Build packs from pack VARIANT rows ─────────────────────────────────────
  const packs: Pack[] = packVariants.map((packVariant) => {
    const resolvedPack = resolveAdminVehicle(resolved, packVariant);
    const packName =
      packVariant.specs['pack_name'] ||
      packVariant.license_note ||
      packVariant.variant_code ||
      packVariant.id;

    const priceDelta =
      resolvedPack.price_aud != null && resolved.price_aud != null
        ? resolvedPack.price_aud - resolved.price_aud
        : 0;

    // Diff base vs pack resolved specs — collect adjustments for changed structured fields
    const specAdjustments: SpecAdjustment[] = [];
    for (const def of SPEC_COLUMN_DEFS) {
      if (def.category === 'admin' || def.category === 'narrative') continue;
      const dotIdx = def.path.indexOf('.');
      if (dotIdx === -1) continue; // skip top-level narrative paths
      const category = def.path.slice(0, dotIdx) as keyof StructuredSpecs;
      const field = def.path.slice(dotIdx + 1);
      const baseVal = resolved.specs[def.key];
      const packVal = resolvedPack.specs[def.key];
      if (packVal && packVal !== baseVal) {
        specAdjustments.push({ category, field, value: packVal });
      }
    }

    return {
      id: `${resolved.id}:${packVariant.variant_code}`,
      name: packName,
      category: 'option',
      priceDelta,
      features: [],
      specAdjustments: specAdjustments.length > 0 ? specAdjustments : undefined,
    };
  });

  return {
    id: resolved.id,
    make: resolved.make,
    model: resolved.model,
    year: resolved.year,
    images,
    aiSummary: s['ai_summary'] || undefined,
    bestFor: parsePipe(s['best_for']),
    tradeOffs: parsePipe(s['trade_offs']),
    positioningSummary: s['positioning_summary'] || undefined,
    tags: parsePipe(s['tags']),
    trims: [
      {
        id: `${resolved.id}-default`,
        name: 'Default',
        basePrice: resolved.price_aud ?? 0,
        specs,
        packs,
      },
    ],
  };
}

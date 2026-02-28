import { AdminVehicle } from '../admin/adminTypes';
import { adminVehicleToStructuredVehicle, resolveAdminVehicle } from '../admin/lib/adminResolver';
import { supabase } from './supabase';
import { StructuredVehicle } from '../types/specs';

type RawVehicleRow = Record<string, unknown>;
const LIVE_VEHICLE_SELECT_COLUMNS = [
  'id',
  'row_type',
  'base_id',
  'variant_code',
  'status',
  'archived_at',
  'last_import_id',
  'created_at',
  'updated_at',
  'make',
  'model',
  'year',
  'body_type',
  'price_aud',
  'cover_image_url',
  'gallery_image_urls',
  'image_source',
  'license_note',
  'specs',
].join(',');

function rowToVehicle(row: RawVehicleRow): AdminVehicle {
  return {
    id: row.id as string,
    row_type: row.row_type as AdminVehicle['row_type'],
    base_id: row.base_id as string,
    variant_code: (row.variant_code as string) ?? null,
    status: row.status as AdminVehicle['status'],
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

function variantKind(vehicle: AdminVehicle): string | null {
  return vehicle.specs['admin_variant_kind'] ?? null;
}

function norm(value: unknown): string {
  return (value ?? '').toString().trim().toLowerCase();
}

function isPackVariant(row: AdminVehicle): boolean {
  return norm(variantKind(row)) === 'pack' || norm(row.specs['pack_name']).length > 0;
}

function pickCheapestVariant(variants: AdminVehicle[]): AdminVehicle | undefined {
  return variants
    .slice()
    .sort((a, b) => {
      const aPrice = a.price_aud ?? Number.POSITIVE_INFINITY;
      const bPrice = b.price_aud ?? Number.POSITIVE_INFINITY;
      if (aPrice !== bPrice) return aPrice - bPrice;
      return (a.variant_code ?? '').localeCompare(b.variant_code ?? '');
    })[0];
}

function chooseDefaultEngineVariant(
  base: AdminVehicle,
  engineVariants: AdminVehicle[],
): AdminVehicle | undefined {
  // Public default must represent the BASE configuration whenever BASE has explicit pricing.
  if (base.price_aud != null) return undefined;
  if (engineVariants.length === 0) return undefined;
  return pickCheapestVariant(engineVariants);
}

function runDevInvariantChecks(
  base: AdminVehicle,
  variants: AdminVehicle[],
  packVariants: AdminVehicle[],
  defaultEngineVariant: AdminVehicle | undefined,
): void {
  if (!import.meta.env.DEV) return;

  if (base.price_aud != null && defaultEngineVariant) {
    console.warn(
      '[liveVehicles] Invariant failed: BASE with explicit price should not auto-select engine variant.',
      { baseId: base.id, basePrice: base.price_aud, chosenDefaultVariant: defaultEngineVariant.id },
    );
  }

  // Rows with pack_name should classify as packs even if admin_variant_kind is blank/misaligned.
  for (const variant of variants) {
    if (norm(variant.specs['pack_name']).length > 0) {
      const present = packVariants.some((p) => p.id === variant.id);
      if (!present) {
        console.warn(
          '[liveVehicles] Invariant failed: row with pack_name was not classified as pack.',
          { baseId: base.id, variantId: variant.id, packName: variant.specs['pack_name'] },
        );
      }
    }
  }
}

let didRunLegacyVariantSanityCheck = false;
function runLegacyVariantSanityCheck(): void {
  if (!import.meta.env.DEV || didRunLegacyVariantSanityCheck) return;
  didRunLegacyVariantSanityCheck = true;

  const base = {
    id: 'mazda-cx5-2024',
    row_type: 'BASE',
    base_id: 'mazda-cx5-2024',
    variant_code: null,
    status: 'live',
    archived_at: null,
    last_import_id: null,
    created_at: '',
    updated_at: '',
    make: 'Mazda',
    model: 'CX-5',
    year: 2024,
    body_type: 'SUV',
    price_aud: 39000,
    cover_image_url: null,
    gallery_image_urls: [],
    image_source: null,
    license_note: null,
    specs: {},
  } satisfies AdminVehicle;

  const trimWithBlankKind = {
    ...base,
    id: 'mazda-cx5-2024-g20',
    row_type: 'VARIANT',
    variant_code: 'g20',
    specs: { admin_variant_kind: null },
    price_aud: 42000,
  } satisfies AdminVehicle;

  const trimWithMissingKind = {
    ...base,
    id: 'mazda-cx5-2024-g25',
    row_type: 'VARIANT',
    variant_code: 'g25',
    specs: {},
    price_aud: 45000,
  } satisfies AdminVehicle;

  const pack = {
    ...base,
    id: 'mazda-cx5-2024-vision-pack',
    row_type: 'VARIANT',
    variant_code: 'vision-pack',
    specs: { admin_variant_kind: 'pack', pack_name: 'Vision Pack' },
    price_aud: 43500,
  } satisfies AdminVehicle;

  const variants = [trimWithBlankKind, trimWithMissingKind, pack];
  const packVariants = variants.filter(isPackVariant);
  const engineVariants = variants.filter((v) => !isPackVariant(v));
  if (engineVariants.length !== 2 || packVariants.length !== 1) {
    console.warn('[liveVehicles] Legacy variant-kind sanity check failed', {
      expectedEngineVariants: 2,
      actualEngineVariants: engineVariants.length,
      expectedPackVariants: 1,
      actualPackVariants: packVariants.length,
    });
  }
}

export async function fetchLiveVehicles(): Promise<StructuredVehicle[]> {
  runLegacyVariantSanityCheck();

  const [baseResp, variantResp] = await Promise.all([
    supabase
      .from('admin_vehicles')
      .select(LIVE_VEHICLE_SELECT_COLUMNS)
      .eq('row_type', 'BASE')
      .eq('status', 'live'),
    supabase
      .from('admin_vehicles')
      .select(LIVE_VEHICLE_SELECT_COLUMNS)
      .eq('row_type', 'VARIANT')
      .eq('status', 'live'),
  ]);

  if (baseResp.error) throw baseResp.error;
  if (variantResp.error) throw variantResp.error;

  const baseRows = (baseResp.data ?? []).map((row) => rowToVehicle(row as unknown as RawVehicleRow));
  const variantRows = (variantResp.data ?? []).map((row) => rowToVehicle(row as unknown as RawVehicleRow));

  const variantsByBaseId = new Map<string, AdminVehicle[]>();
  for (const row of variantRows) {
    const current = variantsByBaseId.get(row.base_id) ?? [];
    current.push(row);
    variantsByBaseId.set(row.base_id, current);
  }

  const vehicles: StructuredVehicle[] = [];

  for (const base of baseRows) {
    const variants = variantsByBaseId.get(base.id) ?? [];
    const packVariants: AdminVehicle[] = [];
    const engineVariants: AdminVehicle[] = [];
    for (const variant of variants) {
      if (isPackVariant(variant)) packVariants.push(variant);
      else engineVariants.push(variant);
    }
    const defaultEngineVariant = chooseDefaultEngineVariant(base, engineVariants);

    runDevInvariantChecks(base, variants, packVariants, defaultEngineVariant);

    if (import.meta.env.DEV && base.id === 'tesla-modely-2026') {
      console.log('[liveVehicles] base diagnostic', {
        baseId: base.id,
        basePriceAud: base.price_aud,
        engineVariants: engineVariants.map((v) => ({ id: v.id, price_aud: v.price_aud })),
        packVariants: packVariants.map((v) => ({ id: v.id, pack_name: v.specs['pack_name'] ?? null })),
        chosenDefaultVariant: defaultEngineVariant
          ? { id: defaultEngineVariant.id, price_aud: defaultEngineVariant.price_aud }
          : null,
      });
    }

    const resolved = resolveAdminVehicle(base, defaultEngineVariant);
    const structuredVehicle = adminVehicleToStructuredVehicle(resolved, packVariants);

    if (engineVariants.length > 0) {
      const trims = [structuredVehicle.trims[0]];
      for (const variant of engineVariants) {
        const resolvedVariant = resolveAdminVehicle(base, variant);
        const variantStructured = adminVehicleToStructuredVehicle(resolvedVariant, packVariants);
        trims.push({
          ...variantStructured.trims[0],
          id: variant.id,
          name: variant.variant_code || variant.id,
        });
      }
      structuredVehicle.trims = trims;
    }

    if (import.meta.env.DEV && base.id === 'tesla-modely-2026') {
      console.log('[liveVehicles] structured pack diagnostic', {
        baseId: base.id,
        trimCount: structuredVehicle.trims.length,
        trimIds: structuredVehicle.trims.map((t) => t.id),
        optionPackCount: structuredVehicle.trims[0]?.packs.length ?? 0,
        optionPackNames: (structuredVehicle.trims[0]?.packs ?? []).map((p) => p.name),
      });
    }

    vehicles.push(structuredVehicle);
  }

  return vehicles.sort((a, b) => {
    const make = a.make.localeCompare(b.make);
    if (make !== 0) return make;
    const model = a.model.localeCompare(b.model);
    if (model !== 0) return model;
    return a.year - b.year;
  });
}

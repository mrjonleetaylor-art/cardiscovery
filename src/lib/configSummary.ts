import { StructuredVehicle } from '../types/specs';
import { VehicleConfigSelection } from '../types/config';

const MAX_TOKENS = 3;

/**
 * Builds a concise configuration summary string for display in Garage cards.
 * Returns an empty string if no meaningful tokens exist.
 * Format: "Token1 · Token2 · Token3 +N more"
 */
export function buildConfigSummary(
  vehicle: StructuredVehicle,
  selection: VehicleConfigSelection,
): string {
  const tokens: string[] = [];

  if (selection.variantId) {
    const variant = vehicle.variants?.find(v => v.id === selection.variantId);
    if (variant) tokens.push(variant.name);
  }

  if (selection.subvariantId) {
    const sub = vehicle.subvariants?.find(s => s.id === selection.subvariantId);
    if (sub) tokens.push(sub.name);
  }

  // Only include trim name if it's not the default (first) trim
  const defaultTrimId = vehicle.trims[0]?.id;
  if (selection.trimId && selection.trimId !== defaultTrimId) {
    const trim = vehicle.trims.find(t => t.id === selection.trimId);
    if (trim) tokens.push(trim.name);
  }

  // Pack names in selection order
  if (selection.packIds?.length) {
    const selectedTrim =
      vehicle.trims.find(t => t.id === selection.trimId) ?? vehicle.trims[0];
    for (const packId of selection.packIds) {
      const pack = selectedTrim?.packs.find(p => p.id === packId);
      if (pack) tokens.push(pack.name);
    }
  }

  if (tokens.length === 0) return '';
  if (tokens.length <= MAX_TOKENS) return tokens.join(' · ');
  return tokens.slice(0, MAX_TOKENS).join(' · ') + ` +${tokens.length - MAX_TOKENS} more`;
}

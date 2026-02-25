import { VehicleConfigSelection } from '../types/config';

/**
 * Serializes a VehicleConfigSelection to a flat record of CSV field name → value.
 *
 * Field names:
 *   variant_id          — string or empty
 *   subvariant_id       — string or empty
 *   trim_id             — string or empty
 *   pack_ids            — semicolon-separated list or empty
 *   group_{groupId}     — semicolon-separated option IDs or empty (one field per group)
 */
export function serializeSelectionToCsvFields(
  selection: VehicleConfigSelection,
): Record<string, string> {
  const fields: Record<string, string> = {
    variant_id: selection.variantId ?? '',
    subvariant_id: selection.subvariantId ?? '',
    trim_id: selection.trimId ?? '',
    pack_ids: (selection.packIds ?? []).join(';'),
  };

  for (const [groupId, optionIds] of Object.entries(selection.selectedOptionsByGroup ?? {})) {
    fields[`group_${groupId}`] = optionIds.join(';');
  }

  return fields;
}

/**
 * Parses a flat CSV field record back into a VehicleConfigSelection.
 * Unknown keys are ignored; missing keys fall back to empty/null.
 */
export function parseSelectionFromCsvFields(
  fields: Record<string, string>,
): VehicleConfigSelection {
  const selectedOptionsByGroup: Record<string, string[]> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (key.startsWith('group_') && value) {
      const groupId = key.slice(6);
      selectedOptionsByGroup[groupId] = value.split(';').filter(Boolean);
    }
  }

  return {
    variantId: fields.variant_id || null,
    subvariantId: fields.subvariant_id || null,
    trimId: fields.trim_id || null,
    packIds: fields.pack_ids ? fields.pack_ids.split(';').filter(Boolean) : [],
    selectedOptionsByGroup,
  };
}

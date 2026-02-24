import { STORAGE_KEYS } from './storageKeys';
import { VehicleConfigSelection } from '../types/config';

export interface GarageItem {
  vehicleId: string;
  selection: VehicleConfigSelection;
  updatedAt: number;
}

function emptySelection(): VehicleConfigSelection {
  return { variantId: null, subvariantId: null, trimId: null, packIds: [] };
}

function normalizeSelection(sel: VehicleConfigSelection): VehicleConfigSelection {
  return {
    variantId: sel.variantId ?? null,
    subvariantId: sel.subvariantId ?? null,
    trimId: sel.trimId ?? null,
    packIds: [...(sel.packIds ?? [])].sort(),
  };
}

function selectionsEqual(a: VehicleConfigSelection, b: VehicleConfigSelection): boolean {
  const na = normalizeSelection(a);
  const nb = normalizeSelection(b);
  return (
    na.variantId === nb.variantId &&
    na.subvariantId === nb.subvariantId &&
    na.trimId === nb.trimId &&
    JSON.stringify(na.packIds) === JSON.stringify(nb.packIds)
  );
}

export const getSessionId = (): string => {
  let sessionId = localStorage.getItem(STORAGE_KEYS.sessionId);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(STORAGE_KEYS.sessionId, sessionId);
  }
  return sessionId;
};

export const getGarageItems = (): GarageItem[] => {
  const raw = localStorage.getItem(STORAGE_KEYS.garageItems);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  // Migrate old format: string[] → GarageItem[]
  if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
    const migrated: GarageItem[] = (parsed as string[]).map(id => ({
      vehicleId: id,
      selection: emptySelection(),
      updatedAt: Date.now(),
    }));
    localStorage.setItem(STORAGE_KEYS.garageItems, JSON.stringify(migrated));
    return migrated;
  }
  return parsed as GarageItem[];
};

export const getGarageItem = (vehicleId: string): GarageItem | null => {
  return getGarageItems().find(item => item.vehicleId === vehicleId) ?? null;
};

export const upsertGarageItem = (vehicleId: string, selection: VehicleConfigSelection): void => {
  const items = getGarageItems().filter(item => item.vehicleId !== vehicleId);
  items.push({ vehicleId, selection, updatedAt: Date.now() });
  localStorage.setItem(STORAGE_KEYS.garageItems, JSON.stringify(items));
};

export const removeGarageItem = (vehicleId: string): void => {
  const items = getGarageItems().filter(item => item.vehicleId !== vehicleId);
  localStorage.setItem(STORAGE_KEYS.garageItems, JSON.stringify(items));
};

export const isInGarage = (vehicleId: string): boolean => {
  return getGarageItems().some(item => item.vehicleId === vehicleId);
};

export const doesSavedSelectionMatch = (
  vehicleId: string,
  selection: VehicleConfigSelection,
): boolean => {
  const item = getGarageItem(vehicleId);
  if (!item) return false;
  return selectionsEqual(item.selection, selection);
};

// Legacy aliases — kept for any remaining callers
export const addToGarage = (vehicleId: string): void => upsertGarageItem(vehicleId, emptySelection());
export const removeFromGarage = removeGarageItem;

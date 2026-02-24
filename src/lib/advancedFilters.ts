import { StructuredVehicle } from '../types/specs';

export interface AdvancedFilters {
  // Performance
  powerMin: number | null;         // kW
  powerMax: number | null;         // kW
  zeroToHundredMax: number | null; // seconds
  powerToWeightMin: number | null; // kW/t
  powerToWeightMax: number | null; // kW/t
  drivetrains: string[];           // FWD, RWD, AWD
  transmissions: string[];         // Automatic, Manual, CVT, Dual-clutch

  // Efficiency
  fuelEconomyMax: number | null;      // L/100km
  annualRunningCostMax: number | null; // AUD

  // Ownership
  warrantyMin: number | null; // years

  // Tech
  requireAppleCarPlay: boolean;
  requireAndroidAuto: boolean;
  requireWirelessCharging: boolean;
  requireOtaUpdates: boolean;
}

export const defaultAdvancedFilters: AdvancedFilters = {
  powerMin: null,
  powerMax: null,
  zeroToHundredMax: null,
  powerToWeightMin: null,
  powerToWeightMax: null,
  drivetrains: [],
  transmissions: [],
  fuelEconomyMax: null,
  annualRunningCostMax: null,
  warrantyMin: null,
  requireAppleCarPlay: false,
  requireAndroidAuto: false,
  requireWirelessCharging: false,
  requireOtaUpdates: false,
};

/** Extracts the first number found in a spec string, e.g. "150 kW" → 150, "$2,500" → 2500 */
function parseNumber(s: string | undefined): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[$,]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

/** Returns true if the spec string indicates the feature is present */
function isPositive(s: string | undefined): boolean {
  if (!s) return false;
  const lower = s.toLowerCase();
  return lower.includes('yes') || lower.includes('wireless') || lower.includes('standard');
}

export function countActiveAdvancedFilters(f: AdvancedFilters): number {
  let count = 0;
  if (f.powerMin !== null) count++;
  if (f.powerMax !== null) count++;
  if (f.zeroToHundredMax !== null) count++;
  if (f.powerToWeightMin !== null) count++;
  if (f.powerToWeightMax !== null) count++;
  if (f.drivetrains.length > 0) count++;
  if (f.transmissions.length > 0) count++;
  if (f.fuelEconomyMax !== null) count++;
  if (f.annualRunningCostMax !== null) count++;
  if (f.warrantyMin !== null) count++;
  if (f.requireAppleCarPlay) count++;
  if (f.requireAndroidAuto) count++;
  if (f.requireWirelessCharging) count++;
  if (f.requireOtaUpdates) count++;
  return count;
}

/**
 * Returns false if the vehicle fails any active advanced filter.
 * Uses the first trim as the canonical spec source.
 * If a filter is active and the vehicle is missing the required field → exclude.
 */
export function matchesAdvancedFilters(vehicle: StructuredVehicle, f: AdvancedFilters): boolean {
  const trim = vehicle.trims[0];
  if (!trim) return true;

  const perf = trim.specs.performance;
  const eff = trim.specs.efficiency;
  const overview = trim.specs.overview;
  const conn = trim.specs.connectivity;

  // --- Performance ---
  if (f.powerMin !== null) {
    const v = parseNumber(perf.power);
    if (v === null || v < f.powerMin) return false;
  }
  if (f.powerMax !== null) {
    const v = parseNumber(perf.power);
    if (v === null || v > f.powerMax) return false;
  }
  if (f.zeroToHundredMax !== null) {
    const v = parseNumber(perf.zeroToHundred);
    if (v === null || v > f.zeroToHundredMax) return false;
  }
  if (f.powerToWeightMin !== null) {
    const v = parseNumber(perf.powerToWeight);
    if (v === null || v < f.powerToWeightMin) return false;
  }
  if (f.powerToWeightMax !== null) {
    const v = parseNumber(perf.powerToWeight);
    if (v === null || v > f.powerToWeightMax) return false;
  }
  if (f.drivetrains.length > 0) {
    if (!overview.drivetrain) return false;
    if (!f.drivetrains.some(d => overview.drivetrain!.toUpperCase().includes(d.toUpperCase()))) return false;
  }
  if (f.transmissions.length > 0) {
    if (!overview.transmission) return false;
    if (!f.transmissions.some(t => overview.transmission!.toLowerCase().includes(t.toLowerCase()))) return false;
  }

  // --- Efficiency ---
  if (f.fuelEconomyMax !== null) {
    const v = parseNumber(eff.fuelEconomy);
    if (v === null || v > f.fuelEconomyMax) return false;
  }
  if (f.annualRunningCostMax !== null) {
    const v = parseNumber(eff.annualRunningCost);
    if (v === null || v > f.annualRunningCostMax) return false;
  }

  // --- Ownership ---
  if (f.warrantyMin !== null) {
    const v = parseNumber(overview.warranty);
    if (v === null || v < f.warrantyMin) return false;
  }

  // --- Tech ---
  if (f.requireAppleCarPlay && !isPositive(conn.appleCarPlay)) return false;
  if (f.requireAndroidAuto && !isPositive(conn.androidAuto)) return false;
  if (f.requireWirelessCharging && !isPositive(conn.wirelessCharging)) return false;
  if (f.requireOtaUpdates && !isPositive(conn.otaUpdates)) return false;

  return true;
}

import { StructuredSpecs, Trim, Pack, ResolvedSpecs, SpecAdjustment } from '../types/specs';
import { Vehicle } from '../types';

export function convertLegacyToStructured(vehicle: Vehicle): StructuredSpecs {
  return {
    overview: {
      bodyType: vehicle.body_type,
      fuelType: vehicle.fuel_type,
      drivetrain: vehicle.specs?.performance?.drivetrain,
      transmission: vehicle.transmission,
      seating: vehicle.specs?.comfort?.seating_capacity,
      warranty: vehicle.specs?.ownership?.warranty,
    },
    efficiency: {
      fuelEconomy: vehicle.specs?.ownership?.fuel_economy,
      realWorldEstimate: undefined,
      fuelTank: undefined,
      estimatedRange: undefined,
      serviceInterval: vehicle.specs?.ownership?.service_interval,
      annualRunningCost: undefined,
      ownershipSummary: vehicle.body_type === 'SUV'
        ? 'Moderate running costs with practical daily usability'
        : vehicle.fuel_type === 'Electric'
        ? 'Low running costs with minimal servicing requirements'
        : 'Affordable daily operation with standard servicing needs',
    },
    performance: {
      power: vehicle.specs?.performance?.power,
      torque: vehicle.specs?.performance?.torque,
      zeroToHundred: vehicle.specs?.performance?.acceleration,
      topSpeed: vehicle.specs?.performance?.top_speed,
      weight: vehicle.specs?.dimensions?.weight,
      powerToWeight: undefined,
      suspension: 'Independent front and rear',
      engine: vehicle.engine,
      drivingCharacter: vehicle.tags?.includes('Performance') || vehicle.tags?.includes('Sport')
        ? 'Responsive handling with engaging dynamics. Best suited for enthusiast drivers who value driver involvement.'
        : 'Comfortable and composed driving experience with a focus on refinement and ease of use.',
    },
    connectivity: {
      screenSize: vehicle.specs?.tech?.infotainment,
      digitalCluster: 'Available',
      appleCarPlay: 'Yes',
      androidAuto: 'Yes',
      wirelessCharging: 'Available',
      soundSystem: 'Premium Audio',
      appSupport: 'Yes',
      otaUpdates: undefined,
      techSummary: 'Modern connectivity suite with intuitive interfaces. Well-integrated without overwhelming complexity.',
    },
    safety: {
      ancapRating: vehicle.specs?.safety?.safety_rating,
      adaptiveCruise: 'Available',
      blindSpotMonitoring: 'Available',
      laneKeepAssist: 'Standard',
      aeb: 'Standard',
      airbags: vehicle.specs?.safety?.airbags,
      rearCrossTraffic: 'Available',
      safetySummary: 'Comprehensive safety package with strong crash test ratings and modern active safety features.',
    },
  };
}

export function resolveSpecs(
  baseSpecs: StructuredSpecs,
  selectedPacks: Pack[]
): StructuredSpecs {
  const resolved = JSON.parse(JSON.stringify(baseSpecs)) as StructuredSpecs;

  selectedPacks.forEach((pack) => {
    if (pack.specAdjustments) {
      pack.specAdjustments.forEach((adjustment: SpecAdjustment) => {
        const category = resolved[adjustment.category];
        if (category) {
          (category as any)[adjustment.field] = adjustment.value;
        }
      });
    }
  });

  return resolved;
}

export function resolveVehicleSpecs(
  vehicle: Vehicle,
  trimId: string | null,
  selectedPackIds: string[]
): ResolvedSpecs {
  const baseSpecs = convertLegacyToStructured(vehicle);

  let basePrice = vehicle.base_price || vehicle.price || 0;
  let totalPrice = basePrice;

  const trimOptions = vehicle.trim_options || [];
  const selectedTrimOption = trimId
    ? trimOptions.find(t => t.name === trimId) || trimOptions[0]
    : trimOptions[0];

  if (selectedTrimOption) {
    totalPrice += selectedTrimOption.price_adjustment;
  }

  const packOptions = vehicle.pack_options || [];
  const selectedPacks: Pack[] = selectedPackIds
    .map(packId => {
      const pack = packOptions.find(p => p.name === packId);
      if (pack) {
        return {
          id: pack.name,
          name: pack.name,
          category: pack.category,
          priceDelta: pack.price_adjustment,
          features: pack.options?.map(o => o.name) || [],
        };
      }
      return null;
    })
    .filter(Boolean) as Pack[];

  selectedPacks.forEach(pack => {
    totalPrice += pack.priceDelta;
  });

  const resolvedSpecsData = resolveSpecs(baseSpecs, selectedPacks);

  const trimData: Trim = {
    id: selectedTrimOption?.name || 'base',
    name: selectedTrimOption?.name || 'Base',
    basePrice: basePrice,
    specs: baseSpecs,
    packs: selectedPacks,
  };

  return {
    specs: resolvedSpecsData,
    totalPrice,
    selectedTrim: trimData,
    selectedPacks,
  };
}

export function compareNumericValues(valueA: string | number | undefined, valueB: string | number | undefined): 'A' | 'B' | 'equal' | 'incomparable' {
  if (!valueA || !valueB) return 'incomparable';
  if (valueA === valueB) return 'equal';

  const numA = parseFloat(String(valueA).replace(/[^\d.-]/g, ''));
  const numB = parseFloat(String(valueB).replace(/[^\d.-]/g, ''));

  if (isNaN(numA) || isNaN(numB)) return 'incomparable';

  return numA > numB ? 'A' : 'B';
}

export function shouldHighlightForPriority(
  field: string,
  priority?: string
): boolean {
  if (!priority) return false;

  const priorityMap: Record<string, string[]> = {
    performance: ['power', 'torque', 'zeroToHundred', 'powerToWeight'],
    efficiency: ['fuelEconomy', 'realWorldEstimate', 'annualRunningCost'],
    safety: ['ancapRating', 'airbags', 'aeb', 'adaptiveCruise'],
    technology: ['screenSize', 'digitalCluster', 'appleCarPlay', 'otaUpdates'],
  };

  const relevantFields = priorityMap[priority.toLowerCase()] || [];
  return relevantFields.includes(field);
}

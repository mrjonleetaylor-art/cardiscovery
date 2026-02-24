import { StructuredVehicle } from '../../../types/specs';

export function getDisplayProps(v: StructuredVehicle) {
  const t = v.trims[0];
  return {
    bodyType: t?.specs.overview.bodyType ?? '',
    fuelType: t?.specs.overview.fuelType ?? '',
    basePrice: t?.basePrice ?? 0,
    imageUrl: v.images[0] ?? '',
  };
}

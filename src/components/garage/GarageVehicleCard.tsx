import { StructuredVehicle } from '../../types/specs';
import { GarageItem } from '../../lib/session';
import { resolveConfiguredVehicle } from '../../lib/resolveConfiguredVehicle';
import { buildConfigSummary } from '../../lib/configSummary';

export function GarageVehicleCard({
  vehicle,
  garageItem,
  onOpen,
}: {
  vehicle: StructuredVehicle;
  garageItem: GarageItem | null;
  onOpen: (triggerEl: HTMLButtonElement) => void;
}) {
  const itemSelection = garageItem?.selection ?? {
    variantId: null,
    subvariantId: null,
    trimId: vehicle.trims[0]?.id ?? null,
    packIds: [],
    selectedOptionsByGroup: {},
  };
  const resolved = resolveConfiguredVehicle(vehicle, itemSelection);
  const heroUrl =
    resolved.heroImageUrl ??
    resolved.resolvedImages[0] ??
    vehicle.images[0] ??
    null;
  const configSummary = buildConfigSummary(vehicle, itemSelection);

  return (
    <button
      type="button"
      onClick={(e) => onOpen(e.currentTarget)}
      className="text-left bg-white rounded-lg border border-slate-200 overflow-hidden transition-all hover:border-slate-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
    >
      <div className="aspect-[16/9] bg-slate-100 relative overflow-hidden">
        {heroUrl ? (
          <img
            src={heroUrl}
            alt={`${vehicle.make} ${vehicle.model}`}
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            No Image
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="text-xl font-bold text-slate-900 mb-1">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h3>
        {configSummary && (
          <p className="text-xs text-slate-500 mb-2 truncate">{configSummary}</p>
        )}
        {vehicle.aiSummary && (
          <p className="text-sm text-slate-600 mb-3 line-clamp-2">{vehicle.aiSummary}</p>
        )}
        <p className="text-xl font-bold text-slate-900">
          ${resolved.totalPrice.toLocaleString()}
        </p>
      </div>
    </button>
  );
}

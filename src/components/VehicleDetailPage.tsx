import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Minus, Check, X } from 'lucide-react';
import { StructuredVehicle } from '../types/specs';
import { VehicleConfigSelection } from '../types/config';
import { resolveConfiguredVehicle, ResolvedVehicle } from '../lib/resolveConfiguredVehicle';
import { upsertGarageItem, removeGarageItem, isInGarage, doesSavedSelectionMatch } from '../lib/session';
import { VehicleProfileContent } from './profile/VehicleProfileContent';
import { FindDealerButton } from './leads/FindDealerButton';
import { resolvePrice } from '../lib/statePrice';

function sanitizeProfileSelection(vehicle: StructuredVehicle, sel: VehicleConfigSelection): VehicleConfigSelection {
  const trim = vehicle.trims.find(t => t.id === sel.trimId) ?? vehicle.trims[0];
  const validPackIds = new Set(vehicle.trims.flatMap((t) => t.packs.map((p) => p.id)));
  return {
    ...sel,
    trimId: trim?.id ?? null,
    packIds: (sel.packIds ?? []).filter(id => validPackIds.has(id)),
  };
}

interface VehicleDetailPageProps {
  vehicleId: string;
  vehicles: StructuredVehicle[];
  onBack: () => void;
  selectedState: string;
}

export default function VehicleDetailPage({ vehicleId, vehicles, onBack, selectedState }: VehicleDetailPageProps) {
  const [vehicle, setVehicle] = useState<StructuredVehicle | null>(null);
  const [inGarage, setInGarage] = useState(false);
  const [selection, setSelection] = useState<VehicleConfigSelection>({
    variantId: null,
    subvariantId: null,
    trimId: null,
    packIds: [],
    selectedOptionsByGroup: {},
  });
  useEffect(() => {
    const found = vehicles.find(v => v.id === vehicleId) ?? null;
    setVehicle(found);
    if (found) {
      setSelection({
        variantId: null,
        subvariantId: null,
        trimId: found.trims[0]?.id ?? null,
        packIds: [],
        selectedOptionsByGroup: {},
      });
    }
  }, [vehicleId, vehicles]);

  const resolvedData: ResolvedVehicle | null = useMemo(() => {
    if (!vehicle) return null;
    return resolveConfiguredVehicle(vehicle, sanitizeProfileSelection(vehicle, selection));
  }, [vehicle, selection]);

  useEffect(() => {
    const refresh = () => setInGarage(isInGarage(vehicleId));
    refresh();
    window.addEventListener('garage-updated', refresh);
    return () => window.removeEventListener('garage-updated', refresh);
  }, [vehicleId]);

  const selectionMatchesSaved = inGarage && doesSavedSelectionMatch(vehicleId, selection);

  const hasValue = (v: string | null | undefined): v is string =>
    v != null && v.trim() !== '' && v.toLowerCase() !== 'n/a';

  const handleGarageAction = () => {
    if (inGarage && selectionMatchesSaved) {
      removeGarageItem(vehicleId);
    } else {
      upsertGarageItem(vehicleId, selection);
    }
    setInGarage(isInGarage(vehicleId));
    window.dispatchEvent(new Event('garage-updated'));
  };

  const handleAddToCompare = () => {
    window.dispatchEvent(new CustomEvent('navigate-compare', { detail: { vehicleId } }));
  };

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-lg text-slate-600">Vehicle not found</p>
          <button onClick={onBack} className="mt-4 text-slate-900 font-medium hover:underline">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const fuelType = resolvedData?.specs.overview.fuelType ?? '';
  const isEV = fuelType.toLowerCase().includes('electric') ||
    /kwh|battery/i.test(resolvedData?.specs.efficiency.fuelTank ?? '') ||
    (vehicle.tags ?? []).some(t => /ev|electric/i.test(t));

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <VehicleProfileContent
              vehicle={vehicle}
              allVehicles={vehicles}
              selection={selection}
              resolvedData={resolvedData}
              onSelectionChange={(patch) => setSelection((prev) => ({ ...prev, ...patch }))}
              mode="page"
              showTrimOptions={true}
            />
          </div>

          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h1 className="text-2xl font-bold text-slate-900 mb-1">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h1>
                {resolvedData && (
                  <p className="text-slate-600 mb-4">{resolvedData.selectedTrim.name}</p>
                )}

                <div className="mb-6">
                  <div className="text-sm text-slate-600 mb-1">Price</div>
                  <div className="text-3xl font-bold text-slate-900">
                    {resolvedData ? `$${(resolvePrice(vehicle, selectedState) ?? resolvedData.totalPrice).toLocaleString()}` : '—'}
                  </div>
                </div>

                {vehicle.tags && vehicle.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {vehicle.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={handleGarageAction}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${
                      inGarage
                        ? 'bg-slate-900 text-white hover:bg-slate-800'
                        : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    {inGarage && selectionMatchesSaved ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {!inGarage ? 'Save' : selectionMatchesSaved ? 'Saved' : 'Update Garage'}
                  </button>

                  <button
                    onClick={handleAddToCompare}
                    className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg font-semibold transition-colors"
                  >
                    Compare
                  </button>

                  <FindDealerButton
                    vehicle={vehicle}
                    trim={resolvedData?.selectedTrim.name}
                    price={resolvedData?.totalPrice}
                  />
                </div>

                {resolvedData && (() => {
                  const eff = resolvedData.specs.efficiency;
                  const rows = isEV
                    ? [
                        hasValue(eff.estimatedRange) && { label: 'Range', value: eff.estimatedRange },
                        hasValue(eff.fuelTank) && { label: 'Battery', value: eff.fuelTank },
                        hasValue(eff.fuelEconomy) && { label: 'Fuel economy', value: eff.fuelEconomy },
                        hasValue(eff.realWorldEstimate) && { label: 'Real-world est.', value: eff.realWorldEstimate },
                        hasValue(eff.annualRunningCost) && { label: 'Annual cost', value: eff.annualRunningCost },
                      ]
                    : [
                        hasValue(eff.fuelEconomy) && { label: 'Fuel economy', value: eff.fuelEconomy },
                        hasValue(eff.realWorldEstimate) && { label: 'Real-world est.', value: eff.realWorldEstimate },
                        hasValue(eff.fuelTank) && { label: 'Fuel tank', value: eff.fuelTank },
                        hasValue(eff.estimatedRange) && { label: 'Range', value: eff.estimatedRange },
                        hasValue(eff.annualRunningCost) && { label: 'Annual cost', value: eff.annualRunningCost },
                      ];
                  const visible = rows.filter((r): r is { label: string; value: string } => !!r);
                  if (visible.length === 0) return null;
                  return (
                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-900 mb-3">Efficiency</h4>
                      <div className="space-y-2">
                        {visible.map((row, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">{row.label}</span>
                            <span className="text-sm font-semibold text-slate-900">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {isEV && (vehicle.chargeTimeAC || vehicle.chargeTimeDC) && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Charging</h4>
                    <div className="space-y-2">
                      {vehicle.chargeTimeAC && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">AC (home)</span>
                          <span className="text-sm font-semibold text-slate-900">{vehicle.chargeTimeAC}</span>
                        </div>
                      )}
                      {vehicle.chargeTimeDC && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">DC (fast)</span>
                          <span className="text-sm font-semibold text-slate-900">{vehicle.chargeTimeDC}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(vehicle.dimensionLength || vehicle.dimensionWidth || vehicle.dimensionHeight) && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Dimensions</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">L × W × H</span>
                      <span className="text-sm font-semibold text-slate-900 tabular-nums">
                        {[vehicle.dimensionLength, vehicle.dimensionWidth, vehicle.dimensionHeight]
                          .map(v => v ?? '—')
                          .join(' × ')} mm
                      </span>
                    </div>
                  </div>
                )}

                {vehicle.bestFor && vehicle.bestFor.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Best For</h4>
                    <div className="space-y-2">
                      {vehicle.bestFor.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {vehicle.tradeOffs && vehicle.tradeOffs.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Consider</h4>
                    <div className="space-y-2">
                      {vehicle.tradeOffs.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                          <X className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

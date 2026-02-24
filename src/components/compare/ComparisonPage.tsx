import { useEffect, useState } from 'react';
import { StructuredVehicle } from '../../types/specs';
import { structuredVehicles } from '../../data/structuredVehicles';
import { resolveConfiguredVehicle, ResolvedVehicle } from '../../lib/resolveConfiguredVehicle';
import { upsertGarageItem, removeGarageItem, isInGarage, doesSavedSelectionMatch } from '../../lib/session';
import { Filters } from './types';
import { getDisplayProps } from './utils/display';
import { VehicleConfigSelection } from '../../types/config';
import { AdvancedFilters, defaultAdvancedFilters, matchesAdvancedFilters } from '../../lib/advancedFilters';
import { DiscoveryPanel } from './panels/DiscoveryPanel';
import { CarAExplorePanel } from './panels/CarAExplorePanel';
import { VehicleHeroCard } from './panels/VehicleHeroCard';
import { StickyCompareBanner } from './components/StickyCompareBanner';
import { ComparisonSection } from './sections/ComparisonSection';
import { ComparisonRow } from './sections/ComparisonRow';
import { TABLE_GRID, TABLE_CELL_PAD } from './sections/tableLayout';
import { VehicleConfigurationControls } from '../config/VehicleConfigurationControls';

function createEmptySelection(): VehicleConfigSelection {
  return {
    variantId: null,
    subvariantId: null,
    trimId: null,
    packIds: [],
  };
}

function createSelectionForVehicle(vehicle: StructuredVehicle | null): VehicleConfigSelection {
  if (!vehicle) return createEmptySelection();
  return {
    variantId: null,
    subvariantId: null,
    trimId: vehicle.trims[0]?.id ?? null,
    packIds: [],
  };
}

function sanitizeSelection(vehicle: StructuredVehicle, selection: VehicleConfigSelection): VehicleConfigSelection {
  const trim = vehicle.trims.find((t) => t.id === selection.trimId) ?? vehicle.trims[0];
  const validPackIds = new Set(trim?.packs.map((p) => p.id) ?? []);
  const validVariantIds = new Set(vehicle.variants?.map((v) => v.id) ?? []);
  const validSubvariantIds = new Set(vehicle.subvariants?.map((s) => s.id) ?? []);

  return {
    variantId: selection.variantId && validVariantIds.has(selection.variantId) ? selection.variantId : null,
    subvariantId: selection.subvariantId && validSubvariantIds.has(selection.subvariantId) ? selection.subvariantId : null,
    trimId: trim?.id ?? null,
    packIds: (selection.packIds ?? []).filter((id) => validPackIds.has(id)),
  };
}

export default function ComparisonPage({ prefillVehicleId }: { prefillVehicleId?: string | null }) {
  const [vehicles, setVehicles] = useState<[StructuredVehicle | null, StructuredVehicle | null]>([null, null]);
  const [selection, setSelection] = useState<[VehicleConfigSelection, VehicleConfigSelection]>([
    createEmptySelection(),
    createEmptySelection(),
  ]);
  const [resolvedSpecs, setResolvedSpecsState] = useState<[ResolvedVehicle | null, ResolvedVehicle | null]>([null, null]);
  const [inGarage, setInGarage] = useState<[boolean, boolean]>([false, false]);
  const [heroIndexA, setHeroIndexA] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [filtersA, setFiltersA] = useState<Filters>({ search: '', make: '', model: '', bodyType: '', fuelType: '' });
  const [filtersB, setFiltersB] = useState<Filters>({ search: '', make: '', model: '', bodyType: '', fuelType: '' });
  const [advancedFiltersA, setAdvancedFiltersA] = useState<AdvancedFilters>(defaultAdvancedFilters);
  const [advancedFiltersB, setAdvancedFiltersB] = useState<AdvancedFilters>(defaultAdvancedFilters);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    trim: true,
    efficiency: true,
    performance: true,
    connectivity: true,
    safety: true,
  });

  // Resolve specs for Car A
  useEffect(() => {
    if (vehicles[0]) {
      const specs = resolveConfiguredVehicle(vehicles[0], selection[0]);
      setResolvedSpecsState(prev => [specs, prev[1]]);
      setInGarage(prev => [isInGarage(vehicles[0]!.id), prev[1]]);
    } else {
      setResolvedSpecsState(prev => [null, prev[1]]);
    }
  }, [vehicles, selection]);

  // Reset hero image index when Car A changes
  useEffect(() => { setHeroIndexA(0); }, [vehicles[0]]);

  // Prefill Car A when a vehicleId is provided via props (e.g. from Vehicle Detail page)
  useEffect(() => {
    if (!prefillVehicleId) return;
    const vehicle = structuredVehicles.find(v => v.id === prefillVehicleId) ?? null;
    if (vehicle) selectCarA(vehicle);
  }, [prefillVehicleId]);

  // Resolve specs for Car B
  useEffect(() => {
    if (vehicles[1]) {
      const specs = resolveConfiguredVehicle(vehicles[1], selection[1]);
      setResolvedSpecsState(prev => [prev[0], specs]);
      setInGarage(prev => [prev[0], isInGarage(vehicles[1]!.id)]);
    } else {
      setResolvedSpecsState(prev => [prev[0], null]);
    }
  }, [vehicles, selection]);

  const makes = Array.from(new Set(structuredVehicles.map(v => v.make))).sort();

  const modelsA = Array.from(new Set(
    structuredVehicles.filter(v => !filtersA.make || v.make === filtersA.make).map(v => v.model)
  )).sort();
  const bodyTypesA = Array.from(new Set(structuredVehicles.map(v => getDisplayProps(v).bodyType).filter(Boolean))).sort();
  const fuelTypesA = Array.from(new Set(structuredVehicles.map(v => getDisplayProps(v).fuelType).filter(Boolean))).sort();

  const modelsB = Array.from(new Set(
    structuredVehicles.filter(v => !filtersB.make || v.make === filtersB.make).map(v => v.model)
  )).sort();
  const bodyTypesB = Array.from(new Set(structuredVehicles.map(v => getDisplayProps(v).bodyType).filter(Boolean))).sort();
  const fuelTypesB = Array.from(new Set(structuredVehicles.map(v => getDisplayProps(v).fuelType).filter(Boolean))).sort();

  const selectionMatchesSaved: [boolean, boolean] = [
    inGarage[0] && !!vehicles[0] && doesSavedSelectionMatch(vehicles[0].id, selection[0]),
    inGarage[1] && !!vehicles[1] && doesSavedSelectionMatch(vehicles[1].id, selection[1]),
  ];

  const toggleGarage = (index: 0 | 1) => {
    const vehicle = vehicles[index];
    if (!vehicle) return;
    if (inGarage[index] && selectionMatchesSaved[index]) {
      removeGarageItem(vehicle.id);
      setInGarage(prev => {
        const updated = [...prev] as [boolean, boolean];
        updated[index] = false;
        return updated;
      });
    } else {
      upsertGarageItem(vehicle.id, selection[index]);
      setInGarage(prev => {
        const updated = [...prev] as [boolean, boolean];
        updated[index] = true;
        return updated;
      });
    }
    window.dispatchEvent(new Event('garage-updated'));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateSelection = (index: 0 | 1, patch: Partial<VehicleConfigSelection>) => {
    setSelection(prev => {
      const next = [...prev] as [VehicleConfigSelection, VehicleConfigSelection];
      const vehicle = vehicles[index];
      const patched: VehicleConfigSelection = {
        ...next[index],
        ...patch,
      };
      next[index] = vehicle ? sanitizeSelection(vehicle, patched) : patched;
      return next;
    });
  };

  const selectCarA = (vehicle: StructuredVehicle | null) => {
    if (vehicle === null) {
      setVehicles([null, null]);
      setSelection([createEmptySelection(), createEmptySelection()]);
    } else {
      setVehicles([vehicle, null]);
      setSelection([createSelectionForVehicle(vehicle), createEmptySelection()]);
    }
  };

  const selectCarB = (vehicle: StructuredVehicle | null) => {
    if (vehicle === null) {
      setVehicles(prev => [prev[0], null]);
      setSelection(prev => [prev[0], createEmptySelection()]);
    } else {
      setVehicles(prev => [prev[0], vehicle]);
      setSelection(prev => [prev[0], createSelectionForVehicle(vehicle)]);
    }
  };

  const filteredVehiclesA = structuredVehicles.filter(v => {
    const dp = getDisplayProps(v);
    if (filtersA.search) {
      const s = filtersA.search.toLowerCase();
      if (!v.make.toLowerCase().includes(s) && !v.model.toLowerCase().includes(s) &&
          !dp.bodyType.toLowerCase().includes(s) && !dp.fuelType.toLowerCase().includes(s)) return false;
    }
    if (filtersA.make && v.make !== filtersA.make) return false;
    if (filtersA.model && v.model !== filtersA.model) return false;
    if (filtersA.bodyType && dp.bodyType !== filtersA.bodyType) return false;
    if (filtersA.fuelType && dp.fuelType !== filtersA.fuelType) return false;
    if (!matchesAdvancedFilters(v, advancedFiltersA)) return false;
    return true;
  });

  const filteredVehiclesB = structuredVehicles.filter(v => {
    if (v.id === vehicles[0]?.id) return false;
    const dp = getDisplayProps(v);
    if (filtersB.search) {
      const s = filtersB.search.toLowerCase();
      if (!v.make.toLowerCase().includes(s) && !v.model.toLowerCase().includes(s) &&
          !dp.bodyType.toLowerCase().includes(s) && !dp.fuelType.toLowerCase().includes(s)) return false;
    }
    if (filtersB.make && v.make !== filtersB.make) return false;
    if (filtersB.model && v.model !== filtersB.model) return false;
    if (filtersB.bodyType && dp.bodyType !== filtersB.bodyType) return false;
    if (filtersB.fuelType && dp.fuelType !== filtersB.fuelType) return false;
    if (!matchesAdvancedFilters(v, advancedFiltersB)) return false;
    return true;
  });

  const v1 = vehicles[0];
  const v2 = vehicles[1];
  const specs1 = resolvedSpecs[0];
  const specs2 = resolvedSpecs[1];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-20 pb-12 px-4">
      <div className="max-w-[1800px] mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Vehicle Comparison</h1>

        {/* 2-column grid — always rendered, content varies by state */}
        <div className="mb-8">
          {/* State 3: use TABLE_GRID so hero cards align with the comparison table below.
              States 1/2: use a plain 2-col gap grid for the full-width discovery/explore panels. */}
          <div className={v1 && v2 ? `grid ${TABLE_GRID}` : 'grid lg:grid-cols-2 gap-6'}>
            {/* Spacer column — only present in State 3 to match the 240px label column in the table */}
            {v1 && v2 && <div className="bg-transparent" />}
            {/* Left column */}
            {!v1 ? (
              <DiscoveryPanel
                title="Car A"
                filters={filtersA}
                setFilters={setFiltersA}
                advancedFilters={advancedFiltersA}
                setAdvancedFilters={setAdvancedFiltersA}
                filteredVehicles={filteredVehiclesA}
                makes={makes}
                models={modelsA}
                bodyTypes={bodyTypesA}
                fuelTypes={fuelTypesA}
                onSelectVehicle={selectCarA}
                disabled={false}
              />
            ) : !v2 ? (
              <CarAExplorePanel
                vehicle={v1}
                specs={specs1}
                selection={selection[0]}
                onSelectionChange={(patch) => updateSelection(0, patch)}
                heroIndex={heroIndexA}
                setHeroIndex={setHeroIndexA}
                lightboxOpen={lightboxOpen}
                setLightboxOpen={setLightboxOpen}
              />
            ) : (
              <VehicleHeroCard vehicle={v1} heroUrl={specs1?.heroImageUrl} />
            )}
            {/* Right column */}
            {!v2 ? (
              <DiscoveryPanel
                title="Car B"
                filters={filtersB}
                setFilters={setFiltersB}
                advancedFilters={advancedFiltersB}
                setAdvancedFilters={setAdvancedFiltersB}
                filteredVehicles={filteredVehiclesB}
                makes={makes}
                models={modelsB}
                bodyTypes={bodyTypesB}
                fuelTypes={fuelTypesB}
                onSelectVehicle={selectCarB}
                disabled={!v1}
              />
            ) : (
              <VehicleHeroCard vehicle={v2} heroUrl={specs2?.heroImageUrl} />
            )}
          </div>
        </div>

        {/* Sticky banner */}
        {v1 && (
          <StickyCompareBanner
            v1={v1}
            v2={v2}
            specs1={specs1}
            specs2={specs2}
            inGarage={inGarage}
            selectionMatchesSaved={selectionMatchesSaved}
            onToggleGarage={toggleGarage}
            onChangeA={() => selectCarA(null)}
            onRemoveA={() => selectCarA(null)}
            onChangeB={() => selectCarB(null)}
            onRemoveB={() => selectCarB(null)}
            heroUrl1={specs1?.heroImageUrl}
            heroUrl2={specs2?.heroImageUrl}
          />
        )}

        {/* Comparison sections */}
        {v1 && (
          <>
            {/* Trim & Options */}
            <ComparisonSection
              title="Trim & Options"
              expanded={expandedSections.trim}
              onToggle={() => toggleSection('trim')}
            >
              <div className={`grid ${TABLE_GRID} divide-x divide-slate-200`}>
                {/* Empty label column — matches the 240px label column in every other section */}
                <div className={TABLE_CELL_PAD} />
                {/* Car A trims + packs */}
                <div className={TABLE_CELL_PAD}>
                  <VehicleConfigurationControls
                    vehicle={v1}
                    selection={selection[0]}
                    onChange={(patch) => updateSelection(0, patch)}
                    onHeroReset={() => setHeroIndexA(0)}
                    mode="panel"
                    showPacks={true}
                    showDescriptions={false}
                  />
                </div>

                {/* Car B trims + packs (or placeholder) */}
                <div className={TABLE_CELL_PAD}>
                  {!v2 ? (
                    <div className="flex items-center justify-center h-full min-h-[80px]">
                      <p className="text-sm text-slate-400">Add Car B to configure</p>
                    </div>
                  ) : (
                    <VehicleConfigurationControls
                      vehicle={v2}
                      selection={selection[1]}
                      onChange={(patch) => updateSelection(1, patch)}
                      mode="panel"
                      showPacks={true}
                      showDescriptions={false}
                    />
                  )}
                </div>
              </div>
            </ComparisonSection>

            {/* Overview — always visible when Car A selected */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-4">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">Overview</h3>
              </div>
              <div className="border-t border-slate-200">
                {/* Column header row — uses same TABLE_GRID + TABLE_CELL_PAD as ComparisonRow */}
                <div className={`grid ${TABLE_GRID} divide-x divide-slate-200 border-b border-slate-200 bg-slate-100/60`}>
                  <div className={TABLE_CELL_PAD} />
                  <div className={`${TABLE_CELL_PAD} text-xs font-semibold text-slate-700 truncate`}>
                    {v1.year} {v1.make} {v1.model}
                  </div>
                  <div className={`${TABLE_CELL_PAD} text-xs font-semibold text-slate-500 truncate`}>
                    {v2 ? `${v2.year} ${v2.make} ${v2.model}` : 'Add Car B ↑'}
                  </div>
                </div>
                <ComparisonRow label="Body Type" v1={specs1?.specs.overview.bodyType} v2={specs2?.specs.overview.bodyType} carBSelected={!!v2} />
                <ComparisonRow label="Fuel Type" v1={specs1?.specs.overview.fuelType} v2={specs2?.specs.overview.fuelType} carBSelected={!!v2} />
                <ComparisonRow label="Drivetrain" v1={specs1?.specs.overview.drivetrain} v2={specs2?.specs.overview.drivetrain} carBSelected={!!v2} />
                <ComparisonRow label="Transmission" v1={specs1?.specs.overview.transmission} v2={specs2?.specs.overview.transmission} carBSelected={!!v2} />
                <ComparisonRow label="Seating" v1={specs1?.specs.overview.seating} v2={specs2?.specs.overview.seating} carBSelected={!!v2} />
                <ComparisonRow label="Warranty" v1={specs1?.specs.overview.warranty} v2={specs2?.specs.overview.warranty} carBSelected={!!v2} />

                <div className="p-6 bg-slate-50/50 border-t border-slate-200">
                  <div className="flex items-center gap-3 text-slate-500">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                    <p className="italic text-sm">AI Overview coming soon</p>
                  </div>
                </div>
              </div>
            </div>

            <ComparisonSection title="Efficiency" expanded={expandedSections.efficiency} onToggle={() => toggleSection('efficiency')}>
              <ComparisonRow label="Fuel Economy" v1={specs1?.specs.efficiency.fuelEconomy} v2={specs2?.specs.efficiency.fuelEconomy} carBSelected={!!v2} />
              <ComparisonRow label="Real-World Estimate" v1={specs1?.specs.efficiency.realWorldEstimate} v2={specs2?.specs.efficiency.realWorldEstimate} carBSelected={!!v2} />
              <ComparisonRow label="Fuel Tank" v1={specs1?.specs.efficiency.fuelTank} v2={specs2?.specs.efficiency.fuelTank} carBSelected={!!v2} />
              <ComparisonRow label="Estimated Range" v1={specs1?.specs.efficiency.estimatedRange} v2={specs2?.specs.efficiency.estimatedRange} carBSelected={!!v2} />
              <ComparisonRow label="Service Interval" v1={specs1?.specs.efficiency.serviceInterval} v2={specs2?.specs.efficiency.serviceInterval} carBSelected={!!v2} />
              <ComparisonRow label="Annual Running Cost" v1={specs1?.specs.efficiency.annualRunningCost} v2={specs2?.specs.efficiency.annualRunningCost} carBSelected={!!v2} />
            </ComparisonSection>

            <ComparisonSection title="Performance" expanded={expandedSections.performance} onToggle={() => toggleSection('performance')}>
              <ComparisonRow label="Power" v1={specs1?.specs.performance.power} v2={specs2?.specs.performance.power} carBSelected={!!v2} />
              <ComparisonRow label="Torque" v1={specs1?.specs.performance.torque} v2={specs2?.specs.performance.torque} carBSelected={!!v2} />
              <ComparisonRow label="0-100 km/h" v1={specs1?.specs.performance.zeroToHundred} v2={specs2?.specs.performance.zeroToHundred} carBSelected={!!v2} />
              <ComparisonRow label="Top Speed" v1={specs1?.specs.performance.topSpeed} v2={specs2?.specs.performance.topSpeed} carBSelected={!!v2} />
              <ComparisonRow label="Weight" v1={specs1?.specs.performance.weight} v2={specs2?.specs.performance.weight} carBSelected={!!v2} />
              <ComparisonRow label="Power to Weight" v1={specs1?.specs.performance.powerToWeight} v2={specs2?.specs.performance.powerToWeight} carBSelected={!!v2} />
              <ComparisonRow label="Engine" v1={specs1?.specs.performance.engine} v2={specs2?.specs.performance.engine} carBSelected={!!v2} />
              <ComparisonRow label="Suspension" v1={specs1?.specs.performance.suspension} v2={specs2?.specs.performance.suspension} carBSelected={!!v2} />
            </ComparisonSection>

            <ComparisonSection title="Connectivity" expanded={expandedSections.connectivity} onToggle={() => toggleSection('connectivity')}>
              <ComparisonRow label="Screen Size" v1={specs1?.specs.connectivity.screenSize} v2={specs2?.specs.connectivity.screenSize} carBSelected={!!v2} />
              <ComparisonRow label="Digital Cluster" v1={specs1?.specs.connectivity.digitalCluster} v2={specs2?.specs.connectivity.digitalCluster} carBSelected={!!v2} />
              <ComparisonRow label="Apple CarPlay" v1={specs1?.specs.connectivity.appleCarPlay} v2={specs2?.specs.connectivity.appleCarPlay} carBSelected={!!v2} />
              <ComparisonRow label="Android Auto" v1={specs1?.specs.connectivity.androidAuto} v2={specs2?.specs.connectivity.androidAuto} carBSelected={!!v2} />
              <ComparisonRow label="Wireless Charging" v1={specs1?.specs.connectivity.wirelessCharging} v2={specs2?.specs.connectivity.wirelessCharging} carBSelected={!!v2} />
              <ComparisonRow label="Sound System" v1={specs1?.specs.connectivity.soundSystem} v2={specs2?.specs.connectivity.soundSystem} carBSelected={!!v2} />
              <ComparisonRow label="App Support" v1={specs1?.specs.connectivity.appSupport} v2={specs2?.specs.connectivity.appSupport} carBSelected={!!v2} />
              <ComparisonRow label="OTA Updates" v1={specs1?.specs.connectivity.otaUpdates} v2={specs2?.specs.connectivity.otaUpdates} carBSelected={!!v2} />
            </ComparisonSection>

            <ComparisonSection title="Safety" expanded={expandedSections.safety} onToggle={() => toggleSection('safety')}>
              <ComparisonRow label="ANCAP Rating" v1={specs1?.specs.safety.ancapRating} v2={specs2?.specs.safety.ancapRating} carBSelected={!!v2} />
              <ComparisonRow label="Airbags" v1={specs1?.specs.safety.airbags} v2={specs2?.specs.safety.airbags} carBSelected={!!v2} />
              <ComparisonRow label="AEB" v1={specs1?.specs.safety.aeb} v2={specs2?.specs.safety.aeb} carBSelected={!!v2} />
              <ComparisonRow label="Lane Keep Assist" v1={specs1?.specs.safety.laneKeepAssist} v2={specs2?.specs.safety.laneKeepAssist} carBSelected={!!v2} />
              <ComparisonRow label="Adaptive Cruise" v1={specs1?.specs.safety.adaptiveCruise} v2={specs2?.specs.safety.adaptiveCruise} carBSelected={!!v2} />
              <ComparisonRow label="Blind Spot Monitor" v1={specs1?.specs.safety.blindSpotMonitoring} v2={specs2?.specs.safety.blindSpotMonitoring} carBSelected={!!v2} />
              <ComparisonRow label="Rear Cross Traffic" v1={specs1?.specs.safety.rearCrossTraffic} v2={specs2?.specs.safety.rearCrossTraffic} carBSelected={!!v2} />
            </ComparisonSection>
          </>
        )}
      </div>
    </div>
  );
}

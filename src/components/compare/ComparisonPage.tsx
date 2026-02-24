import { useEffect, useState } from 'react';
import { StructuredVehicle, Pack } from '../../types/specs';
import { structuredVehicles } from '../../data/structuredVehicles';
import { resolveConfiguredVehicle, ResolvedVehicle } from '../../lib/resolveConfiguredVehicle';
import { addToGarage, removeFromGarage, isInGarage } from '../../lib/session';
import { Filters } from './types';
import { getDisplayProps } from './utils/display';
import { AdvancedFilters, defaultAdvancedFilters, matchesAdvancedFilters } from '../../lib/advancedFilters';
import { DiscoveryPanel } from './panels/DiscoveryPanel';
import { CarAExplorePanel } from './panels/CarAExplorePanel';
import { VehicleHeroCard } from './panels/VehicleHeroCard';
import { StickyCompareBanner } from './components/StickyCompareBanner';
import { ComparisonSection } from './sections/ComparisonSection';
import { ComparisonRow } from './sections/ComparisonRow';
import { TABLE_GRID, TABLE_CELL_PAD } from './sections/tableLayout';

export default function ComparisonPage({ prefillVehicleId }: { prefillVehicleId?: string | null }) {
  const [vehicles, setVehicles] = useState<[StructuredVehicle | null, StructuredVehicle | null]>([null, null]);
  const [selectedTrims, setSelectedTrims] = useState<[string | null, string | null]>([null, null]);
  const [selectedPackIds, setSelectedPackIds] = useState<[string[], string[]]>([[], []]);
  const [selectedVariantIds, setSelectedVariantIds] = useState<[string | null, string | null]>([null, null]);
  const [selectedSubvariantIds, setSelectedSubvariantIds] = useState<[string | null, string | null]>([null, null]);
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
      const specs = resolveConfiguredVehicle(vehicles[0], {
        variantId: selectedVariantIds[0],
        subvariantId: selectedSubvariantIds[0],
        trimId: selectedTrims[0],
        packIds: selectedPackIds[0],
      });
      setResolvedSpecsState(prev => [specs, prev[1]]);
      setInGarage(prev => [isInGarage(vehicles[0]!.id), prev[1]]);
    } else {
      setResolvedSpecsState(prev => [null, prev[1]]);
    }
  }, [vehicles[0], selectedTrims[0], selectedPackIds[0], selectedVariantIds[0], selectedSubvariantIds[0]]);

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
      const specs = resolveConfiguredVehicle(vehicles[1], {
        variantId: selectedVariantIds[1],
        subvariantId: selectedSubvariantIds[1],
        trimId: selectedTrims[1],
        packIds: selectedPackIds[1],
      });
      setResolvedSpecsState(prev => [prev[0], specs]);
      setInGarage(prev => [prev[0], isInGarage(vehicles[1]!.id)]);
    } else {
      setResolvedSpecsState(prev => [prev[0], null]);
    }
  }, [vehicles[1], selectedTrims[1], selectedPackIds[1], selectedVariantIds[1], selectedSubvariantIds[1]]);

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

  const toggleGarage = (index: 0 | 1) => {
    const vehicle = vehicles[index];
    if (!vehicle) return;
    if (isInGarage(vehicle.id)) {
      removeFromGarage(vehicle.id);
      setInGarage(prev => {
        const updated = [...prev] as [boolean, boolean];
        updated[index] = false;
        return updated;
      });
    } else {
      addToGarage(vehicle.id);
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

  const togglePack = (index: 0 | 1, packId: string) => {
    setSelectedPackIds(prev => {
      const newPackIds = [...prev] as [string[], string[]];
      newPackIds[index] = newPackIds[index].includes(packId)
        ? newPackIds[index].filter(id => id !== packId)
        : [...newPackIds[index], packId];
      return newPackIds;
    });
  };

  const selectCarA = (vehicle: StructuredVehicle | null) => {
    if (vehicle === null) {
      setVehicles([null, null]);
      setSelectedTrims([null, null]);
      setSelectedPackIds([[], []]);
      setSelectedVariantIds([null, null]);
      setSelectedSubvariantIds([null, null]);
    } else {
      setVehicles([vehicle, null]);
      setSelectedTrims([vehicle.trims[0]?.id ?? null, null]);
      setSelectedPackIds([[], []]);
      setSelectedVariantIds([null, null]);
      setSelectedSubvariantIds([null, null]);
    }
  };

  const selectCarB = (vehicle: StructuredVehicle | null) => {
    if (vehicle === null) {
      setVehicles([vehicles[0], null]);
      setSelectedTrims([selectedTrims[0], null]);
      setSelectedPackIds([selectedPackIds[0], []]);
      setSelectedVariantIds([selectedVariantIds[0], null]);
      setSelectedSubvariantIds([selectedSubvariantIds[0], null]);
    } else {
      setVehicles([vehicles[0], vehicle]);
      setSelectedTrims([selectedTrims[0], vehicle.trims[0]?.id ?? null]);
      setSelectedPackIds([selectedPackIds[0], []]);
      setSelectedVariantIds([selectedVariantIds[0], null]);
      setSelectedSubvariantIds([selectedSubvariantIds[0], null]);
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
                selectedTrimId={selectedTrims[0]}
                setSelectedTrimId={(id) => { setSelectedTrims([id, selectedTrims[1]]); setSelectedPackIds([[], selectedPackIds[1]]); }}
                selectedPackIds={selectedPackIds[0]}
                togglePack={(packId) => togglePack(0, packId)}
                heroIndex={heroIndexA}
                setHeroIndex={setHeroIndexA}
                lightboxOpen={lightboxOpen}
                setLightboxOpen={setLightboxOpen}
                selectedVariantId={selectedVariantIds[0]}
                setSelectedVariantId={(id) => setSelectedVariantIds([id, selectedVariantIds[1]])}
                selectedSubvariantId={selectedSubvariantIds[0]}
                setSelectedSubvariantId={(id) => setSelectedSubvariantIds([id, selectedSubvariantIds[1]])}
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
                  {v1.variants && v1.variants.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <h4 className="font-semibold text-sm text-slate-700 mb-2">Configuration</h4>
                      {v1.variants.map((variant) => (
                        <button
                          key={variant.id}
                          onClick={() => setSelectedVariantIds([
                            variant.id === selectedVariantIds[0] ? null : variant.id,
                            selectedVariantIds[1],
                          ])}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedVariantIds[0] === variant.id
                              ? 'border-slate-900 bg-slate-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-sm">{variant.name}</span>
                            <span className="text-sm">{variant.priceDelta && variant.priceDelta > 0 ? `+$${variant.priceDelta.toLocaleString()}` : 'Base'}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {v1.subvariants && v1.subvariants.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <h4 className="font-semibold text-sm text-slate-700 mb-2">Body Style</h4>
                      {v1.subvariants.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => setSelectedSubvariantIds([
                            sub.id === selectedSubvariantIds[0] ? null : sub.id,
                            selectedSubvariantIds[1],
                          ])}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedSubvariantIds[0] === sub.id
                              ? 'border-slate-900 bg-slate-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-sm">{sub.name}</span>
                            <span className="text-sm">{sub.priceDelta && sub.priceDelta > 0 ? `+$${sub.priceDelta.toLocaleString()}` : 'Base'}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {v1.trims.length > 1 && (
                    <div className="space-y-2 mb-4">
                      <h4 className="font-semibold text-sm text-slate-700 mb-2">Select Trim</h4>
                      {v1.trims.map((trim) => {
                        const delta = trim.basePrice - v1.trims[0].basePrice;
                        return (
                          <button
                            key={trim.id}
                            onClick={() => { setSelectedTrims([trim.id, selectedTrims[1]]); setSelectedPackIds([[], selectedPackIds[1]]); }}
                            className={`w-full text-left p-3 rounded-lg border transition-all ${
                              selectedTrims[0] === trim.id
                                ? 'border-slate-900 bg-slate-50'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{trim.name}</span>
                              <span className="text-sm">{delta > 0 ? `+$${delta.toLocaleString()}` : 'Base'}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {specs1 && specs1.selectedTrim.packs.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-slate-700">Option Packs</h4>
                      {specs1.selectedTrim.packs.map((pack: Pack) => (
                        <button
                          key={pack.id}
                          onClick={() => togglePack(0, pack.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedPackIds[0].includes(pack.id)
                              ? 'border-slate-900 bg-slate-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">{pack.name}</span>
                            <span className="text-sm font-bold">+${pack.priceDelta.toLocaleString()}</span>
                          </div>
                          {pack.features.length > 0 && (
                            <div className="text-xs text-slate-600">
                              {pack.features.slice(0, 3).map((f, idx) => (
                                <span key={idx}>• {f} </span>
                              ))}
                              {pack.features.length > 3 && <span className="italic">+{pack.features.length - 3} more</span>}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Car B trims + packs (or placeholder) */}
                <div className={TABLE_CELL_PAD}>
                  {!v2 ? (
                    <div className="flex items-center justify-center h-full min-h-[80px]">
                      <p className="text-sm text-slate-400">Add Car B to configure</p>
                    </div>
                  ) : (
                    <>
                      {v2.variants && v2.variants.length > 0 && (
                        <div className="space-y-2 mb-4">
                          <h4 className="font-semibold text-sm text-slate-700 mb-2">Configuration</h4>
                          {v2.variants.map((variant) => (
                            <button
                              key={variant.id}
                              onClick={() => setSelectedVariantIds([
                                selectedVariantIds[0],
                                variant.id === selectedVariantIds[1] ? null : variant.id,
                              ])}
                              className={`w-full text-left p-3 rounded-lg border transition-all ${
                                selectedVariantIds[1] === variant.id
                                  ? 'border-slate-900 bg-slate-50'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-sm">{variant.name}</span>
                                <span className="text-sm">{variant.priceDelta && variant.priceDelta > 0 ? `+$${variant.priceDelta.toLocaleString()}` : 'Base'}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {v2.subvariants && v2.subvariants.length > 0 && (
                        <div className="space-y-2 mb-4">
                          <h4 className="font-semibold text-sm text-slate-700 mb-2">Body Style</h4>
                          {v2.subvariants.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => setSelectedSubvariantIds([
                                selectedSubvariantIds[0],
                                sub.id === selectedSubvariantIds[1] ? null : sub.id,
                              ])}
                              className={`w-full text-left p-3 rounded-lg border transition-all ${
                                selectedSubvariantIds[1] === sub.id
                                  ? 'border-slate-900 bg-slate-50'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-sm">{sub.name}</span>
                                <span className="text-sm">{sub.priceDelta && sub.priceDelta > 0 ? `+$${sub.priceDelta.toLocaleString()}` : 'Base'}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {v2.trims.length > 1 && (
                        <div className="space-y-2 mb-4">
                          <h4 className="font-semibold text-sm text-slate-700 mb-2">Select Trim</h4>
                          {v2.trims.map((trim) => {
                            const delta = trim.basePrice - v2.trims[0].basePrice;
                            return (
                              <button
                                key={trim.id}
                                onClick={() => { setSelectedTrims([selectedTrims[0], trim.id]); setSelectedPackIds([selectedPackIds[0], []]); }}
                                className={`w-full text-left p-3 rounded-lg border transition-all ${
                                  selectedTrims[1] === trim.id
                                    ? 'border-slate-900 bg-slate-50'
                                    : 'border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">{trim.name}</span>
                                  <span className="text-sm">{delta > 0 ? `+$${delta.toLocaleString()}` : 'Base'}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {specs2 && specs2.selectedTrim.packs.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-slate-700">Option Packs</h4>
                          {specs2.selectedTrim.packs.map((pack: Pack) => (
                            <button
                              key={pack.id}
                              onClick={() => togglePack(1, pack.id)}
                              className={`w-full text-left p-3 rounded-lg border transition-all ${
                                selectedPackIds[1].includes(pack.id)
                                  ? 'border-slate-900 bg-slate-50'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-medium">{pack.name}</span>
                                <span className="text-sm font-bold">+${pack.priceDelta.toLocaleString()}</span>
                              </div>
                              {pack.features.length > 0 && (
                                <div className="text-xs text-slate-600">
                                  {pack.features.slice(0, 3).map((f, idx) => (
                                    <span key={idx}>• {f} </span>
                                  ))}
                                  {pack.features.length > 3 && <span className="italic">+{pack.features.length - 3} more</span>}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
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

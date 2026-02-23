import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Heart, X, Search } from 'lucide-react';
import { StructuredVehicle, Pack, ResolvedSpecs } from '../types/specs';
import { structuredVehicles } from '../data/structuredVehicles';
import { resolveSpecs } from '../lib/resolveSpecs';
import { addToGarage, removeFromGarage, isInGarage } from '../lib/session';

interface Filters {
  search: string;
  make: string;
  model: string;
  bodyType: string;
  fuelType: string;
}

function getDisplayProps(v: StructuredVehicle) {
  const t = v.trims[0];
  return {
    bodyType: t?.specs.overview.bodyType ?? '',
    fuelType: t?.specs.overview.fuelType ?? '',
    basePrice: t?.basePrice ?? 0,
    imageUrl: v.images[0] ?? '',
  };
}

export default function ComparisonPage() {
  const [vehicles, setVehicles] = useState<[StructuredVehicle | null, StructuredVehicle | null]>([null, null]);
  const [selectedTrims, setSelectedTrims] = useState<[string | null, string | null]>([null, null]);
  const [selectedPackIds, setSelectedPackIds] = useState<[string[], string[]]>([[], []]);
  const [resolvedSpecs, setResolvedSpecsState] = useState<[ResolvedSpecs | null, ResolvedSpecs | null]>([null, null]);
  const [inGarage, setInGarage] = useState<[boolean, boolean]>([false, false]);
  const [filtersA, setFiltersA] = useState<Filters>({ search: '', make: '', model: '', bodyType: '', fuelType: '' });
  const [filtersB, setFiltersB] = useState<Filters>({ search: '', make: '', model: '', bodyType: '', fuelType: '' });

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
      const specs = resolveSpecs(vehicles[0], selectedTrims[0] ?? undefined, selectedPackIds[0]);
      setResolvedSpecsState(prev => [specs, prev[1]]);
      setInGarage(prev => [isInGarage(vehicles[0]!.id), prev[1]]);
    } else {
      setResolvedSpecsState(prev => [null, prev[1]]);
    }
  }, [vehicles[0], selectedTrims[0], selectedPackIds[0]]);

  // Resolve specs for Car B
  useEffect(() => {
    if (vehicles[1]) {
      const specs = resolveSpecs(vehicles[1], selectedTrims[1] ?? undefined, selectedPackIds[1]);
      setResolvedSpecsState(prev => [prev[0], specs]);
      setInGarage(prev => [prev[0], isInGarage(vehicles[1]!.id)]);
    } else {
      setResolvedSpecsState(prev => [prev[0], null]);
    }
  }, [vehicles[1], selectedTrims[1], selectedPackIds[1]]);

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
      const updated = [...inGarage] as [boolean, boolean];
      updated[index] = false;
      setInGarage(updated);
    } else {
      addToGarage(vehicle.id);
      const updated = [...inGarage] as [boolean, boolean];
      updated[index] = true;
      setInGarage(updated);
    }
    window.dispatchEvent(new Event('garage-updated'));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const togglePack = (index: 0 | 1, packId: string) => {
    const newPackIds = [...selectedPackIds] as [string[], string[]];
    newPackIds[index] = newPackIds[index].includes(packId)
      ? newPackIds[index].filter(id => id !== packId)
      : [...newPackIds[index], packId];
    setSelectedPackIds(newPackIds);
  };

  const selectCarA = (vehicle: StructuredVehicle | null) => {
    setVehicles([vehicle, vehicles[1]]);
    setSelectedTrims([vehicle?.trims[0]?.id ?? null, selectedTrims[1]]);
    setSelectedPackIds([[], selectedPackIds[1]]);
  };

  const selectCarB = (vehicle: StructuredVehicle | null) => {
    setVehicles([vehicles[0], vehicle]);
    setSelectedTrims([selectedTrims[0], vehicle?.trims[0]?.id ?? null]);
    setSelectedPackIds([selectedPackIds[0], []]);
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

        {(!v1 || !v2) && (
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Left column: Car A selector or compact locked panel */}
            {!v1 ? (
              <DiscoveryPanel
                title="Car A"
                vehicle={v1}
                filters={filtersA}
                setFilters={setFiltersA}
                filteredVehicles={filteredVehiclesA}
                makes={makes}
                models={modelsA}
                bodyTypes={bodyTypesA}
                fuelTypes={fuelTypesA}
                onSelectVehicle={selectCarA}
                disabled={false}
              />
            ) : (
              <div className="bg-white rounded-lg border-2 border-slate-200 p-4 flex items-center gap-4 self-start">
                {v1.images[0] && (
                  <img
                    src={v1.images[0]}
                    alt=""
                    className="w-20 h-14 object-cover rounded bg-slate-100 flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Car A</p>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    {v1.year} {v1.make} {v1.model}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {getDisplayProps(v1).bodyType} · {getDisplayProps(v1).fuelType}
                  </p>
                </div>
              </div>
            )}
            {/* Right column: Car B selector (disabled until Car A is selected) */}
            <DiscoveryPanel
              title="Car B"
              vehicle={v2}
              filters={filtersB}
              setFilters={setFiltersB}
              filteredVehicles={filteredVehiclesB}
              makes={makes}
              models={modelsB}
              bodyTypes={bodyTypesB}
              fuelTypes={fuelTypesB}
              onSelectVehicle={selectCarB}
              disabled={!v1}
            />
          </div>
        )}

        {/* Comparison table — shows as soon as Car A is selected */}
        {v1 && (
          <>
            {/* Sticky banner — shows as soon as Car A is selected */}
            <div className="bg-white rounded-lg border-2 border-slate-200 overflow-hidden mb-6 sticky top-16 z-10 shadow-lg">
              <div className="grid grid-cols-2 divide-x divide-slate-200">
                {/* Car A */}
                <div className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {/* Future: photo reel (exterior + interior) lives on Profile page; Compare stays compact. */}
                      {v1.images[0] && (
                        <img
                          src={v1.images[0]}
                          alt=""
                          className="w-16 h-12 object-cover rounded flex-shrink-0 bg-slate-100"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <div className="min-w-0">
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                          {v1.year} {v1.make} {v1.model}
                        </h2>
                        {specs1?.selectedTrim.name && (
                          <p className="text-xs text-slate-500 truncate">{specs1.selectedTrim.name}</p>
                        )}
                        <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                          ${specs1?.totalPrice.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleGarage(0)}
                        className={`hidden sm:flex text-xs px-2 py-1.5 rounded-lg border font-medium transition-all items-center gap-1 ${
                          inGarage[0]
                            ? 'border-red-400 text-red-600 hover:bg-red-50'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Heart className={`w-3 h-3 ${inGarage[0] ? 'fill-red-500' : ''}`} />
                        {inGarage[0] ? 'Saved' : 'Save'}
                      </button>
                      <button
                        onClick={() => toggleGarage(0)}
                        className={`sm:hidden p-1.5 rounded-lg border transition-all ${
                          inGarage[0]
                            ? 'border-red-400 text-red-600 hover:bg-red-50'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${inGarage[0] ? 'fill-red-500' : ''}`} />
                      </button>
                      <button
                        onClick={() => selectCarA(null)}
                        className="text-xs px-2 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                      >
                        Change
                      </button>
                      <button
                        onClick={() => { selectCarA(null); selectCarB(null); }}
                        className="p-1.5 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50"
                        title="Remove Car A"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Car B — placeholder or content */}
                <div className="p-3 sm:p-4">
                  {!v2 ? (
                    <div className="flex items-center justify-center h-full min-h-[56px]">
                      <p className="text-sm text-slate-400">No Car B selected</p>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {v2.images[0] && (
                          <img
                            src={v2.images[0]}
                            alt=""
                            className="w-16 h-12 object-cover rounded flex-shrink-0 bg-slate-100"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        <div className="min-w-0">
                          <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                            {v2.year} {v2.make} {v2.model}
                          </h2>
                          {specs2?.selectedTrim.name && (
                            <p className="text-xs text-slate-500 truncate">{specs2.selectedTrim.name}</p>
                          )}
                          <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                            ${specs2?.totalPrice.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => toggleGarage(1)}
                          className={`hidden sm:flex text-xs px-2 py-1.5 rounded-lg border font-medium transition-all items-center gap-1 ${
                            inGarage[1]
                              ? 'border-red-400 text-red-600 hover:bg-red-50'
                              : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Heart className={`w-3 h-3 ${inGarage[1] ? 'fill-red-500' : ''}`} />
                          {inGarage[1] ? 'Saved' : 'Save'}
                        </button>
                        <button
                          onClick={() => toggleGarage(1)}
                          className={`sm:hidden p-1.5 rounded-lg border transition-all ${
                            inGarage[1]
                              ? 'border-red-400 text-red-600 hover:bg-red-50'
                              : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${inGarage[1] ? 'fill-red-500' : ''}`} />
                        </button>
                        <button
                          onClick={() => selectCarB(null)}
                          className="text-xs px-2 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          Change
                        </button>
                        <button
                          onClick={() => selectCarB(null)}
                          className="p-1.5 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50"
                          title="Remove Car B"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Trim & Options */}
            <ComparisonSection
              title="Trim & Options"
              sectionKey="trim"
              expanded={expandedSections.trim}
              onToggle={() => toggleSection('trim')}
            >
              <div className="grid grid-cols-2 divide-x divide-slate-200">
                {/* Car A trims + packs */}
                <div className="p-4">
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
                <div className="p-4">
                  {!v2 ? (
                    <div className="flex items-center justify-center h-full min-h-[80px]">
                      <p className="text-sm text-slate-400">Add Car B to configure</p>
                    </div>
                  ) : (
                    <>
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
                {/* Column header row */}
                <div className="grid grid-cols-[200px_1fr_1fr] divide-x divide-slate-200 border-b border-slate-200 bg-slate-100/60">
                  <div className="p-3" />
                  <div className="p-3 text-xs font-semibold text-slate-700 truncate">
                    {v1.year} {v1.make} {v1.model}
                  </div>
                  <div className="p-3 text-xs font-semibold text-slate-500 truncate">
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

            <ComparisonSection title="Efficiency" sectionKey="efficiency" expanded={expandedSections.efficiency} onToggle={() => toggleSection('efficiency')}>
              <ComparisonRow label="Fuel Economy" v1={specs1?.specs.efficiency.fuelEconomy} v2={specs2?.specs.efficiency.fuelEconomy} carBSelected={!!v2} />
              <ComparisonRow label="Real-World Estimate" v1={specs1?.specs.efficiency.realWorldEstimate} v2={specs2?.specs.efficiency.realWorldEstimate} carBSelected={!!v2} />
              <ComparisonRow label="Fuel Tank" v1={specs1?.specs.efficiency.fuelTank} v2={specs2?.specs.efficiency.fuelTank} carBSelected={!!v2} />
              <ComparisonRow label="Estimated Range" v1={specs1?.specs.efficiency.estimatedRange} v2={specs2?.specs.efficiency.estimatedRange} carBSelected={!!v2} />
              <ComparisonRow label="Service Interval" v1={specs1?.specs.efficiency.serviceInterval} v2={specs2?.specs.efficiency.serviceInterval} carBSelected={!!v2} />
              <ComparisonRow label="Annual Running Cost" v1={specs1?.specs.efficiency.annualRunningCost} v2={specs2?.specs.efficiency.annualRunningCost} carBSelected={!!v2} />
            </ComparisonSection>

            <ComparisonSection title="Performance" sectionKey="performance" expanded={expandedSections.performance} onToggle={() => toggleSection('performance')}>
              <ComparisonRow label="Power" v1={specs1?.specs.performance.power} v2={specs2?.specs.performance.power} carBSelected={!!v2} />
              <ComparisonRow label="Torque" v1={specs1?.specs.performance.torque} v2={specs2?.specs.performance.torque} carBSelected={!!v2} />
              <ComparisonRow label="0-100 km/h" v1={specs1?.specs.performance.zeroToHundred} v2={specs2?.specs.performance.zeroToHundred} carBSelected={!!v2} />
              <ComparisonRow label="Top Speed" v1={specs1?.specs.performance.topSpeed} v2={specs2?.specs.performance.topSpeed} carBSelected={!!v2} />
              <ComparisonRow label="Weight" v1={specs1?.specs.performance.weight} v2={specs2?.specs.performance.weight} carBSelected={!!v2} />
              <ComparisonRow label="Power to Weight" v1={specs1?.specs.performance.powerToWeight} v2={specs2?.specs.performance.powerToWeight} carBSelected={!!v2} />
              <ComparisonRow label="Engine" v1={specs1?.specs.performance.engine} v2={specs2?.specs.performance.engine} carBSelected={!!v2} />
              <ComparisonRow label="Suspension" v1={specs1?.specs.performance.suspension} v2={specs2?.specs.performance.suspension} carBSelected={!!v2} />
            </ComparisonSection>

            <ComparisonSection title="Connectivity" sectionKey="connectivity" expanded={expandedSections.connectivity} onToggle={() => toggleSection('connectivity')}>
              <ComparisonRow label="Screen Size" v1={specs1?.specs.connectivity.screenSize} v2={specs2?.specs.connectivity.screenSize} carBSelected={!!v2} />
              <ComparisonRow label="Digital Cluster" v1={specs1?.specs.connectivity.digitalCluster} v2={specs2?.specs.connectivity.digitalCluster} carBSelected={!!v2} />
              <ComparisonRow label="Apple CarPlay" v1={specs1?.specs.connectivity.appleCarPlay} v2={specs2?.specs.connectivity.appleCarPlay} carBSelected={!!v2} />
              <ComparisonRow label="Android Auto" v1={specs1?.specs.connectivity.androidAuto} v2={specs2?.specs.connectivity.androidAuto} carBSelected={!!v2} />
              <ComparisonRow label="Wireless Charging" v1={specs1?.specs.connectivity.wirelessCharging} v2={specs2?.specs.connectivity.wirelessCharging} carBSelected={!!v2} />
              <ComparisonRow label="Sound System" v1={specs1?.specs.connectivity.soundSystem} v2={specs2?.specs.connectivity.soundSystem} carBSelected={!!v2} />
              <ComparisonRow label="App Support" v1={specs1?.specs.connectivity.appSupport} v2={specs2?.specs.connectivity.appSupport} carBSelected={!!v2} />
              <ComparisonRow label="OTA Updates" v1={specs1?.specs.connectivity.otaUpdates} v2={specs2?.specs.connectivity.otaUpdates} carBSelected={!!v2} />
            </ComparisonSection>

            <ComparisonSection title="Safety" sectionKey="safety" expanded={expandedSections.safety} onToggle={() => toggleSection('safety')}>
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

// ─── Sub-components ──────────────────────────────────────────────────────────

function DiscoveryPanel({
  title,
  vehicle,
  filters,
  setFilters,
  filteredVehicles,
  makes,
  models,
  bodyTypes,
  fuelTypes,
  onSelectVehicle,
  disabled,
}: {
  title: string;
  vehicle: StructuredVehicle | null;
  filters: Filters;
  setFilters: (f: Filters) => void;
  filteredVehicles: StructuredVehicle[];
  makes: string[];
  models: string[];
  bodyTypes: string[];
  fuelTypes: string[];
  onSelectVehicle: (v: StructuredVehicle | null) => void;
  disabled: boolean;
}) {
  const clearFilters = () => setFilters({ search: '', make: '', model: '', bodyType: '', fuelType: '' });

  if (disabled) {
    return (
      <div className="bg-white rounded-lg border-2 border-dashed border-slate-300 p-12 flex flex-col items-center justify-center min-h-[600px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-400 mb-2">{title}</h2>
          <p className="text-slate-400">Select Car A first to enable comparison</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border-2 border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
      <div className="p-6 border-b border-slate-200 bg-slate-50">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">{title}</h2>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search vehicles..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Make</label>
            <select
              value={filters.make}
              onChange={(e) => setFilters({ ...filters, make: e.target.value, model: '' })}
              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">All</option>
              {makes.map(make => <option key={make} value={make}>{make}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Model</label>
            <select
              value={filters.model}
              onChange={(e) => setFilters({ ...filters, model: e.target.value })}
              disabled={!filters.make}
              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100"
            >
              <option value="">All</option>
              {models.map(model => <option key={model} value={model}>{model}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Body Type</label>
            <select
              value={filters.bodyType}
              onChange={(e) => setFilters({ ...filters, bodyType: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">All</option>
              {bodyTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Fuel Type</label>
            <select
              value={filters.fuelType}
              onChange={(e) => setFilters({ ...filters, fuelType: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">All</option>
              {fuelTypes.map(fuel => <option key={fuel} value={fuel}>{fuel}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600">{filteredVehicles.length} found</span>
          <button onClick={clearFilters} className="text-slate-900 hover:text-slate-700 font-medium">Clear</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredVehicles.map(v => {
          const dp = getDisplayProps(v);
          return (
            <button
              key={v.id}
              onClick={() => onSelectVehicle(v)}
              className="w-full flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-900 hover:shadow-md transition-all text-left"
            >
              <div className="w-20 h-14 bg-slate-100 rounded overflow-hidden flex-shrink-0">
                {dp.imageUrl && (
                  <img src={dp.imageUrl} alt={`${v.make} ${v.model}`} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 text-sm truncate">
                  {v.year} {v.make} {v.model}
                </h3>
                <p className="text-xs text-slate-600">{dp.bodyType} • {dp.fuelType}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900 text-sm">${dp.basePrice.toLocaleString()}</p>
              </div>
            </button>
          );
        })}

        {filteredVehicles.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">No vehicles found</p>
          </div>
        )}
      </div>
    </div>
  );
}


function ComparisonSection({ title, sectionKey, expanded, onToggle, children }: {
  title: string;
  sectionKey: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      {expanded && <div className="border-t border-slate-200">{children}</div>}
    </div>
  );
}

function ComparisonRow({
  label,
  v1,
  v2,
  carBSelected,
}: {
  label: string;
  v1: any;
  v2: any;
  carBSelected: boolean;
}) {
  const val1 = v1 != null ? v1.toString() : 'N/A';
  const val2 = !carBSelected ? '—' : (v2 != null ? v2.toString() : 'N/A');
  const isDifferent = carBSelected && v1 != null && v2 != null && val1 !== val2;

  return (
    <div className="grid grid-cols-[200px_1fr_1fr] divide-x divide-slate-200 border-b border-slate-200 last:border-b-0">
      <div className="p-4 bg-slate-50 font-medium text-slate-700">{label}</div>
      <div className={`p-4 ${isDifferent ? 'bg-yellow-50' : ''}`}>{val1}</div>
      <div className={`p-4 ${isDifferent ? 'bg-yellow-50' : ''} ${!carBSelected ? 'text-slate-300' : ''}`}>
        {val2}
      </div>
    </div>
  );
}

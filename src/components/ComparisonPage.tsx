import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Heart, X, Search } from 'lucide-react';
import { Vehicle, PackOption } from '../types';
import { supabase } from '../lib/supabase';
import { resolveVehicleSpecs } from '../lib/specResolver';
import { ResolvedSpecs } from '../types/specs';
import { useAuth } from './Auth/AuthContext';

interface Filters {
  search: string;
  make: string;
  model: string;
  bodyType: string;
  fuelType: string;
  budgetMin: number;
  budgetMax: number;
}

export default function ComparisonPage() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<[Vehicle | null, Vehicle | null]>([null, null]);
  const [selectedTrims, setSelectedTrims] = useState<[string | null, string | null]>([null, null]);
  const [selectedPackIds, setSelectedPackIds] = useState<[string[], string[]]>([[], []]);
  const [resolvedSpecs, setResolvedSpecs] = useState<[ResolvedSpecs | null, ResolvedSpecs | null]>([null, null]);
  const [inGarage, setInGarage] = useState<[boolean, boolean]>([false, false]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [filtersA, setFiltersA] = useState<Filters>({
    search: '',
    make: '',
    model: '',
    bodyType: '',
    fuelType: '',
    budgetMin: 0,
    budgetMax: 250000,
  });
  const [filtersB, setFiltersB] = useState<Filters>({
    search: '',
    make: '',
    model: '',
    bodyType: '',
    fuelType: '',
    budgetMin: 0,
    budgetMax: 250000,
  });

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    trim: true,
    efficiency: true,
    performance: true,
    connectivity: true,
    safety: true,
  });

  useEffect(() => {
    loadAvailableVehicles();
  }, []);

  useEffect(() => {
    if (vehicles[0]) {
      const specs = resolveVehicleSpecs(vehicles[0], selectedTrims[0], selectedPackIds[0]);
      setResolvedSpecs([specs, resolvedSpecs[1]]);
      checkGarageStatus(0);
    }
  }, [vehicles[0], selectedTrims[0], selectedPackIds[0]]);

  useEffect(() => {
    if (vehicles[1]) {
      const specs = resolveVehicleSpecs(vehicles[1], selectedTrims[1], selectedPackIds[1]);
      setResolvedSpecs([resolvedSpecs[0], specs]);
      checkGarageStatus(1);
    }
  }, [vehicles[1], selectedTrims[1], selectedPackIds[1]]);

  const loadAvailableVehicles = async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAvailableVehicles(data);
    }
  };

  const makesA = Array.from(new Set(availableVehicles.map(v => v.make))).sort();
  const modelsA = Array.from(new Set(
    availableVehicles
      .filter(v => !filtersA.make || v.make === filtersA.make)
      .map(v => v.model)
  )).sort();
  const bodyTypesA = Array.from(new Set(availableVehicles.map(v => v.body_type).filter(Boolean))).sort();
  const fuelTypesA = Array.from(new Set(availableVehicles.map(v => v.fuel_type).filter(Boolean))).sort();

  const makesB = Array.from(new Set(availableVehicles.map(v => v.make))).sort();
  const modelsB = Array.from(new Set(
    availableVehicles
      .filter(v => !filtersB.make || v.make === filtersB.make)
      .map(v => v.model)
  )).sort();
  const bodyTypesB = Array.from(new Set(availableVehicles.map(v => v.body_type).filter(Boolean))).sort();
  const fuelTypesB = Array.from(new Set(availableVehicles.map(v => v.fuel_type).filter(Boolean))).sort();

  const checkGarageStatus = async (index: 0 | 1) => {
    if (!user || !vehicles[index]) return;

    const { data } = await supabase
      .from('user_garage')
      .select('id')
      .eq('user_id', user.id)
      .eq('vehicle_id', vehicles[index]!.id)
      .maybeSingle();

    const newInGarage = [...inGarage] as [boolean, boolean];
    newInGarage[index] = !!data;
    setInGarage(newInGarage);
  };

  const toggleGarage = async (index: 0 | 1) => {
    if (!user || !vehicles[index]) return;

    if (inGarage[index]) {
      await supabase
        .from('user_garage')
        .delete()
        .eq('user_id', user.id)
        .eq('vehicle_id', vehicles[index]!.id);
    } else {
      await supabase
        .from('user_garage')
        .insert({
          user_id: user.id,
          vehicle_id: vehicles[index]!.id,
        });
    }

    checkGarageStatus(index);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const togglePack = (index: 0 | 1, packId: string) => {
    const newPackIds = [...selectedPackIds] as [string[], string[]];
    if (newPackIds[index].includes(packId)) {
      newPackIds[index] = newPackIds[index].filter(id => id !== packId);
    } else {
      newPackIds[index] = [...newPackIds[index], packId];
    }
    setSelectedPackIds(newPackIds);
  };

  const selectCarA = (vehicle: Vehicle | null) => {
    setVehicles([vehicle, vehicles[1]]);
    if (vehicle) {
      setSelectedTrims([vehicle.trim_options?.[0]?.name || null, selectedTrims[1]]);
      setSelectedPackIds([[], selectedPackIds[1]]);
    } else {
      setSelectedTrims([null, selectedTrims[1]]);
      setSelectedPackIds([[], selectedPackIds[1]]);
    }
  };

  const selectCarB = (vehicle: Vehicle | null) => {
    setVehicles([vehicles[0], vehicle]);
    if (vehicle) {
      setSelectedTrims([selectedTrims[0], vehicle.trim_options?.[0]?.name || null]);
      setSelectedPackIds([selectedPackIds[0], []]);
    } else {
      setSelectedTrims([selectedTrims[0], null]);
      setSelectedPackIds([selectedPackIds[0], []]);
    }
  };

  const filteredVehiclesA = availableVehicles.filter(v => {
    let matches = true;

    if (filtersA.search) {
      const searchLower = filtersA.search.toLowerCase();
      matches = matches && (
        v.make.toLowerCase().includes(searchLower) ||
        v.model.toLowerCase().includes(searchLower) ||
        v.body_type?.toLowerCase().includes(searchLower) ||
        v.fuel_type?.toLowerCase().includes(searchLower)
      );
    }

    if (filtersA.make) matches = matches && v.make === filtersA.make;
    if (filtersA.model) matches = matches && v.model === filtersA.model;
    if (filtersA.bodyType) matches = matches && v.body_type === filtersA.bodyType;
    if (filtersA.fuelType) matches = matches && v.fuel_type === filtersA.fuelType;

    const price = v.base_price || v.price || 0;
    matches = matches && price >= filtersA.budgetMin && price <= filtersA.budgetMax;

    return matches;
  });

  const filteredVehiclesB = availableVehicles.filter(v => {
    let matches = true;

    if (v.id === vehicles[0]?.id) return false;

    if (filtersB.search) {
      const searchLower = filtersB.search.toLowerCase();
      matches = matches && (
        v.make.toLowerCase().includes(searchLower) ||
        v.model.toLowerCase().includes(searchLower) ||
        v.body_type?.toLowerCase().includes(searchLower) ||
        v.fuel_type?.toLowerCase().includes(searchLower)
      );
    }

    if (filtersB.make) matches = matches && v.make === filtersB.make;
    if (filtersB.model) matches = matches && v.model === filtersB.model;
    if (filtersB.bodyType) matches = matches && v.body_type === filtersB.bodyType;
    if (filtersB.fuelType) matches = matches && v.fuel_type === filtersB.fuelType;

    const price = v.base_price || v.price || 0;
    matches = matches && price >= filtersB.budgetMin && price <= filtersB.budgetMax;

    return matches;
  });

  const v1 = vehicles[0];
  const v2 = vehicles[1];
  const specs1 = resolvedSpecs[0];
  const specs2 = resolvedSpecs[1];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-20 pb-12 px-4">
      <div className="max-w-[1800px] mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Vehicle Comparison</h1>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <DiscoveryPanel
            title="Car A"
            vehicle={v1}
            filters={filtersA}
            setFilters={setFiltersA}
            filteredVehicles={filteredVehiclesA}
            makes={makesA}
            models={modelsA}
            bodyTypes={bodyTypesA}
            fuelTypes={fuelTypesA}
            onSelectVehicle={selectCarA}
            disabled={false}
          />

          <DiscoveryPanel
            title="Car B"
            vehicle={v2}
            filters={filtersB}
            setFilters={setFiltersB}
            filteredVehicles={filteredVehiclesB}
            makes={makesB}
            models={modelsB}
            bodyTypes={bodyTypesB}
            fuelTypes={fuelTypesB}
            onSelectVehicle={selectCarB}
            disabled={!v1}
          />
        </div>

        {v1 && v2 && (
          <>
            <div className="bg-white rounded-lg border-2 border-slate-200 overflow-hidden mb-6 sticky top-16 z-10 shadow-lg">
              <div className="grid grid-cols-2 divide-x divide-slate-200 p-4">
                <div className="px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold text-slate-900 mb-1 truncate">
                        {v1.year} {v1.make} {v1.model}
                      </h2>
                      {specs1?.selectedTrim.name && <p className="text-sm text-slate-600 mb-2">{specs1.selectedTrim.name}</p>}
                      <p className="text-2xl font-bold text-slate-900">${(specs1?.totalPrice || v1.price || 0).toLocaleString()}</p>
                    </div>
                    {user && (
                      <button
                        onClick={() => toggleGarage(0)}
                        className={`flex-shrink-0 p-2 rounded-lg border-2 transition-all ${
                          inGarage[0]
                            ? 'border-red-500 text-red-600 hover:bg-red-50'
                            : 'border-slate-900 text-slate-900 hover:bg-slate-50'
                        }`}
                        title={inGarage[0] ? 'Remove from Garage' : 'Save to Garage'}
                      >
                        <Heart className={`w-4 h-4 ${inGarage[0] ? 'fill-red-500' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold text-slate-900 mb-1 truncate">
                        {v2.year} {v2.make} {v2.model}
                      </h2>
                      {specs2?.selectedTrim.name && <p className="text-sm text-slate-600 mb-2">{specs2.selectedTrim.name}</p>}
                      <p className="text-2xl font-bold text-slate-900">${(specs2?.totalPrice || v2.price || 0).toLocaleString()}</p>
                    </div>
                    {user && (
                      <button
                        onClick={() => toggleGarage(1)}
                        className={`flex-shrink-0 p-2 rounded-lg border-2 transition-all ${
                          inGarage[1]
                            ? 'border-red-500 text-red-600 hover:bg-red-50'
                            : 'border-slate-900 text-slate-900 hover:bg-slate-50'
                        }`}
                        title={inGarage[1] ? 'Remove from Garage' : 'Save to Garage'}
                      >
                        <Heart className={`w-4 h-4 ${inGarage[1] ? 'fill-red-500' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <VehicleHeader
                vehicle={v1}
                price={specs1?.totalPrice || v1.price || 0}
                trimName={specs1?.selectedTrim.name}
                inGarage={inGarage[0]}
                onToggleGarage={() => toggleGarage(0)}
                onRemove={() => setVehicles([null, null])}
                user={user}
              />

              <VehicleHeader
                vehicle={v2}
                price={specs2?.totalPrice || v2.price || 0}
                trimName={specs2?.selectedTrim.name}
                inGarage={inGarage[1]}
                onToggleGarage={() => toggleGarage(1)}
                onRemove={() => setVehicles([v1, null])}
                user={user}
              />
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-4">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">Overview</h3>
              </div>
              <div className="border-t border-slate-200">
                <ComparisonRow label="Body Type" v1={specs1?.specs.overview.bodyType} v2={specs2?.specs.overview.bodyType} />
                <ComparisonRow label="Fuel Type" v1={specs1?.specs.overview.fuelType} v2={specs2?.specs.overview.fuelType} />
                <ComparisonRow label="Drivetrain" v1={specs1?.specs.overview.drivetrain} v2={specs2?.specs.overview.drivetrain} />
                <ComparisonRow label="Transmission" v1={specs1?.specs.overview.transmission} v2={specs2?.specs.overview.transmission} />
                <ComparisonRow label="Seating" v1={specs1?.specs.overview.seating} v2={specs2?.specs.overview.seating} />
                <ComparisonRow label="Warranty" v1={specs1?.specs.overview.warranty} v2={specs2?.specs.overview.warranty} />

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

            <ComparisonSection
              title="Trim & Options"
              sectionKey="trim"
              expanded={expandedSections.trim}
              onToggle={() => toggleSection('trim')}
            >
              <div className="grid grid-cols-2 divide-x divide-slate-200">
                <div className="p-4">
                  {v1.trim_options && v1.trim_options.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <h4 className="font-semibold text-sm text-slate-700 mb-2">Select Trim</h4>
                      {v1.trim_options.map((trim) => (
                        <button
                          key={trim.name}
                          onClick={() => setSelectedTrims([trim.name, selectedTrims[1]])}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedTrims[0] === trim.name
                              ? 'border-slate-900 bg-slate-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{trim.name}</span>
                            <span className="text-sm">{trim.price_adjustment > 0 ? `+$${trim.price_adjustment.toLocaleString()}` : 'Base'}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {v1.pack_options && v1.pack_options.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-slate-700">Option Packs</h4>
                      {v1.pack_options.map((pack: PackOption) => (
                        <button
                          key={pack.name}
                          onClick={() => togglePack(0, pack.name)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedPackIds[0].includes(pack.name)
                              ? 'border-slate-900 bg-slate-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{pack.name}</span>
                            <span className="text-sm font-bold">+${pack.price_adjustment.toLocaleString()}</span>
                          </div>
                          {pack.options && pack.options.length > 0 && (
                            <div className="text-xs text-slate-600">
                              {pack.options.slice(0, 3).map((opt, idx) => (
                                <span key={idx}>• {opt.name} </span>
                              ))}
                              {pack.options.length > 3 && <span className="italic">+{pack.options.length - 3} more</span>}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4">
                  {v2.trim_options && v2.trim_options.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <h4 className="font-semibold text-sm text-slate-700 mb-2">Select Trim</h4>
                      {v2.trim_options.map((trim) => (
                        <button
                          key={trim.name}
                          onClick={() => setSelectedTrims([selectedTrims[0], trim.name])}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedTrims[1] === trim.name
                              ? 'border-slate-900 bg-slate-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{trim.name}</span>
                            <span className="text-sm">{trim.price_adjustment > 0 ? `+$${trim.price_adjustment.toLocaleString()}` : 'Base'}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {v2.pack_options && v2.pack_options.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-slate-700">Option Packs</h4>
                      {v2.pack_options.map((pack: PackOption) => (
                        <button
                          key={pack.name}
                          onClick={() => togglePack(1, pack.name)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedPackIds[1].includes(pack.name)
                              ? 'border-slate-900 bg-slate-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{pack.name}</span>
                            <span className="text-sm font-bold">+${pack.price_adjustment.toLocaleString()}</span>
                          </div>
                          {pack.options && pack.options.length > 0 && (
                            <div className="text-xs text-slate-600">
                              {pack.options.slice(0, 3).map((opt, idx) => (
                                <span key={idx}>• {opt.name} </span>
                              ))}
                              {pack.options.length > 3 && <span className="italic">+{pack.options.length - 3} more</span>}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ComparisonSection>

            <ComparisonSection
              title="Efficiency"
              sectionKey="efficiency"
              expanded={expandedSections.efficiency}
              onToggle={() => toggleSection('efficiency')}
            >
              <ComparisonRow label="Fuel Economy" v1={specs1?.specs.efficiency.fuelEconomy} v2={specs2?.specs.efficiency.fuelEconomy} />
              <ComparisonRow label="Real-World Estimate" v1={specs1?.specs.efficiency.realWorldEstimate} v2={specs2?.specs.efficiency.realWorldEstimate} />
              <ComparisonRow label="Fuel Tank" v1={specs1?.specs.efficiency.fuelTank} v2={specs2?.specs.efficiency.fuelTank} />
              <ComparisonRow label="Estimated Range" v1={specs1?.specs.efficiency.estimatedRange} v2={specs2?.specs.efficiency.estimatedRange} />
              <ComparisonRow label="Service Interval" v1={specs1?.specs.efficiency.serviceInterval} v2={specs2?.specs.efficiency.serviceInterval} />
              <ComparisonRow label="Annual Running Cost" v1={specs1?.specs.efficiency.annualRunningCost} v2={specs2?.specs.efficiency.annualRunningCost} />
            </ComparisonSection>

            <ComparisonSection
              title="Performance"
              sectionKey="performance"
              expanded={expandedSections.performance}
              onToggle={() => toggleSection('performance')}
            >
              <ComparisonRow label="Power" v1={specs1?.specs.performance.power} v2={specs2?.specs.performance.power} />
              <ComparisonRow label="Torque" v1={specs1?.specs.performance.torque} v2={specs2?.specs.performance.torque} />
              <ComparisonRow label="0-100 km/h" v1={specs1?.specs.performance.zeroToHundred} v2={specs2?.specs.performance.zeroToHundred} />
              <ComparisonRow label="Top Speed" v1={specs1?.specs.performance.topSpeed} v2={specs2?.specs.performance.topSpeed} />
              <ComparisonRow label="Weight" v1={specs1?.specs.performance.weight} v2={specs2?.specs.performance.weight} />
              <ComparisonRow label="Power to Weight" v1={specs1?.specs.performance.powerToWeight} v2={specs2?.specs.performance.powerToWeight} />
              <ComparisonRow label="Engine" v1={specs1?.specs.performance.engine} v2={specs2?.specs.performance.engine} />
              <ComparisonRow label="Suspension" v1={specs1?.specs.performance.suspension} v2={specs2?.specs.performance.suspension} />
            </ComparisonSection>

            <ComparisonSection
              title="Connectivity"
              sectionKey="connectivity"
              expanded={expandedSections.connectivity}
              onToggle={() => toggleSection('connectivity')}
            >
              <ComparisonRow label="Screen Size" v1={specs1?.specs.connectivity.screenSize} v2={specs2?.specs.connectivity.screenSize} />
              <ComparisonRow label="Digital Cluster" v1={specs1?.specs.connectivity.digitalCluster} v2={specs2?.specs.connectivity.digitalCluster} />
              <ComparisonRow label="Apple CarPlay" v1={specs1?.specs.connectivity.appleCarPlay} v2={specs2?.specs.connectivity.appleCarPlay} />
              <ComparisonRow label="Android Auto" v1={specs1?.specs.connectivity.androidAuto} v2={specs2?.specs.connectivity.androidAuto} />
              <ComparisonRow label="Wireless Charging" v1={specs1?.specs.connectivity.wirelessCharging} v2={specs2?.specs.connectivity.wirelessCharging} />
              <ComparisonRow label="Sound System" v1={specs1?.specs.connectivity.soundSystem} v2={specs2?.specs.connectivity.soundSystem} />
              <ComparisonRow label="App Support" v1={specs1?.specs.connectivity.appSupport} v2={specs2?.specs.connectivity.appSupport} />
              <ComparisonRow label="OTA Updates" v1={specs1?.specs.connectivity.otaUpdates} v2={specs2?.specs.connectivity.otaUpdates} />
            </ComparisonSection>

            <ComparisonSection
              title="Safety"
              sectionKey="safety"
              expanded={expandedSections.safety}
              onToggle={() => toggleSection('safety')}
            >
              <ComparisonRow label="ANCAP Rating" v1={specs1?.specs.safety.ancapRating} v2={specs2?.specs.safety.ancapRating} />
              <ComparisonRow label="Airbags" v1={specs1?.specs.safety.airbags} v2={specs2?.specs.safety.airbags} />
              <ComparisonRow label="AEB" v1={specs1?.specs.safety.aeb} v2={specs2?.specs.safety.aeb} />
              <ComparisonRow label="Lane Keep Assist" v1={specs1?.specs.safety.laneKeepAssist} v2={specs2?.specs.safety.laneKeepAssist} />
              <ComparisonRow label="Adaptive Cruise" v1={specs1?.specs.safety.adaptiveCruise} v2={specs2?.specs.safety.adaptiveCruise} />
              <ComparisonRow label="Blind Spot Monitor" v1={specs1?.specs.safety.blindSpotMonitoring} v2={specs2?.specs.safety.blindSpotMonitoring} />
              <ComparisonRow label="Rear Cross Traffic" v1={specs1?.specs.safety.rearCrossTraffic} v2={specs2?.specs.safety.rearCrossTraffic} />
            </ComparisonSection>
          </>
        )}
      </div>
    </div>
  );
}

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
  disabled
}: {
  title: string;
  vehicle: Vehicle | null;
  filters: Filters;
  setFilters: (filters: Filters) => void;
  filteredVehicles: Vehicle[];
  makes: string[];
  models: string[];
  bodyTypes: string[];
  fuelTypes: string[];
  onSelectVehicle: (vehicle: Vehicle | null) => void;
  disabled: boolean;
}) {
  const clearFilters = () => {
    setFilters({
      search: '',
      make: '',
      model: '',
      bodyType: '',
      fuelType: '',
      budgetMin: 0,
      budgetMax: 250000,
    });
  };

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

  if (vehicle) {
    return (
      <div className="bg-white rounded-lg border-2 border-slate-900 min-h-[600px] flex flex-col overflow-hidden">
        <div className="sticky top-0 bg-white z-10 border-b border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-900 truncate">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h3>
              <p className="text-sm text-slate-600">{vehicle.body_type}</p>
            </div>
            <button
              onClick={() => onSelectVehicle(null)}
              className="ml-3 px-3 py-1.5 text-sm rounded-lg border border-slate-300 hover:bg-slate-50 flex-shrink-0"
            >
              Change
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="p-6">
            <div className="aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden mb-4">
              {vehicle.image_url ? (
                <img src={vehicle.image_url} alt={`${vehicle.make} ${vehicle.model}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">No Image</div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Starting Price</p>
                <p className="text-3xl font-bold text-slate-900">
                  ${(vehicle.base_price || vehicle.price || 0).toLocaleString()}
                </p>
              </div>

              {vehicle.trim_options && vehicle.trim_options.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Available Trims</p>
                  <div className="space-y-1">
                    {vehicle.trim_options.map(trim => (
                      <div key={trim.name} className="text-sm text-slate-600 flex justify-between">
                        <span>{trim.name}</span>
                        <span>{trim.price_adjustment > 0 ? `+$${trim.price_adjustment.toLocaleString()}` : 'Base'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
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
              {makes.map(make => (
                <option key={make} value={make}>{make}</option>
              ))}
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
              {models.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
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
              {bodyTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
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
              {fuelTypes.map(fuel => (
                <option key={fuel} value={fuel}>{fuel}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600">{filteredVehicles.length} found</span>
          <button onClick={clearFilters} className="text-slate-900 hover:text-slate-700 font-medium">
            Clear
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredVehicles.map(v => {
          const price = v.base_price || v.price || 0;
          return (
            <button
              key={v.id}
              onClick={() => onSelectVehicle(v)}
              className="w-full flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-900 hover:shadow-md transition-all text-left"
            >
              <div className="w-20 h-14 bg-slate-100 rounded overflow-hidden flex-shrink-0">
                {v.image_url && (
                  <img src={v.image_url} alt={`${v.make} ${v.model}`} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 text-sm truncate">
                  {v.year} {v.make} {v.model}
                </h3>
                <p className="text-xs text-slate-600">{v.body_type} • {v.fuel_type}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900 text-sm">${price.toLocaleString()}</p>
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

function VehicleHeader({
  vehicle,
  price,
  trimName,
  inGarage,
  onToggleGarage,
  onRemove,
  user
}: {
  vehicle: Vehicle;
  price: number;
  trimName?: string;
  inGarage: boolean;
  onToggleGarage: () => void;
  onRemove?: () => void;
  user: any;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden h-full flex flex-col">
      <div className="aspect-[16/9] bg-slate-100 overflow-hidden">
        {vehicle.image_url ? (
          <img src={vehicle.image_url} alt={`${vehicle.make} ${vehicle.model}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">No Image</div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col justify-end">
        <div className="flex gap-2">
          {user && (
            <button
              onClick={onToggleGarage}
              className={`flex-1 px-3 py-2 rounded-lg border-2 font-medium transition-all flex items-center justify-center gap-2 text-sm ${
                inGarage
                  ? 'border-red-500 text-red-600 hover:bg-red-50'
                  : 'border-slate-900 text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Heart className={`w-4 h-4 ${inGarage ? 'fill-red-500' : ''}`} />
              {inGarage ? 'Remove' : 'Add to Garage'}
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="px-3 py-2 rounded-lg border-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2 text-sm"
            >
              <X className="w-4 h-4" />
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ComparisonSection({ title, sectionKey, expanded, onToggle, children }: any) {
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

function ComparisonRow({ label, v1, v2 }: { label: string; v1: any; v2: any }) {
  const val1 = v1?.toString() || 'N/A';
  const val2 = v2 ? v2.toString() : 'N/A';
  const isDifferent = v1 && v2 && val1 !== val2;

  return (
    <div className="grid grid-cols-[200px_1fr_1fr] divide-x divide-slate-200 border-b border-slate-200 last:border-b-0">
      <div className="p-4 bg-slate-50 font-medium text-slate-700">{label}</div>
      <div className={`p-4 ${isDifferent ? 'bg-yellow-50' : ''}`}>
        {val1}
      </div>
      <div className={`p-4 ${isDifferent ? 'bg-yellow-50' : ''}`}>
        {val2}
      </div>
    </div>
  );
}

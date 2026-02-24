import { useMemo, useState, useEffect } from 'react';
import { Search, Plus, Minus, Check } from 'lucide-react';
import { structuredVehicles } from '../data/structuredVehicles';
import { addToGarage, removeFromGarage, isInGarage } from '../lib/session';
import { AdvancedFilters, defaultAdvancedFilters, matchesAdvancedFilters } from '../lib/advancedFilters';
import { AdvancedFiltersPanel } from './filters/AdvancedFiltersPanel';
import { STORAGE_KEYS } from '../lib/storageKeys';
import { getDisplayProps } from './compare/utils/display';

interface Filters {
  search: string;
  make: string;
  model: string;
  bodyType: string;
  fuelType: string;
  budgetMin: number;
  budgetMax: number;
}

export default function Discovery() {
  const [garageItems, setGarageItems] = useState<string[]>([]);
  const [compareList, setCompareList] = useState<string[]>([]);

  const [filters, setFilters] = useState<Filters>({
    search: '',
    make: '',
    model: '',
    bodyType: '',
    fuelType: '',
    budgetMin: 0,
    budgetMax: 250000,
  });
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(defaultAdvancedFilters);

  useEffect(() => {
    loadGarageState();
    loadCompareState();
  }, []);

  const loadGarageState = () => {
    const garage = localStorage.getItem(STORAGE_KEYS.garageItems);
    setGarageItems(garage ? JSON.parse(garage) : []);
  };

  const loadCompareState = () => {
    const compare = localStorage.getItem(STORAGE_KEYS.compareList);
    setCompareList(compare ? JSON.parse(compare) : []);
  };

  const makes = Array.from(new Set(structuredVehicles.map(v => v.make))).sort();
  const models = Array.from(new Set(
    structuredVehicles
      .filter(v => !filters.make || v.make === filters.make)
      .map(v => v.model)
  )).sort();
  const bodyTypes = Array.from(new Set(
    structuredVehicles.map(v => v.trims[0]?.specs.overview.bodyType).filter(Boolean)
  )).sort() as string[];
  const fuelTypes = Array.from(new Set(
    structuredVehicles.map(v => v.trims[0]?.specs.overview.fuelType).filter(Boolean)
  )).sort() as string[];

  const filteredVehicles = useMemo(() => {
    let filtered = [...structuredVehicles];

    if (filters.search) {
      const s = filters.search.toLowerCase();
      filtered = filtered.filter(v =>
        v.make.toLowerCase().includes(s) ||
        v.model.toLowerCase().includes(s) ||
        v.tags?.some(tag => tag.toLowerCase().includes(s)) ||
        v.aiSummary?.toLowerCase().includes(s)
      );
    }

    if (filters.make) filtered = filtered.filter(v => v.make === filters.make);
    if (filters.model) filtered = filtered.filter(v => v.model === filters.model);
    if (filters.bodyType) filtered = filtered.filter(v => getDisplayProps(v).bodyType === filters.bodyType);
    if (filters.fuelType) filtered = filtered.filter(v => getDisplayProps(v).fuelType === filters.fuelType);

    filtered = filtered.filter(v => {
      const price = getDisplayProps(v).basePrice;
      return price >= filters.budgetMin && price <= filters.budgetMax;
    });

    filtered = filtered.filter(v => matchesAdvancedFilters(v, advancedFilters));

    return filtered;
  }, [filters, advancedFilters]);

  const toggleGarage = (vehicleId: string) => {
    if (isInGarage(vehicleId)) {
      removeFromGarage(vehicleId);
    } else {
      addToGarage(vehicleId);
    }
    loadGarageState();
    window.dispatchEvent(new Event('garage-updated'));
  };

  const toggleCompare = (vehicleId: string) => {
    const isRemoving = compareList.includes(vehicleId);
    const newCompareList = isRemoving
      ? compareList.filter(id => id !== vehicleId)
      : [...compareList, vehicleId].slice(0, 2);

    setCompareList(newCompareList);
    localStorage.setItem(STORAGE_KEYS.compareList, JSON.stringify(newCompareList));

    if (!isRemoving && newCompareList.length >= 1) {
      setTimeout(() => {
        window.dispatchEvent(new Event('navigate-compare'));
      }, 300);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-2">
          <h1 className="text-4xl font-bold text-slate-900 mb-0">Discover Your Perfect Car</h1>
          <p className="text-lg text-slate-600">Explore our curated selection and find what drives you</p>
        </div>

        <div className="mb-2 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by make, model, or features..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="mb-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Make</label>
              <select
                value={filters.make}
                onChange={(e) => setFilters({ ...filters, make: e.target.value, model: '' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">All Makes</option>
                {makes.map(make => (
                  <option key={make} value={make}>{make}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
              <select
                value={filters.model}
                onChange={(e) => setFilters({ ...filters, model: e.target.value })}
                disabled={!filters.make}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="">All Models</option>
                {models.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Body Type</label>
              <select
                value={filters.bodyType}
                onChange={(e) => setFilters({ ...filters, bodyType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">All Types</option>
                {bodyTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fuel Type</label>
              <select
                value={filters.fuelType}
                onChange={(e) => setFilters({ ...filters, fuelType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">All Fuels</option>
                {fuelTypes.map(fuel => (
                  <option key={fuel} value={fuel}>{fuel}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Budget</label>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Min</label>
                <input
                  type="number"
                  value={filters.budgetMin}
                  onChange={(e) => setFilters({ ...filters, budgetMin: Math.min(Number(e.target.value), filters.budgetMax) })}
                  min="0"
                  max="250000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Max</label>
                <input
                  type="number"
                  value={filters.budgetMax}
                  onChange={(e) => setFilters({ ...filters, budgetMax: Math.max(Number(e.target.value), filters.budgetMin) })}
                  min="0"
                  max="250000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="px-2">
              <div className="relative h-2 bg-slate-200 rounded-full">
                <div
                  className="absolute h-2 bg-slate-900 rounded-full"
                  style={{
                    left: `${(filters.budgetMin / 250000) * 100}%`,
                    right: `${100 - (filters.budgetMax / 250000) * 100}%`,
                  }}
                />
                <input
                  type="range"
                  min="0"
                  max="250000"
                  step="5000"
                  value={filters.budgetMin}
                  onChange={(e) => setFilters({ ...filters, budgetMin: Math.min(parseInt(e.target.value), filters.budgetMax) })}
                  className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-slate-900 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
                  style={{ zIndex: filters.budgetMin > filters.budgetMax - 10000 ? 5 : 3 }}
                />
                <input
                  type="range"
                  min="0"
                  max="250000"
                  step="5000"
                  value={filters.budgetMax}
                  onChange={(e) => setFilters({ ...filters, budgetMax: Math.max(parseInt(e.target.value), filters.budgetMin) })}
                  className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-slate-900 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
                  style={{ zIndex: 4 }}
                />
              </div>
            </div>
          </div>

          <div className="mt-3">
            <AdvancedFiltersPanel
              value={advancedFilters}
              onChange={setAdvancedFilters}
              onClear={() => setAdvancedFilters(defaultAdvancedFilters)}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 mt-2">
            <p className="text-sm text-slate-600">
              {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''} found
            </p>
            <button
              onClick={() => {
                setFilters({
                  search: '',
                  make: '',
                  model: '',
                  bodyType: '',
                  fuelType: '',
                  budgetMin: 0,
                  budgetMax: 250000,
                });
                setAdvancedFilters(defaultAdvancedFilters);
              }}
              className="text-sm text-slate-900 hover:text-slate-700 font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((vehicle) => {
            const inGarage = garageItems.includes(vehicle.id);
            const inCompare = compareList.includes(vehicle.id);
            const { basePrice, imageUrl } = getDisplayProps(vehicle);

            return (
              <div key={vehicle.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
                <div
                  className="aspect-[2/1] bg-slate-100 relative overflow-hidden cursor-pointer"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('view-vehicle', { detail: { vehicleId: vehicle.id } }));
                  }}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      No Image
                    </div>
                  )}
                  {vehicle.tags && vehicle.tags.length > 0 && (
                    <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                      {vehicle.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-medium text-slate-700 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-slate-900">
                        ${basePrice.toLocaleString()}
                      </p>
                      {vehicle.trims.length > 1 && (
                        <p className="text-xs text-slate-500">+ options</p>
                      )}
                    </div>
                  </div>

                  {vehicle.aiSummary && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{vehicle.aiSummary}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleGarage(vehicle.id)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        inGarage
                          ? 'bg-slate-900 text-white hover:bg-slate-800'
                          : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {inGarage ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {inGarage ? 'In Garage' : 'Add to Garage'}
                    </button>
                    <button
                      onClick={() => toggleCompare(vehicle.id)}
                      disabled={compareList.length >= 2 && !inCompare}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        inCompare
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                          : compareList.length >= 2
                          ? 'border border-slate-200 text-slate-400 cursor-not-allowed'
                          : 'border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-900'
                      }`}
                    >
                      {inCompare ? (
                        <span className="flex items-center gap-1">
                          <Check className="w-4 h-4" /> Car {compareList.indexOf(vehicle.id) === 0 ? 'A' : 'B'}
                        </span>
                      ) : (
                        'Compare'
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('view-vehicle', { detail: { vehicleId: vehicle.id } }));
                    }}
                    className="block w-full mt-3 text-center text-sm text-slate-600 hover:text-slate-900 font-medium"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredVehicles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-slate-600">No vehicles found matching your criteria</p>
            <p className="text-sm text-slate-500 mt-2">Try adjusting your filters to see more results</p>
          </div>
        )}
      </div>
    </div>
  );
}

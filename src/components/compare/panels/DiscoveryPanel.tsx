import { Search } from 'lucide-react';
import { StructuredVehicle } from '../../../types/specs';
import { Filters } from '../types';
import { getDisplayProps } from '../utils/display';
import { AdvancedFilters, defaultAdvancedFilters } from '../../../lib/advancedFilters';
import { AdvancedFiltersPanel } from '../../filters/AdvancedFiltersPanel';

export function DiscoveryPanel({
  title,
  vehicle: _vehicle,
  filters,
  setFilters,
  advancedFilters,
  setAdvancedFilters,
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
  advancedFilters: AdvancedFilters;
  setAdvancedFilters: (f: AdvancedFilters) => void;
  filteredVehicles: StructuredVehicle[];
  makes: string[];
  models: string[];
  bodyTypes: string[];
  fuelTypes: string[];
  onSelectVehicle: (v: StructuredVehicle | null) => void;
  disabled: boolean;
}) {
  const clearFilters = () => {
    setFilters({ search: '', make: '', model: '', bodyType: '', fuelType: '' });
    setAdvancedFilters(defaultAdvancedFilters);
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

        <div className="mb-3">
          <AdvancedFiltersPanel
            value={advancedFilters}
            onChange={setAdvancedFilters}
            onClear={() => setAdvancedFilters(defaultAdvancedFilters)}
          />
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

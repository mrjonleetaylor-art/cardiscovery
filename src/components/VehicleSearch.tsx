import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Vehicle } from '../types';

interface VehicleSearchProps {
  onCompare: (vehicles: Vehicle[]) => void;
  onViewGarage: () => void;
  onViewVehicle: (make: string, model: string) => void;
}

interface MakeModelMap {
  [make: string]: string[];
}

interface GroupedVehicle {
  make: string;
  model: string;
  year: number;
  basePrice: number;
  maxPrice: number;
  trimCount: number;
  image_url: string | null;
  fuel_type: string;
  trims: Vehicle[];
}

export const VehicleSearch: React.FC<VehicleSearchProps> = ({ onViewVehicle }) => {
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(250000);
  const [fuelType, setFuelType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupedVehicles, setGroupedVehicles] = useState<GroupedVehicle[]>([]);
  const [makeModelMap, setMakeModelMap] = useState<MakeModelMap>({});
  const [availableMakes, setAvailableMakes] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableFuelTypes, setAvailableFuelTypes] = useState<string[]>([]);

  useEffect(() => {
    loadAllVehicles();
  }, []);

  useEffect(() => {
    filterVehicles();
  }, [make, model, priceMin, priceMax, fuelType, searchQuery, allVehicles]);

  useEffect(() => {
    if (make && makeModelMap[make]) {
      setAvailableModels(makeModelMap[make]);
      if (model && !makeModelMap[make].includes(model)) {
        setModel('');
      }
    } else {
      setAvailableModels([]);
      setModel('');
    }
  }, [make, makeModelMap]);

  useEffect(() => {
    updateAvailableFuelTypes();
  }, [make, model, allVehicles]);

  const loadAllVehicles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('make', { ascending: true });

      if (error) throw error;

      const vehicleData = data || [];
      setAllVehicles(vehicleData);

      const makeModel: MakeModelMap = {};
      vehicleData.forEach(vehicle => {
        if (!makeModel[vehicle.make]) {
          makeModel[vehicle.make] = [];
        }
        if (!makeModel[vehicle.make].includes(vehicle.model)) {
          makeModel[vehicle.make].push(vehicle.model);
        }
      });

      setMakeModelMap(makeModel);
      setAvailableMakes(Object.keys(makeModel).sort());
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAvailableFuelTypes = () => {
    let filtered = [...allVehicles];

    if (make) {
      filtered = filtered.filter(v => v.make === make);
    }

    if (model) {
      filtered = filtered.filter(v => v.model === model);
    }

    const fuelTypesSet = new Set<string>();
    filtered.forEach(vehicle => {
      if (vehicle.fuel_type) {
        fuelTypesSet.add(vehicle.fuel_type);
      }
    });

    const sortedFuelTypes = Array.from(fuelTypesSet).sort();
    setAvailableFuelTypes(sortedFuelTypes);

    if (fuelType && !sortedFuelTypes.includes(fuelType)) {
      setFuelType('');
    }
  };

  const filterVehicles = () => {
    let filtered = [...allVehicles];

    if (make) {
      filtered = filtered.filter(v => v.make === make);
    }

    if (model) {
      filtered = filtered.filter(v => v.model === model);
    }

    if (priceMin > 0) {
      filtered = filtered.filter(v => v.price && v.price >= priceMin);
    }

    if (priceMax < 250000) {
      filtered = filtered.filter(v => v.price && v.price <= priceMax);
    }

    if (fuelType) {
      filtered = filtered.filter(v => v.fuel_type === fuelType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(v => {
        const searchableText = [
          v.make,
          v.model,
          v.trim,
          v.year?.toString(),
          v.transmission,
          v.engine,
          v.fuel_type,
          v.exterior_color,
          v.interior_color,
          ...(v.features || [])
        ].filter(Boolean).join(' ').toLowerCase();

        return searchableText.includes(query);
      });
    }

    const grouped = filtered.reduce((acc, vehicle) => {
      const key = `${vehicle.make}-${vehicle.model}`;
      if (!acc[key]) {
        acc[key] = {
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year || 0,
          basePrice: vehicle.price || 0,
          maxPrice: vehicle.price || 0,
          trimCount: 0,
          image_url: vehicle.image_url ?? null,
          fuel_type: vehicle.fuel_type || '',
          trims: []
        };
      }
      acc[key].trims.push(vehicle);
      acc[key].trimCount = acc[key].trims.length;
      if (vehicle.price) {
        acc[key].basePrice = Math.min(acc[key].basePrice, vehicle.price);
        acc[key].maxPrice = Math.max(acc[key].maxPrice, vehicle.price);
      }
      return acc;
    }, {} as Record<string, GroupedVehicle>);

    setGroupedVehicles(Object.values(grouped));
  };

  const handlePriceMinChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setPriceMin(Math.min(numValue, priceMax));
  };

  const handlePriceMaxChange = (value: string) => {
    const numValue = parseInt(value) || 250000;
    setPriceMax(Math.max(numValue, priceMin));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Search New Vehicles</h1>

          <div className="bg-white rounded-lg p-6 shadow-md mb-8">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by make, model, features, color..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Make</label>
                <select
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Makes</option>
                  {availableMakes.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={!make}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">All Models</option>
                  {availableModels.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fuel Type</label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={availableFuelTypes.length === 0}
                >
                  <option value="">All Fuel Types</option>
                  {availableFuelTypes.map(ft => (
                    <option key={ft} value={ft}>{ft.charAt(0).toUpperCase() + ft.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-4">Budget</label>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Min</label>
                  <input
                    type="number"
                    value={priceMin}
                    onChange={(e) => handlePriceMinChange(e.target.value)}
                    min="0"
                    max="250000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Max</label>
                  <input
                    type="number"
                    value={priceMax === 250000 ? '250000+' : priceMax}
                    onChange={(e) => handlePriceMaxChange(e.target.value)}
                    min="0"
                    max="250000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="px-2">
                <div className="relative h-2 bg-gray-200 rounded-full">
                  <div
                    className="absolute h-2 bg-blue-600 rounded-full"
                    style={{
                      left: `${(priceMin / 250000) * 100}%`,
                      right: `${100 - (priceMax / 250000) * 100}%`,
                    }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="250000"
                    step="5000"
                    value={priceMin}
                    onChange={(e) => setPriceMin(Math.min(parseInt(e.target.value), priceMax))}
                    className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
                    style={{ zIndex: priceMin > priceMax - 10000 ? 5 : 3 }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="250000"
                    step="5000"
                    value={priceMax}
                    onChange={(e) => setPriceMax(Math.max(parseInt(e.target.value), priceMin))}
                    className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
                    style={{ zIndex: 4 }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                {groupedVehicles.length} vehicle{groupedVehicles.length !== 1 ? 's' : ''} found
              </p>
              <button
                onClick={() => {
                  setMake('');
                  setModel('');
                  setPriceMin(0);
                  setPriceMax(250000);
                  setFuelType('');
                  setSearchQuery('');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {groupedVehicles.map(group => (
              <div
                key={`${group.make}-${group.model}`}
                onClick={() => onViewVehicle(group.make, group.model)}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all overflow-hidden cursor-pointer group"
              >
                <div className="h-64 bg-gray-200 relative">
                  {group.image_url && (
                    <img
                      src={group.image_url}
                      alt={`${group.year} ${group.make} ${group.model}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-2xl font-bold">
                      {group.year} {group.make} {group.model}
                    </h3>
                    <p className="text-sm opacity-90 capitalize">{group.fuel_type}</p>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Starting at</p>
                      <p className="text-3xl font-bold text-blue-600">
                        ${group.basePrice.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                      {group.trimCount} trim{group.trimCount !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-3 px-4 rounded-lg font-medium transition-colors group-hover:bg-blue-600 group-hover:text-white">
                    View Trim Levels
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && groupedVehicles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg mb-2">No vehicles found</p>
            <p className="text-gray-500 text-sm">Try adjusting your filters to see more results</p>
          </div>
        )}
      </div>
    </div>
  );
};

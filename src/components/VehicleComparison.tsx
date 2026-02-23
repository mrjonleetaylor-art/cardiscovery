import React, { useState, useEffect } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { Vehicle } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './Auth/AuthContext';

interface VehicleComparisonProps {
  vehicles: Vehicle[];
  onBack: () => void;
}

export const VehicleComparison: React.FC<VehicleComparisonProps> = ({ vehicles, onBack }) => {
  const { user } = useAuth();
  const [displayVehicles, setDisplayVehicles] = useState(vehicles);

  useEffect(() => {
    if (user && vehicles.length > 0) {
      saveComparison();
    }
  }, []);

  const saveComparison = async () => {
    if (!user) return;

    try {
      await supabase.from('vehicle_comparisons').insert([
        {
          user_id: user.id,
          vehicle_ids: vehicles.map(v => v.id),
        },
      ]);
    } catch (error) {
      console.error('Error saving comparison:', error);
    }
  };

  const removeVehicle = (id: string) => {
    setDisplayVehicles(prev => prev.filter(v => v.id !== id));
  };

  if (displayVehicles.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-8"
          >
            <ArrowLeft size={20} />
            Back to Search
          </button>
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No vehicles selected for comparison.</p>
          </div>
        </div>
      </div>
    );
  }

  const allFeatures = new Set<string>();
  displayVehicles.forEach(vehicle => {
    if (vehicle.features) {
      vehicle.features.forEach(feature => allFeatures.add(feature));
    }
  });

  const specs = [
    { key: 'price', label: 'Price', format: (v: any) => v ? `$${v.toLocaleString()}` : 'N/A' },
    { key: 'mileage', label: 'Mileage', format: (v: any) => v !== null && v !== undefined ? `${v.toLocaleString()} miles` : 'N/A' },
    { key: 'transmission', label: 'Transmission' },
    { key: 'engine', label: 'Engine' },
    { key: 'fuel_type', label: 'Fuel Type', format: (v: any) => v ? v.charAt(0).toUpperCase() + v.slice(1) : 'N/A' },
    { key: 'exterior_color', label: 'Exterior Color' },
    { key: 'interior_color', label: 'Interior Color' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-8"
        >
          <ArrowLeft size={20} />
          Back to Search
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Compare Vehicles</h1>

        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 bg-gray-50 sticky left-0 z-10 min-w-[150px]">
                  Specification
                </th>
                {displayVehicles.map(vehicle => (
                  <th key={vehicle.id} className="px-4 py-4 text-left min-w-[200px]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold text-gray-900">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </p>
                        {vehicle.trim && (
                          <p className="text-sm text-gray-600">{vehicle.trim}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeVehicle(vehicle.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {specs.map((spec, idx) => (
                <tr key={spec.key} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="px-4 py-4 text-sm font-medium text-gray-700 bg-gray-50 sticky left-0 z-10">
                    {spec.label}
                  </td>
                  {displayVehicles.map(vehicle => (
                    <td key={vehicle.id} className="px-4 py-4 text-sm text-gray-900">
                      {spec.format
                        ? spec.format((vehicle as any)[spec.key])
                        : (vehicle as any)[spec.key] || 'N/A'}
                    </td>
                  ))}
                </tr>
              ))}

              {allFeatures.size > 0 && (
                <tr className="bg-gray-50">
                  <td colSpan={displayVehicles.length + 1} className="px-4 py-4">
                    <p className="font-semibold text-gray-900 mb-4">Features</p>
                  </td>
                </tr>
              )}

              {Array.from(allFeatures).map((feature, idx) => (
                <tr key={`feature-${feature}`} className={idx % 2 === 0 ? '' : 'bg-gray-50'}>
                  <td className="px-4 py-4 text-sm text-gray-700 bg-gray-50 sticky left-0 z-10">
                    {feature}
                  </td>
                  {displayVehicles.map(vehicle => (
                    <td key={vehicle.id} className="px-4 py-4 text-sm">
                      {vehicle.features?.includes(feature) ? (
                        <span className="text-green-600 font-bold">✓</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

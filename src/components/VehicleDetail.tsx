import React, { useState, useEffect } from 'react';
import { Heart, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Vehicle } from '../types';
import { useAuth } from './Auth/AuthContext';

interface VehicleDetailProps {
  make: string;
  model: string;
  onBack: () => void;
  onCompare: (vehicles: Vehicle[]) => void;
}

export const VehicleDetail: React.FC<VehicleDetailProps> = ({ make, model, onBack, onCompare }) => {
  const { user } = useAuth();
  const [trims, setTrims] = useState<Vehicle[]>([]);
  const [selectedTrim, setSelectedTrim] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [garageItems, setGarageItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTrims();
    if (user) {
      loadGarageItems();
    }
  }, [make, model, user]);

  const loadTrims = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('make', make)
        .eq('model', model)
        .order('price', { ascending: true });

      if (error) throw error;

      const vehicleData = data || [];
      setTrims(vehicleData);
      if (vehicleData.length > 0) {
        setSelectedTrim(vehicleData[0]);
      }
    } catch (error) {
      console.error('Error loading trims:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGarageItems = async () => {
    try {
      const { data, error } = await supabase
        .from('user_garage')
        .select('vehicle_id')
        .eq('user_id', user?.id);

      if (error) throw error;
      setGarageItems(new Set((data || []).map(item => item.vehicle_id)));
    } catch (error) {
      console.error('Error loading garage items:', error);
    }
  };

  const toggleGarage = async (vehicleId: string) => {
    if (!user) return;

    try {
      if (garageItems.has(vehicleId)) {
        await supabase
          .from('user_garage')
          .delete()
          .eq('vehicle_id', vehicleId)
          .eq('user_id', user.id);
        setGarageItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(vehicleId);
          return newSet;
        });
      } else {
        await supabase
          .from('user_garage')
          .insert([{ user_id: user.id, vehicle_id: vehicleId }]);
        setGarageItems(prev => new Set([...prev, vehicleId]));
      }
    } catch (error) {
      console.error('Error updating garage:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (trims.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            Back to Search
          </button>
          <p className="text-gray-600">Vehicle not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Search
        </button>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="relative">
              <div className="aspect-video bg-gray-200">
                {selectedTrim?.image_url && (
                  <img
                    src={selectedTrim.image_url}
                    alt={`${selectedTrim.year} ${selectedTrim.make} ${selectedTrim.model}`}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              {user && selectedTrim && (
                <button
                  onClick={() => toggleGarage(selectedTrim.id)}
                  className={`absolute top-4 right-4 p-3 rounded-lg transition-colors shadow-lg ${
                    garageItems.has(selectedTrim.id)
                      ? 'bg-red-100 text-red-600'
                      : 'bg-white text-gray-400 hover:text-red-600'
                  }`}
                >
                  <Heart size={24} fill={garageItems.has(selectedTrim.id) ? 'currentColor' : 'none'} />
                </button>
              )}
            </div>

            <div className="p-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {selectedTrim?.year} {make} {model}
              </h1>
              {selectedTrim?.trim && (
                <p className="text-xl text-gray-600 mb-6">{selectedTrim.trim}</p>
              )}

              {selectedTrim?.price && (
                <p className="text-4xl font-bold text-blue-600 mb-8">
                  ${selectedTrim.price.toLocaleString()}
                </p>
              )}

              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Trim Level</h3>
                <div className="space-y-3">
                  {trims.map(trim => (
                    <button
                      key={trim.id}
                      onClick={() => setSelectedTrim(trim)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedTrim?.id === trim.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{trim.trim}</p>
                          <p className="text-sm text-gray-600 mt-1">{trim.engine}</p>
                        </div>
                        <p className="font-bold text-gray-900">
                          ${trim.price?.toLocaleString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="grid grid-cols-2 gap-4">
                  {selectedTrim?.mileage !== null && selectedTrim?.mileage !== undefined && (
                    <div>
                      <p className="text-sm text-gray-600">Mileage</p>
                      <p className="font-semibold text-gray-900">
                        {selectedTrim.mileage.toLocaleString()} miles
                      </p>
                    </div>
                  )}
                  {selectedTrim?.transmission && (
                    <div>
                      <p className="text-sm text-gray-600">Transmission</p>
                      <p className="font-semibold text-gray-900">{selectedTrim.transmission}</p>
                    </div>
                  )}
                  {selectedTrim?.fuel_type && (
                    <div>
                      <p className="text-sm text-gray-600">Fuel Type</p>
                      <p className="font-semibold text-gray-900 capitalize">{selectedTrim.fuel_type}</p>
                    </div>
                  )}
                  {selectedTrim?.exterior_color && (
                    <div>
                      <p className="text-sm text-gray-600">Exterior Color</p>
                      <p className="font-semibold text-gray-900">{selectedTrim.exterior_color}</p>
                    </div>
                  )}
                  {selectedTrim?.interior_color && (
                    <div>
                      <p className="text-sm text-gray-600">Interior Color</p>
                      <p className="font-semibold text-gray-900">{selectedTrim.interior_color}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedTrim?.features && selectedTrim.features.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTrim.features.map((feature, idx) => (
                      <span
                        key={idx}
                        className="bg-gray-100 text-gray-700 text-sm px-3 py-2 rounded-lg"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => selectedTrim && onCompare([selectedTrim])}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
              >
                Compare with Other Vehicles
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

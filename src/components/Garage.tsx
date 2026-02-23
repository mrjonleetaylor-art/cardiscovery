import React, { useState, useEffect } from 'react';
import { Heart, Trash2, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GarageItem, Vehicle } from '../types';
import { useAuth } from './Auth/AuthContext';

interface GarageProps {
  onCompare: (vehicles: Vehicle[]) => void;
}

export const Garage: React.FC<GarageProps> = ({ onCompare }) => {
  const { user } = useAuth();
  const [garageItems, setGarageItems] = useState<GarageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (user) {
      loadGarageItems();
    }
  }, [user]);

  const loadGarageItems = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_garage')
        .select(`
          id,
          user_id,
          vehicle_id,
          notes,
          added_at,
          vehicles:vehicle_id(*)
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) throw error;

      setGarageItems((data || []).map(item => ({
        ...item,
        vehicle: item.vehicles,
      })) as any);
    } catch (error) {
      console.error('Error loading garage:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromGarage = async (id: string) => {
    try {
      await supabase.from('user_garage').delete().eq('id', id);
      setGarageItems(prev => prev.filter(item => item.id !== id));
      setSelectedItems(prev => prev.filter(itemId => itemId !== id));
    } catch (error) {
      console.error('Error removing from garage:', error);
    }
  };

  const updateNotes = async (id: string, notes: string) => {
    try {
      await supabase.from('user_garage').update({ notes }).eq('id', id);
      setGarageItems(prev =>
        prev.map(item => (item.id === id ? { ...item, notes } : item))
      );
      setEditingNotes(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const handleCompare = () => {
    const vehiclesToCompare = garageItems
      .filter(item => selectedItems.includes(item.id))
      .map(item => item.vehicle!)
      .filter((v): v is Vehicle => v !== undefined);

    if (vehiclesToCompare.length > 0) {
      onCompare(vehiclesToCompare);
    }
  };

  const toggleSelect = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Please sign in to view your garage.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Garage</h1>
          <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-medium">
            {garageItems.length} vehicle{garageItems.length !== 1 ? 's' : ''}
          </span>
        </div>

        {selectedItems.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <span className="text-sm text-gray-700">
              {selectedItems.length} vehicle{selectedItems.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleCompare}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Compare ({selectedItems.length})
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : garageItems.length === 0 ? (
          <div className="text-center py-12">
            <Heart size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg mb-4">Your garage is empty</p>
            <p className="text-gray-500 text-sm">
              Add vehicles from the search page to start building your garage
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {garageItems.map(item => (
              <div key={item.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-5 h-5 cursor-pointer mt-1"
                    />

                    <div className="flex-1">
                      {item.vehicle && (
                        <>
                          <h3 className="text-xl font-bold text-gray-900">
                            {item.vehicle.year} {item.vehicle.make} {item.vehicle.model}
                          </h3>
                          {item.vehicle.trim && (
                            <p className="text-gray-600 mb-3">{item.vehicle.trim}</p>
                          )}

                          <div className="grid md:grid-cols-3 gap-4 mb-4">
                            {item.vehicle.price && (
                              <div>
                                <p className="text-sm text-gray-600">Price</p>
                                <p className="text-lg font-bold text-blue-600">
                                  ${item.vehicle.price.toLocaleString()}
                                </p>
                              </div>
                            )}
                            {item.vehicle.mileage !== null && item.vehicle.mileage !== undefined && (
                              <div>
                                <p className="text-sm text-gray-600">Mileage</p>
                                <p className="text-lg font-bold text-gray-900">
                                  {item.vehicle.mileage.toLocaleString()} miles
                                </p>
                              </div>
                            )}
                            {item.vehicle.transmission && (
                              <div>
                                <p className="text-sm text-gray-600">Transmission</p>
                                <p className="text-lg font-bold text-gray-900">
                                  {item.vehicle.transmission}
                                </p>
                              </div>
                            )}
                          </div>

                          {item.vehicle.features && item.vehicle.features.length > 0 && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-700 mb-2">Key Features:</p>
                              <div className="flex flex-wrap gap-2">
                                {item.vehicle.features.slice(0, 5).map((feature, idx) => (
                                  <span key={idx} className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded">
                                    {feature}
                                  </span>
                                ))}
                                {item.vehicle.features.length > 5 && (
                                  <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded">
                                    +{item.vehicle.features.length - 5} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromGarage(item.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  {editingNotes[item.id] !== undefined ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingNotes[item.id]}
                        onChange={(e) =>
                          setEditingNotes(prev => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        rows={3}
                        placeholder="Add your notes about this vehicle..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            updateNotes(item.id, editingNotes[item.id])
                          }
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingNotes(prev => {
                              const newState = { ...prev };
                              delete newState[item.id];
                              return newState;
                            });
                          }}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {item.notes ? (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                            {item.notes}
                          </p>
                          <button
                            onClick={() =>
                              setEditingNotes(prev => ({
                                ...prev,
                                [item.id]: item.notes || '',
                              }))
                            }
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Edit Notes
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            setEditingNotes(prev => ({
                              ...prev,
                              [item.id]: '',
                            }))
                          }
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                        >
                          <Plus size={16} />
                          Add Notes
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

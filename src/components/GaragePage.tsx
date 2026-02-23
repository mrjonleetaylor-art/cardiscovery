import { useEffect, useState } from 'react';
import { Trash2, GitCompare, HelpCircle } from 'lucide-react';
import { StructuredVehicle } from '../types/specs';
import { UserPreferences } from '../types';
import { structuredVehicles } from '../data/structuredVehicles';
import { getGarageItems, removeFromGarage } from '../lib/session';
import { supabase } from '../lib/supabase';

export default function GaragePage() {
  const [vehicles, setVehicles] = useState<StructuredVehicle[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showQuestions, setShowQuestions] = useState(false);
  const [preferences, setPreferences] = useState<Partial<UserPreferences>>({
    monthly_kms: undefined,
    driving_type: 'city',
    can_charge_at_home: undefined,
    priority: 'reliability',
    timeline: '2-6 weeks',
  });

  useEffect(() => {
    loadGarageVehicles();
    loadPreferences();
  }, []);

  const loadGarageVehicles = () => {
    const garageIds = getGarageItems();
    setVehicles(structuredVehicles.filter(v => garageIds.includes(v.id)));
  };

  const loadPreferences = () => {
    const stored = localStorage.getItem('user_preferences');
    if (stored) {
      setPreferences(JSON.parse(stored));
    }
  };

  const savePreferences = async () => {
    localStorage.setItem('user_preferences', JSON.stringify(preferences));

    const sessionId = localStorage.getItem('session_id');
    if (sessionId) {
      await supabase.from('user_preferences').upsert({
        session_id: sessionId,
        ...preferences,
      });
    }

    setShowQuestions(false);
    alert('Preferences saved!');
  };

  const handleRemove = (vehicleId: string) => {
    removeFromGarage(vehicleId);
    setVehicles(vehicles.filter(v => v.id !== vehicleId));
    setSelectedIds(selectedIds.filter(id => id !== vehicleId));
    window.dispatchEvent(new Event('garage-updated'));
  };

  const toggleSelect = (vehicleId: string) => {
    setSelectedIds(prev =>
      prev.includes(vehicleId)
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  const handleCompare = () => {
    if (selectedIds.length === 2) {
      localStorage.setItem('compare_list', JSON.stringify(selectedIds));
      window.dispatchEvent(new Event('navigate-compare'));
    }
  };

  if (vehicles.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-900 mb-8">Your Garage</h1>
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Your garage is empty</h2>
            <p className="text-slate-600 mb-6">Start exploring and add vehicles to your garage</p>
            <button
              onClick={() => window.dispatchEvent(new Event('navigate-discovery'))}
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium"
            >
              Start Discovery
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Your Garage</h1>
            <p className="text-slate-600">{vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'} saved</p>
          </div>

          <button
            onClick={() => setShowQuestions(!showQuestions)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <HelpCircle className="w-5 h-5" />
            <span className="hidden sm:inline">Help us understand your needs</span>
            <span className="sm:hidden">Profile</span>
          </button>
        </div>

        {showQuestions && (
          <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Tell us about your driving habits</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Monthly kilometers driven
                </label>
                <input
                  type="number"
                  value={preferences.monthly_kms || ''}
                  onChange={(e) => setPreferences({ ...preferences, monthly_kms: Number(e.target.value) })}
                  placeholder="e.g., 1500"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Driving type
                </label>
                <select
                  value={preferences.driving_type}
                  onChange={(e) => setPreferences({ ...preferences, driving_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="city">Mostly City</option>
                  <option value="highway">Mostly Highway</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Can you charge a car at home?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={preferences.can_charge_at_home === true}
                      onChange={() => setPreferences({ ...preferences, can_charge_at_home: true })}
                      className="w-4 h-4"
                    />
                    <span className="text-slate-700">Yes</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={preferences.can_charge_at_home === false}
                      onChange={() => setPreferences({ ...preferences, can_charge_at_home: false })}
                      className="w-4 h-4"
                    />
                    <span className="text-slate-700">No</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What matters more to you?
                </label>
                <select
                  value={preferences.priority}
                  onChange={(e) => setPreferences({ ...preferences, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="reliability">Reliability</option>
                  <option value="performance">Performance</option>
                  <option value="efficiency">Efficiency</option>
                  <option value="luxury">Luxury</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  When do you plan on securing a car?
                </label>
                <select
                  value={preferences.timeline}
                  onChange={(e) => setPreferences({ ...preferences, timeline: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="0-2 weeks">0-2 weeks</option>
                  <option value="2-6 weeks">2-6 weeks</option>
                  <option value="6+ weeks">6+ weeks</option>
                  <option value="just browsing">Just browsing</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowQuestions(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={savePreferences}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className="bg-slate-900 text-white rounded-lg p-4 mb-6 flex items-center justify-between">
            <span>{selectedIds.length} selected</span>
            <button
              onClick={handleCompare}
              disabled={selectedIds.length !== 2}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedIds.length === 2
                  ? 'bg-white text-slate-900 hover:bg-slate-100'
                  : 'bg-white/20 text-white/50 cursor-not-allowed'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              Compare Selected
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => {
            const basePrice = vehicle.trims[0]?.basePrice ?? 0;
            const imageUrl = vehicle.images[0] ?? '';
            const isSelected = selectedIds.includes(vehicle.id);

            return (
              <div
                key={vehicle.id}
                className={`bg-white rounded-lg border-2 overflow-hidden transition-all cursor-pointer ${
                  isSelected ? 'border-slate-900 shadow-lg' : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => toggleSelect(vehicle.id)}
              >
                <div className="aspect-[16/9] bg-slate-100 relative">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      No Image
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h3>

                  {vehicle.aiSummary && (
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">{vehicle.aiSummary}</p>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xl font-bold text-slate-900">
                      ${basePrice.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent('view-vehicle', { detail: { vehicleId: vehicle.id } }));
                      }}
                      className="flex-1 px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium"
                    >
                      View Details
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(vehicle.id);
                      }}
                      className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { StructuredVehicle } from '../types/specs';
import { VehicleConfigSelection } from '../types/config';
import { UserPreferences } from '../types';
import { GarageItem, getGarageItems } from '../lib/session';
import { supabase } from '../lib/supabase';
import { STORAGE_KEYS } from '../lib/storageKeys';
import { GarageProfileModal } from './garage/GarageProfileModal';
import { GarageVehicleCard } from './garage/GarageVehicleCard';
import { GaragePreferencesPanel } from './garage/GaragePreferencesPanel';

export default function GaragePage({ vehicles }: { vehicles: StructuredVehicle[] }) {
  const [garageVehicles, setGarageVehicles] = useState<StructuredVehicle[]>([]);
  const [garageItemsList, setGarageItemsList] = useState<GarageItem[]>([]);
  const [flyoutVehicleId, setFlyoutVehicleId] = useState<string | null>(null);
  const [flyoutTriggerEl, setFlyoutTriggerEl] = useState<HTMLElement | null>(null);
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
  }, [vehicles]);

  const loadGarageVehicles = () => {
    const items = getGarageItems();
    setGarageItemsList(items);
    setGarageVehicles(vehicles.filter(v => items.some(i => i.vehicleId === v.id)));
  };

  const loadPreferences = () => {
    const stored = localStorage.getItem(STORAGE_KEYS.userPreferences);
    if (stored) setPreferences(JSON.parse(stored));
  };

  const savePreferences = async () => {
    localStorage.setItem(STORAGE_KEYS.userPreferences, JSON.stringify(preferences));
    const sessionId = localStorage.getItem(STORAGE_KEYS.sessionId);
    if (sessionId) {
      await supabase.from('user_preferences').upsert({ session_id: sessionId, ...preferences });
    }
    setShowQuestions(false);
    alert('Preferences saved!');
  };

  const handleRemove = (vehicleId: string) => {
    setGarageItemsList(prev => prev.filter(item => item.vehicleId !== vehicleId));
    setGarageVehicles(prev => prev.filter(v => v.id !== vehicleId));
    if (flyoutVehicleId === vehicleId) setFlyoutVehicleId(null);
  };

  const handleUpdated = (vehicleId: string, newSelection: VehicleConfigSelection) => {
    setGarageItemsList(prev =>
      prev.map(item =>
        item.vehicleId === vehicleId
          ? { ...item, selection: newSelection, updatedAt: Date.now() }
          : item,
      ),
    );
  };

  const flyoutVehicle = flyoutVehicleId
    ? (garageVehicles.find(v => v.id === flyoutVehicleId) ?? null)
    : null;
  const flyoutSavedItem = flyoutVehicleId
    ? (garageItemsList.find(i => i.vehicleId === flyoutVehicleId) ?? null)
    : null;

  if (garageVehicles.length === 0) {
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
            <p className="text-slate-600">
              {garageVehicles.length} {garageVehicles.length === 1 ? 'vehicle' : 'vehicles'} saved
            </p>
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
          <GaragePreferencesPanel
            preferences={preferences}
            setPreferences={setPreferences}
            onCancel={() => setShowQuestions(false)}
            onSave={savePreferences}
          />
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {garageVehicles.map((vehicle) => {
            const garageItem = garageItemsList.find(i => i.vehicleId === vehicle.id) ?? null;
            return (
              <GarageVehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                garageItem={garageItem}
                onOpen={(triggerEl) => {
                  setFlyoutTriggerEl(triggerEl);
                  setFlyoutVehicleId(vehicle.id);
                }}
              />
            );
          })}
        </div>
      </div>

      {flyoutVehicle && flyoutSavedItem && (
        <GarageProfileModal
          vehicle={flyoutVehicle}
          allVehicles={vehicles}
          savedItem={flyoutSavedItem}
          onClose={() => setFlyoutVehicleId(null)}
          onRemoved={handleRemove}
          onUpdated={handleUpdated}
          returnFocusTo={flyoutTriggerEl}
        />
      )}
    </div>
  );
}

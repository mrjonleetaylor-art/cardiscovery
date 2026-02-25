import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Minus, GitCompare, RefreshCw, HelpCircle, ChevronRight } from 'lucide-react';
import { StructuredVehicle } from '../types/specs';
import { VehicleConfigSelection } from '../types/config';
import { UserPreferences } from '../types';
import { structuredVehicles } from '../data/structuredVehicles';
import {
  GarageItem,
  getGarageItems,
  removeGarageItem,
  upsertGarageItem,
  doesSavedSelectionMatch,
} from '../lib/session';
import { resolveConfiguredVehicle, ResolvedVehicle } from '../lib/resolveConfiguredVehicle';
import { buildConfigSummary } from '../lib/configSummary';
import { VehicleConfigurationControls } from './config/VehicleConfigurationControls';
import { supabase } from '../lib/supabase';
import { STORAGE_KEYS } from '../lib/storageKeys';

// ─── Profile flyout ───────────────────────────────────────────────────────────

function GarageProfileFlyout({
  vehicle,
  savedItem,
  onClose,
  onRemoved,
  onUpdated,
}: {
  vehicle: StructuredVehicle;
  savedItem: GarageItem;
  onClose: () => void;
  onRemoved: (vehicleId: string) => void;
  onUpdated: (vehicleId: string, newSelection: VehicleConfigSelection) => void;
}) {
  const [selection, setSelection] = useState<VehicleConfigSelection>(savedItem.selection);
  const [heroIndex, setHeroIndex] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  const resolvedData: ResolvedVehicle = useMemo(
    () => resolveConfiguredVehicle(vehicle, selection),
    [vehicle, selection],
  );

  const heroSrc =
    resolvedData.heroImageUrl ??
    resolvedData.resolvedImages[heroIndex] ??
    vehicle.images[0] ??
    null;

  // doesSavedSelectionMatch reads localStorage, which is the source of truth for "saved"
  const isDirty = !doesSavedSelectionMatch(vehicle.id, selection);

  // Auto-focus the close button when flyout opens
  useEffect(() => { closeRef.current?.focus(); }, []);

  // Esc closes flyout
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Reset hero index when the resolved image gallery changes
  useEffect(() => { setHeroIndex(0); }, [resolvedData.resolvedImages.join(',')]);

  const handleUpdate = () => {
    upsertGarageItem(vehicle.id, selection);
    window.dispatchEvent(new Event('garage-updated'));
    onUpdated(vehicle.id, selection);
  };

  const handleRemove = () => {
    removeGarageItem(vehicle.id);
    window.dispatchEvent(new Event('garage-updated'));
    onRemoved(vehicle.id);
    onClose();
  };

  const handleCompare = () => {
    window.dispatchEvent(
      new CustomEvent('navigate-compare', { detail: { vehicleId: vehicle.id } }),
    );
  };

  const handleViewProfile = () => {
    window.dispatchEvent(
      new CustomEvent('view-vehicle', { detail: { vehicleId: vehicle.id } }),
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-label={`${vehicle.year} ${vehicle.make} ${vehicle.model} details`}
    >
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} aria-hidden="true" />

      {/* Drawer — slides in from the right */}
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="min-w-0 mr-3">
            <h2 className="text-base font-bold text-slate-900 truncate">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h2>
            <p className="text-sm text-slate-500 truncate">
              {resolvedData.selectedTrim.name}
            </p>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero image */}
        <div className="flex-shrink-0">
          <div className="aspect-[16/9] bg-slate-100 overflow-hidden">
            {heroSrc ? (
              <img
                src={heroSrc}
                alt={`${vehicle.make} ${vehicle.model}`}
                className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                No Image Available
              </div>
            )}
          </div>
          {resolvedData.resolvedImages.length > 1 && (
            <div className="flex gap-1.5 px-5 py-2 overflow-x-auto bg-slate-50 border-b border-slate-100">
              {resolvedData.resolvedImages.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setHeroIndex(i)}
                  className={`flex-shrink-0 w-12 h-8 rounded overflow-hidden border-2 transition-all ${
                    i === heroIndex ? 'border-slate-900' : 'border-transparent hover:border-slate-300'
                  }`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="text-xs text-slate-500 mb-0.5">Price</div>
          <div className="text-2xl font-bold text-slate-900">
            ${resolvedData.totalPrice.toLocaleString()}
          </div>
        </div>

        {/* Configuration controls */}
        <div className="px-5 py-4 flex-1">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">
            Trim &amp; Options
          </p>
          <VehicleConfigurationControls
            vehicle={vehicle}
            selection={selection}
            onChange={(patch) => setSelection(prev => ({ ...prev, ...patch }))}
            onHeroReset={() => setHeroIndex(0)}
            mode="panel"
            showPacks={true}
            showConfigGroups={true}
            showDescriptions={true}
          />
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-slate-200 flex-shrink-0 space-y-2">
          <button
            onClick={handleCompare}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-sm font-medium transition-colors"
          >
            <GitCompare className="w-4 h-4" />
            Add to Compare
          </button>
          <button
            onClick={handleUpdate}
            disabled={!isDirty}
            aria-disabled={!isDirty}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              isDirty
                ? 'border-slate-700 text-slate-800 bg-white hover:bg-slate-50'
                : 'border-slate-200 text-slate-400 bg-white cursor-not-allowed'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Update Garage
          </button>
          <button
            onClick={handleRemove}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-300 text-red-600 bg-white hover:bg-red-50 text-sm font-medium transition-colors"
          >
            <Minus className="w-4 h-4" />
            Remove from Garage
          </button>
          <button
            onClick={handleViewProfile}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-slate-500 hover:text-slate-700 text-sm transition-colors"
          >
            View full profile
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Garage page ──────────────────────────────────────────────────────────────

export default function GaragePage() {
  const [vehicles, setVehicles] = useState<StructuredVehicle[]>([]);
  const [garageItemsList, setGarageItemsList] = useState<GarageItem[]>([]);
  const [flyoutVehicleId, setFlyoutVehicleId] = useState<string | null>(null);
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
    const items = getGarageItems();
    setGarageItemsList(items);
    setVehicles(structuredVehicles.filter(v => items.some(i => i.vehicleId === v.id)));
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
    // Note: the flyout also calls removeGarageItem and closes itself before calling this.
    // This callback only updates the parent list state.
    setGarageItemsList(prev => prev.filter(item => item.vehicleId !== vehicleId));
    setVehicles(prev => prev.filter(v => v.id !== vehicleId));
    if (flyoutVehicleId === vehicleId) setFlyoutVehicleId(null);
  };

  const handleUpdated = (vehicleId: string, newSelection: VehicleConfigSelection) => {
    // Sync the in-memory garage list so the card's summary/price updates immediately.
    setGarageItemsList(prev =>
      prev.map(item =>
        item.vehicleId === vehicleId
          ? { ...item, selection: newSelection, updatedAt: Date.now() }
          : item,
      ),
    );
  };

  const flyoutVehicle = flyoutVehicleId
    ? (vehicles.find(v => v.id === flyoutVehicleId) ?? null)
    : null;
  const flyoutSavedItem = flyoutVehicleId
    ? (garageItemsList.find(i => i.vehicleId === flyoutVehicleId) ?? null)
    : null;

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
            <p className="text-slate-600">
              {vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'} saved
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Driving type</label>
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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => {
            const garageItem = garageItemsList.find(i => i.vehicleId === vehicle.id);
            const itemSelection = garageItem?.selection ?? {
              variantId: null,
              subvariantId: null,
              trimId: vehicle.trims[0]?.id ?? null,
              packIds: [],
              selectedOptionsByGroup: {},
            };
            const resolved = resolveConfiguredVehicle(vehicle, itemSelection);
            const heroUrl =
              resolved.heroImageUrl ??
              resolved.resolvedImages[0] ??
              vehicle.images[0] ??
              null;
            const configSummary = buildConfigSummary(vehicle, itemSelection);

            return (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => setFlyoutVehicleId(vehicle.id)}
                className="text-left bg-white rounded-lg border border-slate-200 overflow-hidden transition-all hover:border-slate-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
              >
                <div className="aspect-[16/9] bg-slate-100 relative overflow-hidden">
                  {heroUrl ? (
                    <img
                      src={heroUrl}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      No Image
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h3>
                  {configSummary && (
                    <p className="text-xs text-slate-500 mb-2 truncate">{configSummary}</p>
                  )}
                  {vehicle.aiSummary && (
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">{vehicle.aiSummary}</p>
                  )}
                  <p className="text-xl font-bold text-slate-900">
                    ${resolved.totalPrice.toLocaleString()}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Profile flyout */}
      {flyoutVehicle && flyoutSavedItem && (
        <GarageProfileFlyout
          vehicle={flyoutVehicle}
          savedItem={flyoutSavedItem}
          onClose={() => setFlyoutVehicleId(null)}
          onRemoved={handleRemove}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Minus, Check, X } from 'lucide-react';
import { StructuredVehicle } from '../types/specs';
import { VehicleConfigSelection } from '../types/config';
import { structuredVehicles } from '../data/structuredVehicles';
import { resolveConfiguredVehicle, ResolvedVehicle } from '../lib/resolveConfiguredVehicle';
import { upsertGarageItem, removeGarageItem, isInGarage, doesSavedSelectionMatch } from '../lib/session';
import { supabase } from '../lib/supabase';
import { VehicleProfileContent } from './profile/VehicleProfileContent';

function sanitizeProfileSelection(vehicle: StructuredVehicle, sel: VehicleConfigSelection): VehicleConfigSelection {
  const trim = vehicle.trims.find(t => t.id === sel.trimId) ?? vehicle.trims[0];
  const validPackIds = new Set(trim?.packs.map(p => p.id) ?? []);
  return {
    ...sel,
    trimId: trim?.id ?? null,
    packIds: (sel.packIds ?? []).filter(id => validPackIds.has(id)),
  };
}

interface VehicleDetailPageProps {
  vehicleId: string;
  onBack: () => void;
}

export default function VehicleDetailPage({ vehicleId, onBack }: VehicleDetailPageProps) {
  const [vehicle, setVehicle] = useState<StructuredVehicle | null>(null);
  const [inGarage, setInGarage] = useState(false);
  const [selection, setSelection] = useState<VehicleConfigSelection>({
    variantId: null,
    subvariantId: null,
    trimId: null,
    packIds: [],
    selectedOptionsByGroup: {},
  });
  const [showLeadForm, setShowLeadForm] = useState(false);

  useEffect(() => {
    const found = structuredVehicles.find(v => v.id === vehicleId) ?? null;
    setVehicle(found);
    if (found) {
      setSelection({
        variantId: null,
        subvariantId: null,
        trimId: found.trims[0]?.id ?? null,
        packIds: [],
        selectedOptionsByGroup: {},
      });
    }
  }, [vehicleId]);

  const resolvedData: ResolvedVehicle | null = useMemo(() => {
    if (!vehicle) return null;
    return resolveConfiguredVehicle(vehicle, sanitizeProfileSelection(vehicle, selection));
  }, [vehicle, selection]);

  useEffect(() => {
    const refresh = () => setInGarage(isInGarage(vehicleId));
    refresh();
    window.addEventListener('garage-updated', refresh);
    return () => window.removeEventListener('garage-updated', refresh);
  }, [vehicleId]);

  const selectionMatchesSaved = inGarage && doesSavedSelectionMatch(vehicleId, selection);

  const handleGarageAction = () => {
    if (inGarage && selectionMatchesSaved) {
      removeGarageItem(vehicleId);
    } else {
      upsertGarageItem(vehicleId, selection);
    }
    setInGarage(isInGarage(vehicleId));
    window.dispatchEvent(new Event('garage-updated'));
  };

  const handleAddToCompare = () => {
    window.dispatchEvent(new CustomEvent('navigate-compare', { detail: { vehicleId } }));
  };

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-lg text-slate-600">Vehicle not found</p>
          <button onClick={onBack} className="mt-4 text-slate-900 font-medium hover:underline">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <VehicleProfileContent
              vehicle={vehicle}
              selection={selection}
              resolvedData={resolvedData}
              onSelectionChange={(patch) => setSelection((prev) => ({ ...prev, ...patch }))}
              mode="page"
              showTrimOptions={true}
            />
          </div>

          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h1 className="text-2xl font-bold text-slate-900 mb-1">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h1>
                {resolvedData && (
                  <p className="text-slate-600 mb-4">{resolvedData.selectedTrim.name}</p>
                )}

                <div className="mb-6">
                  <div className="text-sm text-slate-600 mb-1">Price</div>
                  <div className="text-3xl font-bold text-slate-900">
                    {resolvedData ? `$${resolvedData.totalPrice.toLocaleString()}` : '—'}
                  </div>
                </div>

                {vehicle.tags && vehicle.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {vehicle.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={handleGarageAction}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${
                      inGarage
                        ? 'bg-slate-900 text-white hover:bg-slate-800'
                        : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    {inGarage && selectionMatchesSaved ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {!inGarage ? 'Save' : selectionMatchesSaved ? 'Saved' : 'Update Garage'}
                  </button>

                  <button
                    onClick={handleAddToCompare}
                    className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg font-semibold transition-colors"
                  >
                    Compare
                  </button>

                  <button
                    onClick={() => setShowLeadForm(true)}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Get Offers
                  </button>
                </div>

                {vehicle.bestFor && vehicle.bestFor.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Best For</h4>
                    <div className="space-y-2">
                      {vehicle.bestFor.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {vehicle.tradeOffs && vehicle.tradeOffs.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Consider</h4>
                    <div className="space-y-2">
                      {vehicle.tradeOffs.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                          <X className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showLeadForm && (
        <LeadFormModal vehicle={vehicle} onClose={() => setShowLeadForm(false)} />
      )}
    </div>
  );
}

function LeadFormModal({ vehicle, onClose }: { vehicle: StructuredVehicle; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    postcode: '',
    contact_preference: 'email',
    timeline: '2-6 weeks',
    has_trade_in: false,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const garageItems = JSON.parse(localStorage.getItem('garage_items') || '[]');

    const lead = {
      ...formData,
      selected_vehicles: [{ id: vehicle.id, make: vehicle.make, model: vehicle.model }],
      garage_vehicles: garageItems,
      preferences: {},
      lead_summary: `Interest in ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    };

    const { error } = await supabase.from('leads').insert([lead]);

    if (error) {
      console.error('Error submitting lead:', error);
      alert('Error submitting inquiry. Please try again.');
    } else {
      alert('Thank you! A dealer will contact you soon.');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold text-slate-900 mb-2">Get Offers</h3>
        <p className="text-slate-600 mb-6">Connect with dealers who can provide competitive pricing for this vehicle</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Postcode</label>
            <input
              type="text"
              required
              value={formData.postcode}
              onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              placeholder="2000"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Timeline</label>
            <select
              value={formData.timeline}
              onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
            >
              <option value="0-2 weeks">0-2 weeks</option>
              <option value="2-6 weeks">2-6 weeks</option>
              <option value="6+ weeks">6+ weeks</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="trade_in"
              checked={formData.has_trade_in}
              onChange={(e) => setFormData({ ...formData, has_trade_in: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            <label htmlFor="trade_in" className="text-sm font-medium text-slate-900">I have a trade-in</label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Additional Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              placeholder="Any specific requirements or questions..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold transition-colors"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

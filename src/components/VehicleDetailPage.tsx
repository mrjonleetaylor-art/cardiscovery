import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Minus, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { Vehicle, TrimOption, PackOption } from '../types';
import { supabase } from '../lib/supabase';
import { addToGarage, removeFromGarage, isInGarage } from '../lib/session';
import { resolveVehicleSpecs } from '../lib/specResolver';
import { ResolvedSpecs } from '../types/specs';

interface VehicleDetailPageProps {
  vehicleId: string;
  onBack: () => void;
}

export default function VehicleDetailPage({ vehicleId, onBack }: VehicleDetailPageProps) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [inGarage, setInGarage] = useState(false);
  const [selectedTrimId, setSelectedTrimId] = useState<string | null>(null);
  const [selectedPackIds, setSelectedPackIds] = useState<string[]>([]);
  const [resolvedData, setResolvedData] = useState<ResolvedSpecs | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['option-packs']));
  const [similarVehicles, setSimilarVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    loadVehicle();
  }, [vehicleId]);

  useEffect(() => {
    if (vehicle) {
      const resolved = resolveVehicleSpecs(vehicle, selectedTrimId, selectedPackIds);
      setResolvedData(resolved);
    }
  }, [vehicle, selectedTrimId, selectedPackIds]);

  useEffect(() => {
    setInGarage(isInGarage(vehicleId));
  }, [vehicleId]);

  const loadVehicle = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .maybeSingle();

    if (error) {
      console.error('Error loading vehicle:', error);
    } else if (data) {
      setVehicle(data);
      if (data.trim_options && data.trim_options.length > 0) {
        setSelectedTrimId(data.trim_options[0].name);
      }
      loadSimilarVehicles(data);
    }
    setLoading(false);
  };

  const loadSimilarVehicles = async (currentVehicle: Vehicle) => {
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .neq('id', currentVehicle.id)
      .eq('body_type', currentVehicle.body_type)
      .limit(3);

    if (data) {
      setSimilarVehicles(data);
    }
  };

  const toggleGarage = () => {
    if (inGarage) {
      removeFromGarage(vehicleId);
    } else {
      addToGarage(vehicleId);
    }
    setInGarage(!inGarage);
    window.dispatchEvent(new Event('garage-updated'));
  };

  const handleAddToCompare = () => {
    const compareList = JSON.parse(localStorage.getItem('compare_list') || '[]');
    if (!compareList.includes(vehicleId) && compareList.length < 2) {
      compareList.push(vehicleId);
      localStorage.setItem('compare_list', JSON.stringify(compareList));
      window.dispatchEvent(new Event('compare-updated'));
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const togglePack = (packName: string) => {
    setSelectedPackIds(prev => {
      if (prev.includes(packName)) {
        return prev.filter(p => p !== packName);
      } else {
        return [...prev, packName];
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading vehicle...</p>
          </div>
        </div>
      </div>
    );
  }

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

  const priceRange = vehicle.trim_options && vehicle.trim_options.length > 1
    ? `$${(vehicle.base_price || 0).toLocaleString()} - $${((vehicle.base_price || 0) + Math.max(...vehicle.trim_options.map(t => t.price_adjustment))).toLocaleString()}`
    : `$${resolvedData?.totalPrice.toLocaleString() || 0}`;

  const specs = resolvedData?.specs;

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
            <div className="aspect-[16/9] bg-slate-200 rounded-xl overflow-hidden mb-6">
              {vehicle.image_url ? (
                <img
                  src={vehicle.image_url}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  No Image Available
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-8 mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Overview</h2>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <SpecRow label="Body Type" value={specs?.overview.bodyType || 'N/A'} />
                  <SpecRow label="Fuel Type" value={specs?.overview.fuelType || 'N/A'} />
                  <SpecRow label="Drivetrain" value={specs?.overview.drivetrain || 'N/A'} />
                  <SpecRow label="Transmission" value={specs?.overview.transmission || 'N/A'} />
                  <SpecRow label="Seating" value={specs?.overview.seating ? `${specs.overview.seating} seats` : 'N/A'} />
                  <SpecRow label="Warranty" value={specs?.overview.warranty || 'N/A'} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Positioning</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {vehicle.ai_summary || `The ${vehicle.year} ${vehicle.make} ${vehicle.model} offers a compelling blend of practicality and performance. Best suited for buyers seeking reliability and comfort in the ${vehicle.body_type?.toLowerCase()} segment.`}
                  </p>
                </div>
              </div>
            </div>

            <AccordionSection
              title="Option Packs"
              isExpanded={expandedSections.has('option-packs')}
              onToggle={() => toggleSection('option-packs')}
            >
              {vehicle.pack_options && vehicle.pack_options.length > 0 ? (
                <div className="space-y-4">
                  {vehicle.pack_options.map((pack: PackOption) => {
                    const isSelected = selectedPackIds.includes(pack.name);
                    return (
                      <div
                        key={pack.name}
                        className={`border-2 rounded-lg p-5 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-slate-900 bg-slate-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => togglePack(pack.name)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-slate-900 border-slate-900' : 'border-slate-300'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-900">{pack.name}</h4>
                              <p className="text-sm text-slate-600">{pack.category}</p>
                            </div>
                          </div>
                          <span className="font-bold text-slate-900">
                            +${pack.price_adjustment.toLocaleString()}
                          </span>
                        </div>
                        {pack.options && pack.options.length > 0 && (
                          <div className="ml-8 space-y-1">
                            {pack.options.slice(0, 6).map((opt, idx) => (
                              <p key={idx} className="text-sm text-slate-600">• {opt.name}</p>
                            ))}
                            {pack.options.length > 6 && (
                              <p className="text-sm text-slate-500 italic">+ {pack.options.length - 6} more features</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-600">No additional packs available for this model</p>
              )}
            </AccordionSection>

            <AccordionSection
              title="Efficiency"
              isExpanded={expandedSections.has('efficiency')}
              onToggle={() => toggleSection('efficiency')}
            >
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <SpecRow label="Fuel Economy" value={specs?.efficiency.fuelEconomy || 'N/A'} />
                  <SpecRow label="Real-World Estimate" value={specs?.efficiency.realWorldEstimate || 'N/A'} />
                  <SpecRow label="Fuel Tank" value={specs?.efficiency.fuelTank || 'N/A'} />
                  <SpecRow label="Range Estimate" value={specs?.efficiency.estimatedRange || 'N/A'} />
                  <SpecRow label="Service Interval" value={specs?.efficiency.serviceInterval || 'N/A'} />
                  <SpecRow label="Annual Running Cost" value={specs?.efficiency.annualRunningCost || 'N/A'} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Ownership Feel</h4>
                  <p className="text-sm text-slate-600">
                    {specs?.efficiency.ownershipSummary || 'Affordable daily operation with standard servicing needs'}
                  </p>
                </div>
              </div>
            </AccordionSection>

            <AccordionSection
              title="Performance"
              isExpanded={expandedSections.has('performance')}
              onToggle={() => toggleSection('performance')}
            >
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <SpecRow label="Power" value={specs?.performance.power || 'N/A'} />
                    <SpecRow label="Torque" value={specs?.performance.torque || 'N/A'} />
                    <SpecRow label="0-100 km/h" value={specs?.performance.zeroToHundred || 'N/A'} />
                    <SpecRow label="Top Speed" value={specs?.performance.topSpeed || 'N/A'} />
                  </div>
                  <div className="space-y-4">
                    <SpecRow label="Weight" value={specs?.performance.weight || 'N/A'} />
                    <SpecRow label="Power to Weight" value={specs?.performance.powerToWeight || 'N/A'} />
                    <SpecRow label="Engine" value={specs?.performance.engine || 'N/A'} />
                    <SpecRow label="Suspension" value={specs?.performance.suspension || 'N/A'} />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Driving Character</h4>
                  <p className="text-sm text-slate-600">
                    {specs?.performance.drivingCharacter || 'Comfortable and composed driving experience with a focus on refinement and ease of use.'}
                  </p>
                </div>
              </div>
            </AccordionSection>

            <AccordionSection
              title="Connectivity"
              isExpanded={expandedSections.has('connectivity')}
              onToggle={() => toggleSection('connectivity')}
            >
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <SpecRow label="Screen Size" value={specs?.connectivity.screenSize || 'N/A'} />
                    <SpecRow label="Digital Cluster" value={specs?.connectivity.digitalCluster || 'N/A'} />
                    <SpecRow label="Apple CarPlay" value={specs?.connectivity.appleCarPlay || 'N/A'} />
                    <SpecRow label="Android Auto" value={specs?.connectivity.androidAuto || 'N/A'} />
                  </div>
                  <div className="space-y-4">
                    <SpecRow label="Wireless Charging" value={specs?.connectivity.wirelessCharging || 'N/A'} />
                    <SpecRow label="Sound System" value={specs?.connectivity.soundSystem || 'N/A'} />
                    <SpecRow label="App Support" value={specs?.connectivity.appSupport || 'N/A'} />
                    <SpecRow label="OTA Updates" value={specs?.connectivity.otaUpdates || 'N/A'} />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Tech Summary</h4>
                  <p className="text-sm text-slate-600">
                    {specs?.connectivity.techSummary || 'Modern connectivity suite with intuitive interfaces.'}
                  </p>
                </div>
              </div>
            </AccordionSection>

            <AccordionSection
              title="Safety"
              isExpanded={expandedSections.has('safety')}
              onToggle={() => toggleSection('safety')}
            >
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <SpecRow label="ANCAP Rating" value={specs?.safety.ancapRating || 'N/A'} />
                    <SpecRow label="Airbags" value={specs?.safety.airbags ? `${specs.safety.airbags} airbags` : 'N/A'} />
                    <SpecRow label="AEB" value={specs?.safety.aeb || 'N/A'} />
                    <SpecRow label="Lane Keep Assist" value={specs?.safety.laneKeepAssist || 'N/A'} />
                  </div>
                  <div className="space-y-4">
                    <SpecRow label="Adaptive Cruise" value={specs?.safety.adaptiveCruise || 'N/A'} />
                    <SpecRow label="Blind Spot Monitor" value={specs?.safety.blindSpotMonitoring || 'N/A'} />
                    <SpecRow label="Rear Cross Traffic" value={specs?.safety.rearCrossTraffic || 'N/A'} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-600">
                    {specs?.safety.safetySummary || 'Comprehensive safety package with strong crash test ratings and modern active safety features.'}
                  </p>
                </div>
              </div>
            </AccordionSection>

            {similarVehicles.length > 0 && (
              <div className="bg-white rounded-xl p-8 mt-6">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Similar Alternatives</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  {similarVehicles.map((similar) => (
                    <div
                      key={similar.id}
                      className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => window.dispatchEvent(new CustomEvent('view-vehicle', { detail: { vehicleId: similar.id } }))}
                    >
                      <div className="aspect-video bg-slate-100">
                        {similar.image_url && (
                          <img src={similar.image_url} alt={`${similar.make} ${similar.model}`} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-slate-900">{similar.make} {similar.model}</h4>
                        <p className="text-sm text-slate-600">{similar.year}</p>
                        <p className="text-sm font-bold text-slate-900 mt-2">
                          ${(similar.base_price || similar.price || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h1 className="text-2xl font-bold text-slate-900 mb-1">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h1>
                {vehicle.trim && (
                  <p className="text-slate-600 mb-4">{vehicle.trim}</p>
                )}

                {vehicle.trim_options && vehicle.trim_options.length > 1 && (
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Select Trim
                    </label>
                    <select
                      value={selectedTrimId || ''}
                      onChange={(e) => setSelectedTrimId(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                    >
                      {vehicle.trim_options.map((trim) => (
                        <option key={trim.name} value={trim.name}>
                          {trim.name} {trim.price_adjustment > 0 ? `(+$${trim.price_adjustment.toLocaleString()})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="mb-6">
                  <div className="text-sm text-slate-600 mb-1">Price Range</div>
                  <div className="text-3xl font-bold text-slate-900">{priceRange}</div>
                  {selectedPackIds.length > 0 && resolvedData && (
                    <div className="text-sm text-slate-600 mt-1">
                      With {selectedPackIds.length} pack{selectedPackIds.length > 1 ? 's' : ''}: ${resolvedData.totalPrice.toLocaleString()}
                    </div>
                  )}
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
                    onClick={toggleGarage}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${
                      inGarage
                        ? 'bg-slate-900 text-white hover:bg-slate-800'
                        : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    {inGarage ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {inGarage ? 'In Garage' : 'Add to Garage'}
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

                {vehicle.best_for && vehicle.best_for.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Best For</h4>
                    <div className="space-y-2">
                      {vehicle.best_for.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {vehicle.trade_offs && vehicle.trade_offs.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Consider</h4>
                    <div className="space-y-2">
                      {vehicle.trade_offs.map((item, idx) => (
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

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function AccordionSection({
  title,
  isExpanded,
  onToggle,
  children
}: {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl overflow-hidden mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
      >
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-600" />
        )}
      </button>
      {isExpanded && (
        <div className="px-6 pb-6">
          {children}
        </div>
      )}
    </div>
  );
}

function LeadFormModal({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
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

import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Minus, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { StructuredVehicle, Pack } from '../types/specs';
import { VehicleConfigSelection } from '../types/config';
import { structuredVehicles } from '../data/structuredVehicles';
import { resolveConfiguredVehicle, ResolvedVehicle } from '../lib/resolveConfiguredVehicle';
import { upsertGarageItem, removeGarageItem, isInGarage, doesSavedSelectionMatch } from '../lib/session';
import { supabase } from '../lib/supabase';
import { VehicleConfigurationControls } from './config/VehicleConfigurationControls';

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
  });
  const [heroIndex, setHeroIndex] = useState(0);
  const [resolvedData, setResolvedData] = useState<ResolvedVehicle | null>(null);
  const [heroError, setHeroError] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['option-packs']));
  const [similarVehicles, setSimilarVehicles] = useState<StructuredVehicle[]>([]);

  useEffect(() => {
    const found = structuredVehicles.find(v => v.id === vehicleId) ?? null;
    setVehicle(found);
    if (found) {
      setSelection({
        variantId: null,
        subvariantId: null,
        trimId: found.trims[0]?.id ?? null,
        packIds: [],
      });
      setHeroIndex(0);
      const bodyType = found.trims[0]?.specs.overview.bodyType;
      setSimilarVehicles(
        structuredVehicles
          .filter(v => v.id !== found.id && v.trims[0]?.specs.overview.bodyType === bodyType)
          .slice(0, 3)
      );
    }
  }, [vehicleId]);

  useEffect(() => {
    if (vehicle) {
      setResolvedData(resolveConfiguredVehicle(vehicle, selection));
    }
  }, [vehicle, selection]);

  // Reset heroIndex when the resolved image gallery changes (e.g. variant swap)
  useEffect(() => {
    setHeroIndex(0);
  }, [resolvedData?.resolvedImages.join(',')]);

  const heroSrc = resolvedData?.heroImageUrl
    ?? resolvedData?.resolvedImages[heroIndex]
    ?? vehicle?.images[heroIndex]
    ?? vehicle?.images[0]
    ?? null;

  useEffect(() => {
    setHeroError(false);
  }, [heroSrc]);

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

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const togglePack = (packId: string) => {
    setSelection((prev) => ({
      ...prev,
      packIds: prev.packIds.includes(packId)
        ? prev.packIds.filter((p) => p !== packId)
        : [...prev.packIds, packId],
    }));
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

  const priceRange = vehicle.trims.length > 1
    ? `$${vehicle.trims[0].basePrice.toLocaleString()} – $${Math.max(...vehicle.trims.map(t => t.basePrice)).toLocaleString()}`
    : `$${(resolvedData?.totalPrice ?? vehicle.trims[0].basePrice).toLocaleString()}`;

  const specs = resolvedData?.specs;
  const currentTrimPacks = resolvedData?.selectedTrim.packs ?? [];

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
            <div className="aspect-[16/9] bg-slate-200 rounded-xl overflow-hidden mb-3">
              {heroSrc && !heroError ? (
                <img
                  src={heroSrc}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  className="w-full h-full object-cover"
                  onError={() => setHeroError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  No Image Available
                </div>
              )}
            </div>
            {(resolvedData?.resolvedImages ?? vehicle.images).length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {(resolvedData?.resolvedImages ?? vehicle.images).map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setHeroIndex(i)}
                    className={`flex-shrink-0 w-16 h-11 rounded overflow-hidden border-2 transition-all ${
                      i === heroIndex ? 'border-slate-900' : 'border-transparent hover:border-slate-300'
                    }`}
                  >
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const btn = (e.target as HTMLImageElement).closest('button') as HTMLElement | null;
                        if (btn) btn.style.display = 'none';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

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
                    {vehicle.aiSummary || `The ${vehicle.year} ${vehicle.make} ${vehicle.model} offers a compelling blend of practicality and performance.`}
                  </p>
                </div>
              </div>
            </div>

            <AccordionSection
              title="Option Packs"
              isExpanded={expandedSections.has('option-packs')}
              onToggle={() => toggleSection('option-packs')}
            >
              {currentTrimPacks.length > 0 ? (
                <div className="space-y-4">
                  {currentTrimPacks.map((pack: Pack) => {
                    const isSelected = selection.packIds.includes(pack.id);
                    return (
                      <div
                        key={pack.id}
                        className={`border-2 rounded-lg p-5 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-slate-900 bg-slate-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => togglePack(pack.id)}
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
                            +${pack.priceDelta.toLocaleString()}
                          </span>
                        </div>
                        {pack.description && (
                          <p className="text-sm text-slate-600 mb-2 ml-8">{pack.description}</p>
                        )}
                        {pack.features.length > 0 && (
                          <div className="ml-8 space-y-1">
                            {pack.features.slice(0, 6).map((f, idx) => (
                              <p key={idx} className="text-sm text-slate-600">• {f}</p>
                            ))}
                            {pack.features.length > 6 && (
                              <p className="text-sm text-slate-500 italic">+ {pack.features.length - 6} more features</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-600">No additional packs available for this trim</p>
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
                    {specs?.performance.drivingCharacter || 'Comfortable and composed driving experience with a focus on refinement.'}
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
                        {similar.images[0] && (
                          <img src={similar.images[0]} alt={`${similar.make} ${similar.model}`} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-slate-900">{similar.make} {similar.model}</h4>
                        <p className="text-sm text-slate-600">{similar.year}</p>
                        <p className="text-sm font-bold text-slate-900 mt-2">
                          ${similar.trims[0]?.basePrice.toLocaleString()}
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
                {resolvedData && (
                  <p className="text-slate-600 mb-4">{resolvedData.selectedTrim.name}</p>
                )}

                <div className="mb-6">
                  <VehicleConfigurationControls
                    vehicle={vehicle}
                    selection={selection}
                    onChange={(selectionPatch) => setSelection((prev) => ({ ...prev, ...selectionPatch }))}
                    onHeroReset={() => setHeroIndex(0)}
                    mode="sidebar"
                    showPacks={false}
                    showDescriptions={true}
                  />
                </div>

                <div className="mb-6">
                  <div className="text-sm text-slate-600 mb-1">Price Range</div>
                  <div className="text-3xl font-bold text-slate-900">{priceRange}</div>
                  {selection.packIds.length > 0 && resolvedData && (
                    <div className="text-sm text-slate-600 mt-1">
                      With {selection.packIds.length} pack{selection.packIds.length > 1 ? 's' : ''}: ${resolvedData.totalPrice.toLocaleString()}
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

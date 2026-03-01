import { useMemo, useState, useEffect, useRef } from 'react';
import { Plus, Minus, Check } from 'lucide-react';
import { addToGarage, removeFromGarage, isInGarage } from '../lib/session';
import { AdvancedFilters, defaultAdvancedFilters, matchesAdvancedFilters } from '../lib/advancedFilters';
import { AdvancedFiltersPanel } from './filters/AdvancedFiltersPanel';
import { STORAGE_KEYS } from '../lib/storageKeys';
import { getDisplayProps } from './compare/utils/display';
import { StructuredVehicle } from '../types/specs';
import { getAIRecommendations, AIRecommendation } from '../lib/ai';

interface Filters {
  make: string;
  model: string;
  bodyType: string;
  fuelType: string;
  budgetMin: number;
  budgetMax: number;
}

export default function Discovery({
  vehicles,
  compareV1Id,
  compareV2Id,
  onSetCompareV1,
  onSetCompareV2AndNavigate,
}: {
  vehicles: StructuredVehicle[];
  compareV1Id: string | null;
  compareV2Id: string | null;
  onSetCompareV1: (vehicleId: string) => void;
  onSetCompareV2AndNavigate: (vehicleId: string) => void;
}) {
  const [garageItems, setGarageItems] = useState<string[]>([]);
  const [compareWarningId, setCompareWarningId] = useState<string | null>(null);

  const [aiQuery, setAiQuery] = useState('');
  const [aiResults, setAiResults] = useState<AIRecommendation[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const AI_LOADING_MESSAGES = [
    'Consulting the oracle...',
    'Arguing with the algorithm...',
    'Cross-referencing 47 opinions...',
    'Checking if it comes in black...',
    'Asking Claude nicely...',
    'Reviewing your life choices...',
    'Depreciating assets mentally...',
    'Calculating school run viability...',
    'Questioning the need for a V8...',
    'Comparing boot space to your ego...',
    'Weighing practicality against desire...',
    'Consulting the depreciation tables...',
    'Factoring in the cost of pride...',
    'Auditing your fuel budget assumptions...',
    'Stress-testing the parking scenarios...',
    'Simulating the highway merge...',
    'Reconsidering the station wagon...',
    'Running the numbers on the number of cupholders...',
    'Determining whether turbo is truly necessary...',
    'Evaluating your relationship with manual transmissions...',
    'Assessing the genuine utility of a sunroof...',
    'Benchmarking against your neighbour\'s car...',
    'Estimating the cost of explaining this to your accountant...',
    'Checking tow capacity against optimism...',
    'Calibrating enthusiasm to budget...',
    'Computing resale value anxiety...',
    'Validating the need for all-wheel drive in a capital city...',
    'Reconsidering leather seats in a hot climate...',
    'Querying the database of regret...',
    'Indexing the catalogue of second thoughts...',
    'Performing due diligence on horsepower claims...',
    'Assessing the monthly repayment situation...',
    'Reviewing warranty fine print on your behalf...',
    'Triangulating between want, need, and budget...',
    'Calculating the fuel cost of your daily shame...',
    'Modelling the three-point-turn radius...',
    'Auditing the gap between spec sheet and reality...',
    'Checking whether the infotainment system is tolerable...',
    'Determining the precise shade of mid-life...',
    'Parsing your priorities for internal inconsistencies...',
    'Estimating annual insurance humiliation...',
    'Cross-checking dimensions against your garage door...',
    'Considering the long-term consequences...',
    'Reconciling aspiration with sense...',
    'Assessing whether the badge justifies the premium...',
    'Computing the opportunity cost of heated seats...',
    'Consulting the historical record on sporty SUVs...',
    'Reviewing the evidence on seven-seat practicality...',
    'Acknowledging the complexity of your situation...',
  ];

  useEffect(() => {
    if (aiLoading) {
      setLoadingMessage(AI_LOADING_MESSAGES[Math.floor(Math.random() * AI_LOADING_MESSAGES.length)]);
    }
  }, [aiLoading]);

  const AI_PLACEHOLDER_SUGGESTIONS = [
    'Family SUV under $80k with good fuel economy...',
    'Fast sedan under $60k, rear-wheel drive...',
    'Electric car with 400km+ range for city driving...',
    'Safe, reliable first car under $35k...',
    'Luxury SUV for long highway trips...',
    '7-seater for school runs and weekend trips...',
  ];
  const [inputFocused, setInputFocused] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const typewriterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (inputFocused || aiQuery) {
      if (typewriterTimer.current) clearTimeout(typewriterTimer.current);
      setDisplayedText('');
      return;
    }

    let suggestionIdx = 0;
    let charIdx = 0;
    let cancelled = false;

    function type() {
      if (cancelled) return;
      const suggestion = AI_PLACEHOLDER_SUGGESTIONS[suggestionIdx];
      if (charIdx < suggestion.length) {
        charIdx++;
        setDisplayedText(suggestion.slice(0, charIdx));
        typewriterTimer.current = setTimeout(type, 50);
      } else {
        typewriterTimer.current = setTimeout(erase, 2000);
      }
    }

    function erase() {
      if (cancelled) return;
      const suggestion = AI_PLACEHOLDER_SUGGESTIONS[suggestionIdx];
      if (charIdx > 0) {
        charIdx--;
        setDisplayedText(suggestion.slice(0, charIdx));
        typewriterTimer.current = setTimeout(erase, 30);
      } else {
        suggestionIdx = (suggestionIdx + 1) % AI_PLACEHOLDER_SUGGESTIONS.length;
        typewriterTimer.current = setTimeout(type, 300);
      }
    }

    type();

    return () => {
      cancelled = true;
      if (typewriterTimer.current) clearTimeout(typewriterTimer.current);
      setDisplayedText('');
    };
  }, [inputFocused, aiQuery]);

  const [filters, setFilters] = useState<Filters>({
    make: '',
    model: '',
    bodyType: '',
    fuelType: '',
    budgetMin: 0,
    budgetMax: 250000,
  });
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(defaultAdvancedFilters);

  useEffect(() => {
    loadGarageState();
  }, []);

  const loadGarageState = () => {
    const garage = localStorage.getItem(STORAGE_KEYS.garageItems);
    setGarageItems(garage ? JSON.parse(garage) : []);
  };

  const makes = Array.from(new Set(vehicles.map(v => v.make))).sort();
  const models = Array.from(new Set(
    vehicles
      .filter(v => !filters.make || v.make === filters.make)
      .map(v => v.model)
  )).sort();
  const bodyTypes = Array.from(new Set(
    vehicles.map(v => v.trims[0]?.specs.overview.bodyType).filter(Boolean)
  )).sort() as string[];
  const fuelTypes = Array.from(new Set(
    vehicles.map(v => v.trims[0]?.specs.overview.fuelType).filter(Boolean)
  )).sort() as string[];

  const filteredVehicles = useMemo(() => {
    let filtered = [...vehicles];

    if (filters.make) filtered = filtered.filter(v => v.make === filters.make);
    if (filters.model) filtered = filtered.filter(v => v.model === filters.model);
    if (filters.bodyType) filtered = filtered.filter(v => getDisplayProps(v).bodyType === filters.bodyType);
    if (filters.fuelType) filtered = filtered.filter(v => getDisplayProps(v).fuelType === filters.fuelType);

    filtered = filtered.filter(v => {
      const price = getDisplayProps(v).basePrice;
      return price >= filters.budgetMin && price <= filters.budgetMax;
    });

    filtered = filtered.filter(v => matchesAdvancedFilters(v, advancedFilters));

    return filtered;
  }, [vehicles, filters, advancedFilters]);

  // null = no search run (show full list); [] = search ran but no matches.
  const displayedVehicles = useMemo(() => {
    if (aiResults === null) return filteredVehicles;
    return aiResults
      .map((r) => vehicles.find((v) => v.id === r.vehicleId))
      .filter((v): v is StructuredVehicle => v != null);
  }, [aiResults, filteredVehicles, vehicles]);

  const aiReasonMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of aiResults ?? []) map[r.vehicleId] = r.reason;
    return map;
  }, [aiResults]);

  const handleAISearch = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResults([]);
    try {
      const results = await getAIRecommendations(aiQuery, vehicles);
      setAiResults(results);
    } finally {
      setAiLoading(false);
    }
  };

  const clearAI = () => {
    setAiQuery('');
    setAiResults(null);
  };

  const toggleGarage = (vehicleId: string) => {
    if (isInGarage(vehicleId)) {
      removeFromGarage(vehicleId);
    } else {
      addToGarage(vehicleId);
    }
    loadGarageState();
    window.dispatchEvent(new Event('garage-updated'));
  };

  const handleCompareAction = (vehicleId: string) => {
    if (!compareV1Id) {
      onSetCompareV1(vehicleId);
      setCompareWarningId(null);
      return;
    }
    if (compareV1Id === vehicleId) {
      setCompareWarningId(vehicleId);
      return;
    }
    onSetCompareV2AndNavigate(vehicleId);
    setCompareWarningId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-2">
          <h1 className="text-4xl font-bold text-slate-900 mb-0">Discover Your Perfect Car</h1>
          <p className="text-lg text-slate-600">Explore our curated selection and find what drives you</p>
        </div>

        {/* AI search */}
        <div className="mb-2">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">AI-Powered Search</p>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleAISearch(); }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                disabled={aiLoading}
                className="w-full px-3 py-2 border border-slate-400 text-sm bg-white text-slate-900 focus:outline-none focus:border-slate-900 disabled:opacity-50"
              />
              {!inputFocused && !aiQuery && displayedText && (
                <span
                  className="absolute inset-0 px-3 py-2 text-sm text-slate-400 pointer-events-none select-none overflow-hidden whitespace-nowrap"
                  aria-hidden="true"
                >
                  {displayedText}<span className="animate-pulse">|</span>
                </span>
              )}
            </div>
            <button
              onClick={() => void handleAISearch()}
              disabled={aiLoading || !aiQuery.trim()}
              className={`flex items-center gap-2 px-4 py-2 border border-slate-400 text-sm font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors${aiLoading ? ' animate-pulse' : ''}`}
            >
              {aiLoading ? 'Searching...' : (
                <>
                  Search
                  <span className="text-xs font-semibold tracking-wider text-white bg-slate-800 px-1.5 py-0.5 rounded-sm">AI</span>
                </>
              )}
            </button>
            {aiResults !== null && (
              <button
                onClick={clearAI}
                className="px-4 py-2 border border-slate-300 text-sm text-slate-500 hover:text-slate-900 hover:border-slate-400 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="mb-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Make</label>
              <select
                value={filters.make}
                onChange={(e) => setFilters({ ...filters, make: e.target.value, model: '' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">All Makes</option>
                {makes.map(make => (
                  <option key={make} value={make}>{make}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
              <select
                value={filters.model}
                onChange={(e) => setFilters({ ...filters, model: e.target.value })}
                disabled={!filters.make}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="">All Models</option>
                {models.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Body Type</label>
              <select
                value={filters.bodyType}
                onChange={(e) => setFilters({ ...filters, bodyType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">All Types</option>
                {bodyTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fuel Type</label>
              <select
                value={filters.fuelType}
                onChange={(e) => setFilters({ ...filters, fuelType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">All Fuels</option>
                {fuelTypes.map(fuel => (
                  <option key={fuel} value={fuel}>{fuel}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Budget</label>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Min</label>
                <input
                  type="number"
                  value={filters.budgetMin}
                  onChange={(e) => setFilters({ ...filters, budgetMin: Math.min(Number(e.target.value), filters.budgetMax) })}
                  min="0"
                  max="250000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Max</label>
                <input
                  type="number"
                  value={filters.budgetMax}
                  onChange={(e) => setFilters({ ...filters, budgetMax: Math.max(Number(e.target.value), filters.budgetMin) })}
                  min="0"
                  max="250000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="px-2">
              <div className="relative h-2 bg-slate-200 rounded-full">
                <div
                  className="absolute h-2 bg-slate-900 rounded-full"
                  style={{
                    left: `${(filters.budgetMin / 250000) * 100}%`,
                    right: `${100 - (filters.budgetMax / 250000) * 100}%`,
                  }}
                />
                <input
                  type="range"
                  min="0"
                  max="250000"
                  step="5000"
                  value={filters.budgetMin}
                  onChange={(e) => setFilters({ ...filters, budgetMin: Math.min(parseInt(e.target.value), filters.budgetMax) })}
                  className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-slate-900 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
                  style={{ zIndex: filters.budgetMin > filters.budgetMax - 10000 ? 5 : 3 }}
                />
                <input
                  type="range"
                  min="0"
                  max="250000"
                  step="5000"
                  value={filters.budgetMax}
                  onChange={(e) => setFilters({ ...filters, budgetMax: Math.max(parseInt(e.target.value), filters.budgetMin) })}
                  className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-slate-900 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
                  style={{ zIndex: 4 }}
                />
              </div>
            </div>
          </div>

          <div className="mt-3">
            <AdvancedFiltersPanel
              value={advancedFilters}
              onChange={setAdvancedFilters}
              onClear={() => setAdvancedFilters(defaultAdvancedFilters)}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 mt-2">
            <p className="text-sm text-slate-600">
              {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''} found
              {aiResults !== null && ` — ${aiResults.length} AI-matched`}
            </p>
            <button
              onClick={() => {
                setFilters({
                  make: '',
                  model: '',
                  bodyType: '',
                  fuelType: '',
                  budgetMin: 0,
                  budgetMax: 250000,
                });
                setAdvancedFilters(defaultAdvancedFilters);
              }}
              className="text-sm text-slate-900 hover:text-slate-700 font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedVehicles.map((vehicle) => {
            const inGarage = garageItems.includes(vehicle.id);
            const isCarA = compareV1Id === vehicle.id;
            const isCarB = compareV2Id === vehicle.id;
            const { basePrice, imageUrl } = getDisplayProps(vehicle);

            return (
              <div key={vehicle.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
                <div
                  className="aspect-[2/1] bg-slate-100 relative overflow-hidden cursor-pointer"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('view-vehicle', { detail: { vehicleId: vehicle.id } }));
                  }}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      No Image
                    </div>
                  )}
                  {vehicle.tags && vehicle.tags.length > 0 && (
                    <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                      {vehicle.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-medium text-slate-700 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      {aiReasonMap[vehicle.id] && (
                        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{aiReasonMap[vehicle.id]}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-slate-900">
                        ${basePrice.toLocaleString()}
                      </p>
                      {vehicle.trims.length > 1 && (
                        <p className="text-xs text-slate-500">+ options</p>
                      )}
                    </div>
                  </div>

                  {vehicle.aiSummary && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{vehicle.aiSummary}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleGarage(vehicle.id)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        inGarage
                          ? 'bg-slate-900 text-white hover:bg-slate-800'
                          : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {inGarage ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {inGarage ? 'In Garage' : 'Add to Garage'}
                    </button>
                    <button
                      onClick={() => handleCompareAction(vehicle.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        isCarA
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                          : isCarB
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-900'
                      }`}
                    >
                      {isCarA ? (
                        <span className="flex items-center gap-1">
                          <Check className="w-4 h-4" /> Car A
                        </span>
                      ) : isCarB ? (
                        <span className="flex items-center gap-1">
                          <Check className="w-4 h-4" /> Car B
                        </span>
                      ) : compareV1Id ? (
                        'Car B'
                      ) : (
                        'Car A'
                      )}
                    </button>
                  </div>

                  {compareWarningId === vehicle.id && compareV1Id === vehicle.id && (
                    <p className="mt-2 text-xs text-amber-600">Car B must be a different vehicle.</p>
                  )}

                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('view-vehicle', { detail: { vehicleId: vehicle.id } }));
                    }}
                    className="block w-full mt-3 text-center text-sm text-slate-600 hover:text-slate-900 font-medium"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {displayedVehicles.length === 0 && (
          <div className="text-center py-12">
            {aiLoading ? (
              <>
                <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full mx-auto mb-4 animate-spin" />
                <p className="text-lg text-slate-600">{loadingMessage}</p>
              </>
            ) : (
              <>
                <p className="text-lg text-slate-600">No vehicles found matching your criteria</p>
                <p className="text-sm text-slate-500 mt-2">Try adjusting your filters to see more results</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

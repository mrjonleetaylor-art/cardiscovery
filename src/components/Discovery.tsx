import { useMemo, useState, useEffect, useRef } from 'react';
import { Plus, Minus, Check, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { addToGarage, removeFromGarage, isInGarage } from '../lib/session';
import { AdvancedFilters, defaultAdvancedFilters, matchesAdvancedFilters } from '../lib/advancedFilters';
import { AdvancedFiltersPanel } from './filters/AdvancedFiltersPanel';
import { STORAGE_KEYS } from '../lib/storageKeys';
import { getDisplayProps } from './compare/utils/display';
import { StructuredVehicle } from '../types/specs';
import { getAIRecommendations, AIRecommendation } from '../lib/ai';
import { resolvePrice } from '../lib/statePrice';

// ── Seeded shuffle helpers ────────────────────────────────────────────────────
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function interleaveByMake<T extends { make: string }>(arr: T[]): T[] {
  const buckets = new Map<string, T[]>();
  for (const v of arr) {
    if (!buckets.has(v.make)) buckets.set(v.make, []);
    buckets.get(v.make)!.push(v);
  }
  const queues = Array.from(buckets.values());
  const result: T[] = [];
  let round = 0;
  while (result.length < arr.length) {
    let added = false;
    for (const q of queues) {
      if (round < q.length) { result.push(q[round]); added = true; }
    }
    if (!added) break;
    round++;
  }
  return result;
}

// ── LCG shuffle for category rows (deterministic per mount) ──────────────────
function shuffleArray<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── StructuredVehicle field accessors ────────────────────────────────────────
function vPrice(v: StructuredVehicle): number {
  return v.trims[0]?.basePrice ?? Infinity;
}
function vBodyType(v: StructuredVehicle): string {
  return (v.trims[0]?.specs.overview.bodyType ?? '').toLowerCase();
}
function vFuelType(v: StructuredVehicle): string {
  return (v.trims[0]?.specs.overview.fuelType ?? '').toLowerCase();
}
function vSeating(v: StructuredVehicle): number {
  return v.trims[0]?.specs.overview.seating ?? 0;
}

// ── Editorial categories ─────────────────────────────────────────────────────
const DISCOVERY_CATEGORIES: { label: string; filter: (v: StructuredVehicle) => boolean }[] = [
  {
    label: 'Family SUVs',
    filter: (v) => vBodyType(v) === 'suv' && vPrice(v) >= 35000 && vPrice(v) < 60000,
  },
  {
    label: 'Affordable EVs',
    filter: (v) => vFuelType(v) === 'electric' && vPrice(v) < 60000,
  },
  {
    label: 'Premium EVs',
    filter: (v) => vFuelType(v) === 'electric' && vPrice(v) >= 60000 && vPrice(v) <= 100000,
  },
  {
    label: 'Best Value',
    filter: (v) => vPrice(v) < 40000,
  },
  {
    label: 'Hybrids & PHEVs',
    filter: (v) => (vFuelType(v) === 'hybrid' || vFuelType(v) === 'phev') && vPrice(v) < 60000,
  },
  {
    label: 'Premium SUVs',
    filter: (v) => vBodyType(v) === 'suv' && vPrice(v) >= 70000 && vPrice(v) <= 100000,
  },
  {
    label: 'Diesel Workhorses',
    filter: (v) => vFuelType(v) === 'diesel' && vPrice(v) < 80000,
  },
  {
    label: 'Sharp Hatches & Sedans',
    filter: (v) => (vBodyType(v) === 'hatch' || vBodyType(v) === 'sedan') && vPrice(v) < 40000,
  },
  {
    label: 'Luxury',
    filter: (v) => vPrice(v) > 100000,
  },
  {
    label: '7-Seaters',
    filter: (v) => vSeating(v) >= 7 && vPrice(v) < 90000,
  },
];

// ── Pill definitions ─────────────────────────────────────────────────────────
const BODY_PILLS = [
  { key: '', label: 'All' },
  { key: 'suv', label: 'SUV' },
  { key: 'sedan', label: 'Sedan' },
  { key: 'ute', label: 'Ute' },
  { key: 'hatch', label: 'Hatch' },
] as const;

const POWERTRAIN_PILLS = [
  { key: '', label: 'All' },
  { key: 'petrol', label: 'Petrol' },
  { key: 'hybrid', label: 'Hybrid' },
  { key: 'phev', label: 'PHEV' },
  { key: 'electric', label: 'Electric' },
] as const;

const BUDGET_PILLS = [
  { key: 'any', label: 'Any', min: 0, max: 250000 },
  { key: 'u40', label: 'Under $40k', min: 0, max: 40000 },
  { key: '40-60', label: '$40–60k', min: 40000, max: 60000 },
  { key: '60-80', label: '$60–80k', min: 60000, max: 80000 },
  { key: '80-100', label: '$80–100k', min: 80000, max: 100000 },
  { key: '100+', label: '$100k+', min: 100000, max: 250000 },
] as const;

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
  selectedState,
}: {
  vehicles: StructuredVehicle[];
  compareV1Id: string | null;
  compareV2Id: string | null;
  onSetCompareV1: (vehicleId: string) => void;
  onSetCompareV2AndNavigate: (vehicleId: string) => void;
  selectedState: string;
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
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const [showAllCategories, setShowAllCategories] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    make: '',
    model: '',
    bodyType: '',
    fuelType: '',
    budgetMin: 0,
    budgetMax: 250000,
  });
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(defaultAdvancedFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeBudgetKey = BUDGET_PILLS.find(
    (p) => p.min === filters.budgetMin && p.max === filters.budgetMax
  )?.key ?? 'any';

  const panelFilterCount =
    [filters.make, filters.model].filter(Boolean).length +
    (JSON.stringify(advancedFilters) !== JSON.stringify(defaultAdvancedFilters) ? 1 : 0);

  const hasActiveFilters = !!(
    filters.make || filters.model || filters.bodyType || filters.fuelType ||
    filters.budgetMin > 0 || filters.budgetMax < 250000 ||
    JSON.stringify(advancedFilters) !== JSON.stringify(defaultAdvancedFilters)
  );

  // Category rows are the default state; flat grid takes over when any filter is active
  const showCategoryRows = !hasActiveFilters && aiResults === null;

  // Fixed per mount
  const [seed] = useState(() => Math.random());
  const mountSeed = useMemo(() => Date.now(), []);

  useEffect(() => {
    loadGarageState();
  }, []);

  useEffect(() => {
    document.title = 'Auto Atlas — Find & Compare New Cars in Australia';
  }, []);

  const loadGarageState = () => {
    const garage = localStorage.getItem(STORAGE_KEYS.garageItems);
    if (!garage) { setGarageItems([]); return; }
    try { setGarageItems(JSON.parse(garage)); } catch { setGarageItems([]); }
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
    if (filters.bodyType) filtered = filtered.filter(v => getDisplayProps(v).bodyType?.toLowerCase() === filters.bodyType.toLowerCase());
    if (filters.fuelType) filtered = filtered.filter(v => getDisplayProps(v).fuelType?.toLowerCase() === filters.fuelType.toLowerCase());

    filtered = filtered.filter(v => {
      const price = getDisplayProps(v).basePrice;
      return price >= filters.budgetMin && price <= filters.budgetMax;
    });

    filtered = filtered.filter(v => matchesAdvancedFilters(v, advancedFilters));

    return filtered;
  }, [vehicles, filters, advancedFilters]);

  // null = no search run (show full list); [] = search ran but no matches.
  const displayedVehicles = useMemo(() => {
    if (aiResults !== null) {
      return aiResults
        .map((r) => vehicles.find((v) => v.id === r.vehicleId))
        .filter((v): v is StructuredVehicle => v != null);
    }
    const rng = mulberry32(seed * 0xFFFFFFFF);
    return interleaveByMake(seededShuffle(filteredVehicles, rng));
  }, [aiResults, filteredVehicles, vehicles, seed]);

  const aiReasonMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of aiResults ?? []) map[r.vehicleId] = r.reason;
    return map;
  }, [aiResults]);

  // Editorial category rows — shuffled once per mount
  const categoryRows = useMemo(() => {
    if (!showCategoryRows) return [];
    const shuffledCats = shuffleArray(DISCOVERY_CATEGORIES, mountSeed);
    return shuffledCats
      .map((cat, idx) => {
        const eligible = vehicles.filter(cat.filter);
        if (eligible.length < 3) return null;
        const picked = shuffleArray(eligible, mountSeed ^ (idx * 997 + 1)).slice(0, 3);
        return { label: cat.label, vehicles: picked };
      })
      .filter((row): row is { label: string; vehicles: StructuredVehicle[] } => row !== null);
  }, [vehicles, showCategoryRows, mountSeed]);

  const handleAISearch = () => {
    const q = aiQuery.trim();
    if (q.length < 3) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setAiLoading(true);
      setAiResults([]);
      getAIRecommendations(q, vehicles)
        .then(results => setAiResults(results))
        .catch(() => setAiResults([]))
        .finally(() => setAiLoading(false));
    }, 300);
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

  const renderCard = (vehicle: StructuredVehicle) => {
    const inGarage = garageItems.includes(vehicle.id);
    const isCarA = compareV1Id === vehicle.id;
    const isCarB = compareV2Id === vehicle.id;
    const { basePrice, imageUrl, bodyType, fuelType: displayFuelType } = getDisplayProps(vehicle);
    const overview = vehicle.trims[0]?.specs?.overview;
    const drivetrain = overview?.drivetrain ?? '';
    const powertrainBadges: { label: string }[] = [];
    if (drivetrain === 'awd') powertrainBadges.push({ label: 'AWD' });
    else if (drivetrain === 'four_wd') powertrainBadges.push({ label: '4WD' });

    return (
      <div key={vehicle.id} className="bg-white rounded-xl border border-[#E8EAED] overflow-hidden hover:shadow-lg transition-shadow">
        <div
          className="aspect-[2/1] bg-[#F7F8FA] relative overflow-hidden cursor-pointer"
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
            <div className="w-full h-full flex items-center justify-center text-[#868E9C]">
              No Image
            </div>
          )}
          {vehicle.tags && vehicle.tags.length > 0 && (
            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
              {vehicle.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-medium text-[#0D0F12] rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="p-3">
          <div className="flex items-start justify-between mb-0.5">
            <p className="font-heading text-xl font-bold text-[#0D0F12] leading-tight">
              ${(resolvePrice(vehicle, selectedState) ?? basePrice).toLocaleString()}
            </p>
            {vehicle.trims.length > 1 && (
              <span className="shrink-0 ml-3 px-2 py-0.5 rounded-full bg-[#F7F8FA] text-xs text-[#868E9C] font-normal">
                +{vehicle.trims.length - 1} {vehicle.trims.length - 1 === 1 ? 'variant' : 'variants'}
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#868E9C] mb-1.5">Driveaway pricing is indicative only and subject to change.</p>
          <div className="flex items-center gap-1.5 mb-2 text-xs text-[#868E9C]">
            {bodyType && <span>{bodyType}</span>}
            {bodyType && displayFuelType && <span className="text-[#C8CACD]">·</span>}
            {displayFuelType && <span className="capitalize">{displayFuelType}</span>}
            {powertrainBadges.map((b) => (
              <>
                <span key={`dot-${b.label}`} className="text-[#C8CACD]">·</span>
                <span key={b.label}>{b.label}</span>
              </>
            ))}
          </div>
          <div className="mb-2">
            <h3 className="font-heading text-base font-semibold text-[#0D0F12]">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
            {aiReasonMap[vehicle.id] && (
              <p className="text-xs text-[#868E9C] mt-0.5 leading-snug">{aiReasonMap[vehicle.id]}</p>
            )}
          </div>

          {vehicle.aiSummary && (
            <p className="text-sm text-[#868E9C] mb-3 line-clamp-2">{vehicle.aiSummary}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => toggleGarage(vehicle.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                inGarage
                  ? 'bg-[#0D0F12] text-white hover:bg-[#0D0F12]/90'
                  : 'border border-[#E8EAED] text-[#868E9C] hover:border-[#0066FF] hover:text-[#0D0F12]'
              }`}
            >
              {inGarage ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {inGarage ? 'In Garage' : 'Add to Garage'}
            </button>
            <button
              onClick={() => handleCompareAction(vehicle.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isCarA
                  ? 'bg-[#0066FF] text-white hover:bg-blue-700 shadow-md'
                  : isCarB
                  ? 'bg-blue-50 text-[#0066FF] border border-blue-200'
                  : 'border border-[#E8EAED] text-[#868E9C] hover:border-[#0066FF] hover:text-[#0D0F12]'
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
            className="block w-full mt-3 text-center text-sm text-[#0066FF] hover:text-blue-700 font-medium"
          >
            View Details →
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] pt-16 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* AI search */}
        <div className="mb-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value.slice(0, 200))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAISearch(); }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                disabled={aiLoading}
                className="w-full h-14 px-5 bg-white text-[#0D0F12] focus:outline-none disabled:opacity-50"
                style={{ fontSize: 17, border: '1px solid #E8EAED', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              />
              {!inputFocused && !aiQuery && displayedText && (
                <span
                  className="absolute inset-0 flex items-center px-5 text-[#868E9C] pointer-events-none select-none overflow-hidden whitespace-nowrap"
                  style={{ fontSize: 17 }}
                  aria-hidden="true"
                >
                  {displayedText}<span className="animate-pulse">|</span>
                </span>
              )}
            </div>
            <button
              onClick={handleAISearch}
              disabled={aiLoading || aiQuery.trim().length < 3}
              className={`flex items-center gap-2 px-5 h-14 border border-[#E8EAED] text-sm font-medium text-[#0D0F12] bg-white hover:bg-[#F7F8FA] disabled:opacity-40 disabled:cursor-not-allowed transition-colors${aiLoading ? ' animate-pulse' : ''}`}
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            >
              {aiLoading ? 'Searching...' : (
                <>
                  Search
                  <span className="text-xs font-semibold tracking-wider text-white bg-[#0066FF] px-1.5 py-0.5 rounded-sm">AI</span>
                </>
              )}
            </button>
            {aiResults !== null && (
              <button
                onClick={clearAI}
                className="px-4 h-14 border border-[#E8EAED] bg-white text-sm text-[#868E9C] hover:text-[#0D0F12] hover:border-[#0066FF] transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Browse pills — single row */}
        <div className="mb-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-2">
            {BODY_PILLS.map((pill) => (
              <button
                key={`body-${pill.key}`}
                onClick={() => setFilters((f) => ({ ...f, bodyType: pill.key }))}
                className={`flex-shrink-0 h-7 px-3.5 rounded-full text-xs font-medium border transition-colors ${
                  filters.bodyType.toLowerCase() === pill.key
                    ? 'bg-[#0066FF] text-white border-[#0066FF]'
                    : 'bg-white text-[#868E9C] border-[#E8EAED] hover:border-[#0066FF] hover:text-[#0D0F12]'
                }`}
              >
                {pill.label}
              </button>
            ))}
            <span className="flex-shrink-0 w-px h-4 bg-[#E8EAED] mx-1" />
            {POWERTRAIN_PILLS.filter((p) => p.key !== '').map((pill) => (
              <button
                key={`pt-${pill.key}`}
                onClick={() => setFilters((f) => ({ ...f, fuelType: filters.fuelType === pill.key ? '' : pill.key }))}
                className={`flex-shrink-0 h-7 px-3.5 rounded-full text-xs font-medium border transition-colors ${
                  filters.fuelType === pill.key
                    ? 'bg-[#0066FF] text-white border-[#0066FF]'
                    : 'bg-white text-[#868E9C] border-[#E8EAED] hover:border-[#0066FF] hover:text-[#0D0F12]'
                }`}
              >
                {pill.label}
              </button>
            ))}
            <span className="flex-shrink-0 w-px h-4 bg-[#E8EAED] mx-1" />
            {BUDGET_PILLS.filter((p) => p.key !== 'any').map((pill) => (
              <button
                key={`budget-${pill.key}`}
                onClick={() => setFilters((f) => ({
                  ...f,
                  budgetMin: activeBudgetKey === pill.key ? 0 : pill.min,
                  budgetMax: activeBudgetKey === pill.key ? 250000 : pill.max,
                }))}
                className={`flex-shrink-0 h-7 px-3.5 rounded-full text-xs font-medium border transition-colors ${
                  activeBudgetKey === pill.key
                    ? 'bg-[#0066FF] text-white border-[#0066FF]'
                    : 'bg-white text-[#868E9C] border-[#E8EAED] hover:border-[#0066FF] hover:text-[#0D0F12]'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Filters toggle + count */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg border text-sm font-semibold transition-colors bg-[#0066FF] text-white border-[#0066FF] hover:bg-blue-700"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {panelFilterCount > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white text-[#0066FF] text-[10px] font-bold">
                  {panelFilterCount}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`} />
            </button>
            {!showCategoryRows && (
              <p className="text-sm text-[#868E9C]">
                {displayedVehicles.length} vehicle{displayedVehicles.length !== 1 ? 's' : ''} found
                {aiResults !== null && ` — ${aiResults.length} AI-matched`}
              </p>
            )}
          </div>

          {/* Collapsible filter panel */}
          {filtersOpen && (
            <div className="mt-3 p-4 bg-white rounded-xl border border-[#E8EAED] shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-[#0D0F12] mb-1">Make</label>
                  <select
                    value={filters.make}
                    onChange={(e) => setFilters({ ...filters, make: e.target.value, model: '' })}
                    className="w-full px-3 py-2 border border-[#E8EAED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                  >
                    <option value="">All Makes</option>
                    {makes.map(make => (
                      <option key={make} value={make}>{make}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0D0F12] mb-1">Model</label>
                  <select
                    value={filters.model}
                    onChange={(e) => setFilters({ ...filters, model: e.target.value })}
                    disabled={!filters.make}
                    className="w-full px-3 py-2 border border-[#E8EAED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066FF] disabled:bg-[#F7F8FA] disabled:cursor-not-allowed"
                  >
                    <option value="">All Models</option>
                    {models.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0D0F12] mb-1">Body Type</label>
                  <select
                    value={filters.bodyType}
                    onChange={(e) => setFilters({ ...filters, bodyType: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8EAED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                  >
                    <option value="">All Types</option>
                    {bodyTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0D0F12] mb-1">Fuel Type</label>
                  <select
                    value={filters.fuelType}
                    onChange={(e) => setFilters({ ...filters, fuelType: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8EAED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                  >
                    <option value="">All Fuels</option>
                    {fuelTypes.map(fuel => (
                      <option key={fuel} value={fuel}>{fuel}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-[#0D0F12] mb-1">Budget</label>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <label className="block text-xs text-[#868E9C] mb-1">Min</label>
                    <input
                      type="number"
                      value={filters.budgetMin}
                      onChange={(e) => setFilters({ ...filters, budgetMin: Math.min(Number(e.target.value), filters.budgetMax) })}
                      min="0"
                      max="250000"
                      className="w-full px-3 py-2 border border-[#E8EAED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#868E9C] mb-1">Max</label>
                    <input
                      type="number"
                      value={filters.budgetMax}
                      onChange={(e) => setFilters({ ...filters, budgetMax: Math.max(Number(e.target.value), filters.budgetMin) })}
                      min="0"
                      max="250000"
                      className="w-full px-3 py-2 border border-[#E8EAED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                    />
                  </div>
                </div>

                <div className="px-2">
                  <div className="relative h-2 bg-[#E8EAED] rounded-full">
                    <div
                      className="absolute h-2 bg-[#0066FF] rounded-full"
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
                      className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0066FF] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#0066FF] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
                      style={{ zIndex: filters.budgetMin > filters.budgetMax - 10000 ? 5 : 3 }}
                    />
                    <input
                      type="range"
                      min="0"
                      max="250000"
                      step="5000"
                      value={filters.budgetMax}
                      onChange={(e) => setFilters({ ...filters, budgetMax: Math.max(parseInt(e.target.value), filters.budgetMin) })}
                      className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0066FF] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#0066FF] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
                      style={{ zIndex: 4 }}
                    />
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <AdvancedFiltersPanel
                  value={advancedFilters}
                  onChange={setAdvancedFilters}
                  onClear={() => setAdvancedFilters(defaultAdvancedFilters)}
                />
              </div>

              <div className="flex justify-end pt-2 border-t border-[#E8EAED]">
                <button
                  onClick={() => {
                    setFilters({ make: '', model: '', bodyType: '', fuelType: '', budgetMin: 0, budgetMax: 250000 });
                    setAdvancedFilters(defaultAdvancedFilters);
                  }}
                  className="text-sm text-[#0D0F12] hover:text-[#868E9C] font-medium"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Category rows (default) or flat grid (when filters active / AI results) */}
        {showCategoryRows ? (
          <>
          <div className="space-y-12">
            {(showAllCategories ? categoryRows : categoryRows.slice(0, 3)).map((row) => (
              <div key={row.label}>
                <h2 className="font-heading font-bold text-[#0D0F12] mb-4" style={{ fontSize: 18 }}>
                  {row.label}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {row.vehicles.map((vehicle) => renderCard(vehicle))}
                </div>
              </div>
            ))}
            {categoryRows.length === 0 && (
              <div className="text-center py-12">
                <p className="text-lg text-[#868E9C]">No vehicles available</p>
              </div>
            )}
            {!showAllCategories && categoryRows.length > 3 && (
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <button
                  onClick={() => setShowAllCategories(true)}
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#0066FF',
                    background: 'transparent',
                    border: '1.5px solid #E8EAED',
                    borderRadius: '8px',
                    padding: '12px 28px',
                    cursor: 'pointer',
                  }}
                >
                  See more categories
                </button>
              </div>
            )}
          </div>

          {/* Why Auto Atlas */}
          <div style={{
            background: '#0D0F12',
            borderRadius: '16px',
            padding: '56px 48px',
            marginTop: '64px',
          }}>
            <h2 style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '28px',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.5px',
              marginBottom: '40px',
              textAlign: 'center',
            }}>
              Car shopping, finally done right
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '48px',
            }}>
              {[
                {
                  heading: 'Tell us what you need',
                  body: 'Describe your ideal car in plain English. Our AI reads between the lines — budget, lifestyle, priorities — and finds the best matches with honest explanations.',
                },
                {
                  heading: 'See everything, decide confidently',
                  body: 'Compare real specs and pricing across every trim and variant, side by side. No dealer spin. No missing information. Just the full picture.',
                },
                {
                  heading: 'Save it. Come back. No rush.',
                  body: "Build your Garage as you browse. Your shortlist is always there when you're ready to take the next step.",
                },
              ].map(({ heading, body }) => (
                <div key={heading}>
                  <div style={{
                    width: '32px',
                    height: '2px',
                    background: '#0066FF',
                    marginBottom: '16px',
                  }} />
                  <h3 style={{
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: '17px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    marginBottom: '10px',
                    letterSpacing: '-0.2px',
                  }}>
                    {heading}
                  </h3>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    lineHeight: '1.7',
                    color: '#868E9C',
                    margin: 0,
                  }}>
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedVehicles.map((vehicle) => renderCard(vehicle))}
            </div>

            {displayedVehicles.length === 0 && (
              <div className="text-center py-12">
                {aiLoading ? (
                  <>
                    <div className="w-8 h-8 border-2 border-[#E8EAED] border-t-[#0066FF] rounded-full mx-auto mb-4 animate-spin" />
                    <p className="text-lg text-[#868E9C]">{loadingMessage}</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg text-[#868E9C]">No vehicles found matching your criteria</p>
                    <p className="text-sm text-[#868E9C] mt-2">Try adjusting your filters to see more results</p>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

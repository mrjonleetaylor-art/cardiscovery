import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

// Tailwind thumb classes — written as a single string so the JIT scanner finds every class.
const THUMB_CLASSES =
  'absolute w-full h-2 appearance-none bg-transparent pointer-events-none ' +
  '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none ' +
  '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 ' +
  '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-900 ' +
  '[&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 ' +
  '[&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md ' +
  '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none ' +
  '[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 ' +
  '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-slate-900 ' +
  '[&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 ' +
  '[&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md';

const INPUT_CLASSES =
  'block w-full mt-0.5 px-2 py-1 text-xs border border-slate-300 rounded ' +
  'focus:outline-none focus:ring-1 focus:ring-slate-900';

function pct(value: number, min: number, max: number) {
  return ((value - min) / (max - min)) * 100;
}

function rangeLabel(
  valueMin: number | null,
  valueMax: number | null,
  unit: string,
  fmt: (v: number) => string,
): string {
  if (valueMin === null && valueMax === null) return 'Any';
  if (valueMin !== null && valueMax === null) return `≥\u202f${fmt(valueMin)}\u202f${unit}`;
  if (valueMin === null && valueMax !== null) return `≤\u202f${fmt(valueMax)}\u202f${unit}`;
  return `${fmt(valueMin!)}\u2013${fmt(valueMax!)}\u202f${unit}`;
}

/**
 * Converts a pointer clientX into a value snapped to `step` and clamped to [min, max].
 * Uses the track element's bounding rect for accurate pixel-to-value mapping.
 */
function valueFromPointer(
  clientX: number,
  trackEl: HTMLElement,
  min: number,
  max: number,
  step: number,
): number {
  const rect = trackEl.getBoundingClientRect();
  const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  const raw = min + fraction * (max - min);
  const snapped = Math.round((raw - min) / step) * step + min;
  return Math.min(max, Math.max(min, snapped));
}

/**
 * Numeric fine-tune input with local draft state.
 * Commits a clamped value to the parent on blur or Enter.
 */
function SliderInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  // Keep draft in sync when external value changes (e.g. slider moved).
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const n = parseFloat(draft);
    if (isNaN(n)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, n));
    setDraft(String(clamped));
    onChange(clamped);
  };

  return (
    <label className="block text-xs text-slate-500">
      {label}
      <input
        type="number"
        value={draft}
        min={min}
        max={max}
        step={step}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
        className={INPUT_CLASSES}
      />
    </label>
  );
}

/*
 * Manual QA checklist for track-click behaviour (all slider types):
 *   ✓ Click near left end  → min thumb moves there (Double) / value set (Single)
 *   ✓ Click near right end → max thumb moves there (Double) / value set (Single)
 *   ✓ Click between thumbs → nearest thumb moves (Double)
 *   ✓ Drag from track keeps the same thumb captured for the duration
 *   ✓ Click cannot cross thumbs (clamped to the other thumb's value)
 *   ✓ After click, arrow keys adjust the moved thumb (focus forwarded via ref)
 *   ✓ Tab still cycles both thumbs in DoubleRangeSlider
 *   ✓ Clicking a thumb itself does NOT trigger track logic (guarded by e.target check)
 */

/**
 * Double-ended (min + max) range slider.
 * Null on either end = "no constraint on that side".
 * When thumb reaches its boundary the corresponding value becomes null.
 */
export function DoubleRangeSlider({
  label,
  min,
  max,
  step,
  valueMin,
  valueMax,
  onChange,
  unit,
  formatValue = (v) => String(v),
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  valueMin: number | null;
  valueMax: number | null;
  onChange: (min: number | null, max: number | null) => void;
  unit: string;
  formatValue?: (v: number) => string;
}) {
  const displayMin = Math.min(max, Math.max(min, valueMin ?? min));
  const displayMax = Math.min(max, Math.max(min, valueMax ?? max));

  // Refs for focus-forwarding after track clicks and drag tracking.
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);
  const dragThumb = useRef<'min' | 'max' | null>(null);

  // --- Native thumb handlers ---
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.min(Number(e.target.value), displayMax);
    onChange(v <= min ? null : v, valueMax);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.max(Number(e.target.value), displayMin);
    onChange(valueMin, v >= max ? null : v);
  };

  // --- Numeric input handlers ---
  const handleInputMin = (v: number) => {
    const clamped = Math.min(v, displayMax);
    onChange(clamped <= min ? null : clamped, valueMax);
  };

  const handleInputMax = (v: number) => {
    const clamped = Math.max(v, displayMin);
    onChange(valueMin, clamped >= max ? null : clamped);
  };

  // --- Track click / drag handlers ---
  const applyTrackValue = (v: number, thumb: 'min' | 'max') => {
    if (thumb === 'min') {
      const clamped = Math.min(v, displayMax);
      onChange(clamped <= min ? null : clamped, valueMax);
    } else {
      const clamped = Math.max(v, displayMin);
      onChange(valueMin, clamped >= max ? null : clamped);
    }
  };

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Let native thumb drag proceed uninterrupted.
    if (e.target instanceof HTMLInputElement) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    const v = valueFromPointer(e.clientX, e.currentTarget, min, max, step);

    // Choose the thumb closest to the clicked value.
    const thumb =
      Math.abs(v - displayMin) <= Math.abs(v - displayMax) ? 'min' : 'max';
    dragThumb.current = thumb;
    applyTrackValue(v, thumb);

    // Forward focus so arrow-key adjustments work immediately.
    (thumb === 'min' ? minRef : maxRef).current?.focus();
  };

  const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId) || !dragThumb.current) return;
    const v = valueFromPointer(e.clientX, e.currentTarget, min, max, step);
    applyTrackValue(v, dragThumb.current);
  };

  const handleTrackPointerUp = () => {
    dragThumb.current = null;
  };

  const left = pct(displayMin, min, max);
  const right = 100 - pct(displayMax, min, max);

  return (
    <div>
      {/* 1. Header */}
      <p className="text-xs font-medium text-slate-600 mb-2">
        {label}
        <span className="ml-1.5 font-normal text-slate-400">
          {rangeLabel(valueMin, valueMax, unit, formatValue)}
        </span>
      </p>
      {/* 2. Inputs above the track */}
      <div className="grid grid-cols-2 gap-3">
        <SliderInput
          label="Min"
          value={displayMin}
          min={min}
          max={displayMax}
          step={step}
          onChange={handleInputMin}
        />
        <SliderInput
          label="Max"
          value={displayMax}
          min={displayMin}
          max={max}
          step={step}
          onChange={handleInputMax}
        />
      </div>
      {/* 3. Track */}
      <div className="px-1 mt-2">
        <div
          className="relative h-2 cursor-pointer"
          onPointerDown={handleTrackPointerDown}
          onPointerMove={handleTrackPointerMove}
          onPointerUp={handleTrackPointerUp}
          onPointerCancel={handleTrackPointerUp}
        >
          <div className="absolute inset-0 bg-slate-200 rounded-full" />
          <div
            className="absolute h-2 bg-slate-900 rounded-full"
            style={{ left: `${left}%`, right: `${right}%` }}
          />
          <input
            ref={minRef}
            type="range"
            min={min}
            max={max}
            step={step}
            value={displayMin}
            onChange={handleMinChange}
            aria-label={`${label} min`}
            className={THUMB_CLASSES}
            style={{ zIndex: displayMin >= displayMax - step ? 5 : 3 }}
          />
          <input
            ref={maxRef}
            type="range"
            min={min}
            max={max}
            step={step}
            value={displayMax}
            onChange={handleMaxChange}
            aria-label={`${label} max`}
            className={THUMB_CLASSES}
            style={{ zIndex: 4 }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Single-ended MAX slider.
 * null = no constraint. When thumb reaches the max boundary the value becomes null.
 */
export function SingleMaxSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  unit,
  formatValue = (v) => String(v),
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number | null;
  onChange: (v: number | null) => void;
  unit: string;
  formatValue?: (v: number) => string;
}) {
  const displayVal = Math.min(max, Math.max(min, value ?? max));
  const right = 100 - pct(displayVal, min, max);

  const inputRef = useRef<HTMLInputElement>(null);

  // --- Native thumb handler ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    onChange(v >= max ? null : v);
  };

  // --- Numeric input handler ---
  const handleInput = (v: number) => {
    onChange(v >= max ? null : v);
  };

  // --- Track click / drag handlers ---
  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLInputElement) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const v = valueFromPointer(e.clientX, e.currentTarget, min, max, step);
    onChange(v >= max ? null : v);
    inputRef.current?.focus();
  };

  const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const v = valueFromPointer(e.clientX, e.currentTarget, min, max, step);
    onChange(v >= max ? null : v);
  };

  return (
    <div>
      {/* 1. Header */}
      <p className="text-xs font-medium text-slate-600 mb-2">
        {label}
        <span className="ml-1.5 font-normal text-slate-400">
          {value === null ? 'Any' : `≤\u202f${formatValue(value)}\u202f${unit}`}
        </span>
      </p>
      {/* 2. Input + clear above the track */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <SliderInput
            label="Max"
            value={displayVal}
            min={min}
            max={max}
            step={step}
            onChange={handleInput}
          />
        </div>
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 mb-0.5 p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Clear"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      {/* 3. Track */}
      <div className="px-1 mt-2">
        <div
          className="relative h-2 cursor-pointer"
          onPointerDown={handleTrackPointerDown}
          onPointerMove={handleTrackPointerMove}
          onPointerUp={() => {}}
          onPointerCancel={() => {}}
        >
          <div className="absolute inset-0 bg-slate-200 rounded-full" />
          <div
            className="absolute h-2 bg-slate-900 rounded-full"
            style={{ left: '0%', right: `${right}%` }}
          />
          <input
            ref={inputRef}
            type="range"
            min={min}
            max={max}
            step={step}
            value={displayVal}
            onChange={handleChange}
            aria-label={`${label} max`}
            className={THUMB_CLASSES}
            style={{ zIndex: 3 }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Single-ended MIN slider.
 * null = no constraint. When thumb reaches the min boundary the value becomes null.
 * Track fills from the thumb to the right, showing "this value and above".
 */
export function SingleMinSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  unit,
  formatValue = (v) => String(v),
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number | null;
  onChange: (v: number | null) => void;
  unit: string;
  formatValue?: (v: number) => string;
}) {
  const displayVal = Math.min(max, Math.max(min, value ?? min));
  const left = pct(displayVal, min, max);

  const inputRef = useRef<HTMLInputElement>(null);

  // --- Native thumb handler ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    onChange(v <= min ? null : v);
  };

  // --- Numeric input handler ---
  const handleInput = (v: number) => {
    onChange(v <= min ? null : v);
  };

  // --- Track click / drag handlers ---
  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLInputElement) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const v = valueFromPointer(e.clientX, e.currentTarget, min, max, step);
    onChange(v <= min ? null : v);
    inputRef.current?.focus();
  };

  const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const v = valueFromPointer(e.clientX, e.currentTarget, min, max, step);
    onChange(v <= min ? null : v);
  };

  return (
    <div>
      {/* 1. Header */}
      <p className="text-xs font-medium text-slate-600 mb-2">
        {label}
        <span className="ml-1.5 font-normal text-slate-400">
          {value === null ? 'Any' : `≥\u202f${formatValue(value)}\u202f${unit}`}
        </span>
      </p>
      {/* 2. Input + clear above the track */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <SliderInput
            label="Min"
            value={displayVal}
            min={min}
            max={max}
            step={step}
            onChange={handleInput}
          />
        </div>
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 mb-0.5 p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Clear"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      {/* 3. Track */}
      <div className="px-1 mt-2">
        <div
          className="relative h-2 cursor-pointer"
          onPointerDown={handleTrackPointerDown}
          onPointerMove={handleTrackPointerMove}
          onPointerUp={() => {}}
          onPointerCancel={() => {}}
        >
          <div className="absolute inset-0 bg-slate-200 rounded-full" />
          <div
            className="absolute h-2 bg-slate-900 rounded-full"
            style={{ left: `${left}%`, right: '0%' }}
          />
          <input
            ref={inputRef}
            type="range"
            min={min}
            max={max}
            step={step}
            value={displayVal}
            onChange={handleChange}
            aria-label={`${label} min`}
            className={THUMB_CLASSES}
            style={{ zIndex: 3 }}
          />
        </div>
      </div>
    </div>
  );
}

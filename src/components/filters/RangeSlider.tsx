import { useEffect, useState } from 'react';
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

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.min(Number(e.target.value), displayMax);
    onChange(v <= min ? null : v, valueMax);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.max(Number(e.target.value), displayMin);
    onChange(valueMin, v >= max ? null : v);
  };

  const handleInputMin = (v: number) => {
    const clamped = Math.min(v, displayMax);
    onChange(clamped <= min ? null : clamped, valueMax);
  };

  const handleInputMax = (v: number) => {
    const clamped = Math.max(v, displayMin);
    onChange(valueMin, clamped >= max ? null : clamped);
  };

  const left = pct(displayMin, min, max);
  const right = 100 - pct(displayMax, min, max);

  return (
    <div>
      <p className="text-xs font-medium text-slate-600 mb-2">
        {label}
        <span className="ml-1.5 font-normal text-slate-400">
          {rangeLabel(valueMin, valueMax, unit, formatValue)}
        </span>
      </p>
      <div className="px-1">
        <div className="relative h-2">
          <div className="absolute inset-0 bg-slate-200 rounded-full" />
          <div
            className="absolute h-2 bg-slate-900 rounded-full"
            style={{ left: `${left}%`, right: `${right}%` }}
          />
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={displayMin}
            onChange={handleMinChange}
            aria-label={`${label} minimum`}
            className={THUMB_CLASSES}
            style={{ zIndex: displayMin >= displayMax - step ? 5 : 3 }}
          />
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={displayMax}
            onChange={handleMaxChange}
            aria-label={`${label} maximum`}
            className={THUMB_CLASSES}
            style={{ zIndex: 4 }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    onChange(v >= max ? null : v);
  };

  const handleInput = (v: number) => {
    onChange(v >= max ? null : v);
  };

  return (
    <div>
      <p className="text-xs font-medium text-slate-600 mb-2">
        {label}
        <span className="ml-1.5 font-normal text-slate-400">
          {value === null ? 'Any' : `≤\u202f${formatValue(value)}\u202f${unit}`}
        </span>
      </p>
      <div className="px-1">
        <div className="relative h-2">
          <div className="absolute inset-0 bg-slate-200 rounded-full" />
          <div
            className="absolute h-2 bg-slate-900 rounded-full"
            style={{ left: '0%', right: `${right}%` }}
          />
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={displayVal}
            onChange={handleChange}
            aria-label={`${label} maximum`}
            className={THUMB_CLASSES}
            style={{ zIndex: 3 }}
          />
        </div>
      </div>
      <div className="flex items-end gap-1.5 mt-2">
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    onChange(v <= min ? null : v);
  };

  const handleInput = (v: number) => {
    onChange(v <= min ? null : v);
  };

  return (
    <div>
      <p className="text-xs font-medium text-slate-600 mb-2">
        {label}
        <span className="ml-1.5 font-normal text-slate-400">
          {value === null ? 'Any' : `≥\u202f${formatValue(value)}\u202f${unit}`}
        </span>
      </p>
      <div className="px-1">
        <div className="relative h-2">
          <div className="absolute inset-0 bg-slate-200 rounded-full" />
          <div
            className="absolute h-2 bg-slate-900 rounded-full"
            style={{ left: `${left}%`, right: '0%' }}
          />
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={displayVal}
            onChange={handleChange}
            aria-label={`${label} minimum`}
            className={THUMB_CLASSES}
            style={{ zIndex: 3 }}
          />
        </div>
      </div>
      <div className="flex items-end gap-1.5 mt-2">
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
    </div>
  );
}

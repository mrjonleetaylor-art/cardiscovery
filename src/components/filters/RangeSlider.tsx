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
  const displayMin = valueMin ?? min;
  const displayMax = valueMax ?? max;

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.min(Number(e.target.value), displayMax);
    onChange(v <= min ? null : v, valueMax);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.max(Number(e.target.value), displayMin);
    onChange(valueMin, v >= max ? null : v);
  };

  const left = pct(displayMin, min, max);
  const right = 100 - pct(displayMax, min, max);

  return (
    <div>
      <p className="text-xs font-medium text-slate-600 mb-2">{label}</p>
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
            className={THUMB_CLASSES}
            style={{ zIndex: 4 }}
          />
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-1.5">
        {rangeLabel(valueMin, valueMax, unit, formatValue)}
      </p>
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
  const displayVal = value ?? max;
  const right = 100 - pct(displayVal, min, max);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    onChange(v >= max ? null : v);
  };

  return (
    <div>
      <p className="text-xs font-medium text-slate-600 mb-2">{label}</p>
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
            className={THUMB_CLASSES}
            style={{ zIndex: 3 }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-xs text-slate-500">
          {value === null ? 'Any' : `≤\u202f${formatValue(value)}\u202f${unit}`}
        </p>
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex items-center text-xs text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Clear"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

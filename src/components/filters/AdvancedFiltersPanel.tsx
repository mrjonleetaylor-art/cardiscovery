import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AdvancedFilters, countActiveAdvancedFilters } from '../../lib/advancedFilters';
import { DoubleRangeSlider, SingleMaxSlider } from './RangeSlider';

const DRIVETRAINS = ['FWD', 'RWD', 'AWD'];
const TRANSMISSIONS = ['Automatic', 'Manual', 'CVT', 'Dual-clutch'];

function MultiChip({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-all ${
            selected.includes(opt)
              ? 'bg-slate-900 text-white border-slate-900'
              : 'border-slate-300 text-slate-700 hover:border-slate-500'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function NumInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value === '' ? null : Number(e.target.value);
          onChange(v);
        }}
        placeholder="—"
        className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
      />
    </div>
  );
}

function BoolToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-slate-300 accent-slate-900"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

export function AdvancedFiltersPanel({
  value,
  onChange,
  onClear,
}: {
  value: AdvancedFilters;
  onChange: (next: AdvancedFilters) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const count = countActiveAdvancedFilters(value);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="text-sm font-medium text-slate-700">
          Advanced filters{count > 0 && <span className="ml-1 font-semibold text-slate-900">({count})</span>}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="p-3 border-t border-slate-200 space-y-4">

          {/* Performance — 2-col: sliders left, pills + warranty right */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Performance</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Left: sliders */}
              <div className="space-y-5">
                <DoubleRangeSlider
                  label="Power (kW)"
                  min={50}
                  max={800}
                  step={5}
                  valueMin={value.powerMin}
                  valueMax={value.powerMax}
                  onChange={(mn, mx) => onChange({ ...value, powerMin: mn, powerMax: mx })}
                  unit="kW"
                />
                <SingleMaxSlider
                  label="0–100 km/h max"
                  min={1.5}
                  max={15}
                  step={0.1}
                  value={value.zeroToHundredMax}
                  onChange={(v) => onChange({ ...value, zeroToHundredMax: v })}
                  unit="s"
                  formatValue={(v) => v.toFixed(1)}
                />
                <DoubleRangeSlider
                  label="Power-to-weight (kW/t)"
                  min={50}
                  max={500}
                  step={5}
                  valueMin={value.powerToWeightMin}
                  valueMax={value.powerToWeightMax}
                  onChange={(mn, mx) => onChange({ ...value, powerToWeightMin: mn, powerToWeightMax: mx })}
                  unit="kW/t"
                />
              </div>

              {/* Right: drivetrain + transmission pills + warranty */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-1.5">Drivetrain</p>
                  <MultiChip
                    options={DRIVETRAINS}
                    selected={value.drivetrains}
                    onChange={(v) => onChange({ ...value, drivetrains: v })}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-1.5">Transmission</p>
                  <MultiChip
                    options={TRANSMISSIONS}
                    selected={value.transmissions}
                    onChange={(v) => onChange({ ...value, transmissions: v })}
                  />
                </div>
                <NumInput
                  label="Warranty min (years)"
                  value={value.warrantyMin}
                  onChange={(v) => onChange({ ...value, warrantyMin: v })}
                />
              </div>
            </div>
          </div>

          {/* Efficiency */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Efficiency</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <NumInput
                label="Fuel economy max (L/100km)"
                value={value.fuelEconomyMax}
                onChange={(v) => onChange({ ...value, fuelEconomyMax: v })}
              />
              <NumInput
                label="Annual running cost max (AUD)"
                value={value.annualRunningCostMax}
                onChange={(v) => onChange({ ...value, annualRunningCostMax: v })}
              />
            </div>
          </div>

          {/* Tech */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tech</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <BoolToggle
                label="Apple CarPlay"
                value={value.requireAppleCarPlay}
                onChange={(v) => onChange({ ...value, requireAppleCarPlay: v })}
              />
              <BoolToggle
                label="Android Auto"
                value={value.requireAndroidAuto}
                onChange={(v) => onChange({ ...value, requireAndroidAuto: v })}
              />
              <BoolToggle
                label="Wireless charging"
                value={value.requireWirelessCharging}
                onChange={(v) => onChange({ ...value, requireWirelessCharging: v })}
              />
              <BoolToggle
                label="OTA updates"
                value={value.requireOtaUpdates}
                onChange={(v) => onChange({ ...value, requireOtaUpdates: v })}
              />
            </div>
          </div>

          {/* Clear advanced filters */}
          {count > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClear}
                className="text-sm text-slate-700 hover:text-slate-900 font-medium"
              >
                Clear advanced filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

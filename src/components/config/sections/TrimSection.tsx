import { StructuredVehicle } from '../../../types/specs';

export function TrimSection({
  vehicle,
  selectedTrimId,
  onSelectTrim,
  isSidebar,
  btnBase,
  btnOn,
  btnOff,
  gridClass,
}: {
  vehicle: StructuredVehicle;
  selectedTrimId: string | null | undefined;
  onSelectTrim: (trimId: string) => void;
  isSidebar: boolean;
  btnBase: string;
  btnOn: string;
  btnOff: string;
  gridClass: string;
}) {
  return (
    <div className="mb-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
        Step 1 · Select Trim
      </p>
      {isSidebar ? (
        <select
          value={selectedTrimId || vehicle.trims[0].id}
          onChange={e => onSelectTrim(e.target.value)}
          className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
        >
          {vehicle.trims.map(trim => {
            const delta = trim.basePrice - vehicle.trims[0].basePrice;
            return (
              <option key={trim.id} value={trim.id}>
                {trim.name}{delta > 0 ? ` (+$${delta.toLocaleString()})` : ''}
              </option>
            );
          })}
        </select>
      ) : (
        <div className={gridClass}>
          {vehicle.trims.map(trim => {
            const delta = trim.basePrice - vehicle.trims[0].basePrice;
            const isSelected = selectedTrimId === trim.id;
            return (
              <button
                key={trim.id}
                type="button"
                onClick={() => onSelectTrim(trim.id)}
                className={`${btnBase} ${isSelected ? btnOn : btnOff}`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">{trim.name}</span>
                  <span className="text-sm">{delta > 0 ? `+$${delta.toLocaleString()}` : 'Base'}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

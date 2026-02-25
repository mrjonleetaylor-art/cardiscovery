import { ConfigOption } from '../../../types/config';

export function SubvariantSection({
  label,
  subvariants,
  selectedSubvariantId,
  onToggleSubvariant,
  showDescriptions,
  isSidebar,
  btnBase,
  btnOn,
  btnOff,
  gridClass,
}: {
  label: string;
  subvariants: ConfigOption[];
  selectedSubvariantId: string | null | undefined;
  onToggleSubvariant: (subvariantId: string) => void;
  showDescriptions: boolean;
  isSidebar: boolean;
  btnBase: string;
  btnOn: string;
  btnOff: string;
  gridClass: string;
}) {
  return (
    <div className="mb-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{label}</p>
      <div className={gridClass}>
        {subvariants.map(s => {
          const isSelected = selectedSubvariantId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggleSubvariant(s.id)}
              className={`${btnBase} ${isSelected ? btnOn : btnOff}`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">{s.name}</span>
                <span className={`text-sm ${isSidebar ? 'text-slate-600' : ''}`}>
                  {s.priceDelta && s.priceDelta > 0 ? `+$${s.priceDelta.toLocaleString()}` : 'Base'}
                </span>
              </div>
              {showDescriptions && s.description && (
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{s.description}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

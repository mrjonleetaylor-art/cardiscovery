import { Pack } from '../../../types/specs';

export function PacksSection({
  label,
  packs,
  selectedPackIds,
  onTogglePack,
  btnBase,
  btnOn,
  btnOff,
  gridClass,
}: {
  label: string;
  packs: Pack[];
  selectedPackIds: string[];
  onTogglePack: (packId: string) => void;
  btnBase: string;
  btnOn: string;
  btnOff: string;
  gridClass: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{label}</p>
      <div className={gridClass}>
        {packs.map(pack => {
          const isSelected = selectedPackIds.includes(pack.id);
          return (
            <button
              key={pack.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onTogglePack(pack.id)}
              className={`${btnBase} ${isSelected ? btnOn : btnOff}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-sm">{pack.name}</span>
                <span className="text-sm font-bold">+${pack.priceDelta.toLocaleString()}</span>
              </div>
              {pack.features.length > 0 && (
                <p className="text-xs text-slate-600 line-clamp-2">
                  {pack.features.slice(0, 3).map((f, fi) => (
                    <span key={fi}>• {f} </span>
                  ))}
                  {pack.features.length > 3 && (
                    <span className="italic">+{pack.features.length - 3} more</span>
                  )}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

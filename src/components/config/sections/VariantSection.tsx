import { ConfigOption } from '../../../types/config';

export function VariantSection({
  label,
  variants,
  selectedVariantId,
  onToggleVariant,
  showDescriptions,
  isSidebar,
  btnBase,
  btnOn,
  btnOff,
  gridClass,
}: {
  label: string;
  variants: ConfigOption[];
  selectedVariantId: string | null | undefined;
  onToggleVariant: (variantId: string) => void;
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
        {variants.map(v => {
          const isSelected = selectedVariantId === v.id;
          return (
            <button
              key={v.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggleVariant(v.id)}
              className={`${btnBase} ${isSelected ? btnOn : btnOff}`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">{v.name}</span>
                <span className={`text-sm ${isSidebar ? 'text-slate-600' : ''}`}>
                  {v.priceDelta && v.priceDelta > 0 ? `+$${v.priceDelta.toLocaleString()}` : 'Base'}
                </span>
              </div>
              {showDescriptions && v.description && (
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{v.description}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

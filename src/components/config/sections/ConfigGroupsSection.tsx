import { ConfigGroup } from '../../../types/config';

export function ConfigGroupsSection({
  label,
  group,
  selectedIds,
  onToggleGroupOption,
  showDescriptions,
  isSidebar,
  btnBase,
  btnOn,
  btnOff,
  gridClass,
}: {
  label: string;
  group: ConfigGroup;
  selectedIds: string[];
  onToggleGroupOption: (groupId: string, optionId: string, type: 'single' | 'multi') => void;
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
        {group.options.map(option => {
          const isSelected = group.type === 'single'
            ? selectedIds[0] === option.id
            : selectedIds.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggleGroupOption(group.id, option.id, group.type)}
              className={`${btnBase} ${isSelected ? btnOn : btnOff}`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">{option.name}</span>
                <span className={`text-sm ${isSidebar ? 'text-slate-600' : ''}`}>
                  {option.priceDelta && option.priceDelta > 0
                    ? `+$${option.priceDelta.toLocaleString()}`
                    : 'Base'}
                </span>
              </div>
              {showDescriptions && option.description && (
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{option.description}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

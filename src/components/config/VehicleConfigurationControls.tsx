import { StructuredVehicle, Pack, Trim } from '../../types/specs';
import { VehicleConfigSelection } from '../../types/config';

type ControlsMode = 'panel' | 'sidebar';

export function VehicleConfigurationControls({
  vehicle,
  selection,
  onChange,
  onHeroReset,
  mode = 'panel',
  showPacks = true,
  showConfigGroups = true,
  showDescriptions = true,
}: {
  vehicle: StructuredVehicle;
  selection: VehicleConfigSelection;
  onChange: (selectionPatch: Partial<VehicleConfigSelection>) => void;
  onHeroReset?: () => void;
  mode?: ControlsMode;
  showPacks?: boolean;
  showConfigGroups?: boolean;
  showDescriptions?: boolean;
}) {
  const selectedTrim: Trim = vehicle.trims.find((t) => t.id === selection.trimId) ?? vehicle.trims[0];
  const selectedPackIds = selection.packIds ?? [];
  const packs: Pack[] = selectedTrim?.packs ?? [];
  const isSidebar = mode === 'sidebar';

  const toggleVariant = (variantId: string) => {
    onChange({ variantId: selection.variantId === variantId ? null : variantId });
    onHeroReset?.();
  };

  const toggleSubvariant = (subvariantId: string) => {
    onChange({ subvariantId: selection.subvariantId === subvariantId ? null : subvariantId });
    onHeroReset?.();
  };

  const toggleGroupOption = (groupId: string, optionId: string, type: 'single' | 'multi') => {
    const current = selection.selectedOptionsByGroup ?? {};
    const existing = current[groupId] ?? [];
    let next: string[];
    if (type === 'single') {
      next = existing[0] === optionId ? [] : [optionId];
    } else {
      next = existing.includes(optionId)
        ? existing.filter(id => id !== optionId)
        : [...existing, optionId];
    }
    onChange({ selectedOptionsByGroup: { ...current, [groupId]: next } });
    onHeroReset?.();
  };

  const togglePack = (packId: string) => {
    const nextPackIds = selectedPackIds.includes(packId)
      ? selectedPackIds.filter((id) => id !== packId)
      : [...selectedPackIds, packId];
    onChange({ packIds: nextPackIds });
  };

  return (
    <>
      {vehicle.variants && vehicle.variants.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Configuration</p>
          {vehicle.variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              aria-pressed={selection.variantId === variant.id}
              onClick={() => toggleVariant(variant.id)}
              className={`w-full text-left rounded-lg transition-all ${
                isSidebar ? 'px-4 py-3 border-2' : 'p-3 border'
              } ${
                selection.variantId === variant.id
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">{variant.name}</span>
                <span className={`text-sm ${isSidebar ? 'text-slate-600' : ''}`}>
                  {variant.priceDelta && variant.priceDelta > 0 ? `+$${variant.priceDelta.toLocaleString()}` : 'Base'}
                </span>
              </div>
              {showDescriptions && variant.description && (
                <p className="text-xs text-slate-500 mt-0.5">{variant.description}</p>
              )}
            </button>
          ))}
        </div>
      )}

      {vehicle.subvariants && vehicle.subvariants.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Body Style</p>
          {vehicle.subvariants.map((subvariant) => (
            <button
              key={subvariant.id}
              type="button"
              aria-pressed={selection.subvariantId === subvariant.id}
              onClick={() => toggleSubvariant(subvariant.id)}
              className={`w-full text-left rounded-lg transition-all ${
                isSidebar ? 'px-4 py-3 border-2' : 'p-3 border'
              } ${
                selection.subvariantId === subvariant.id
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">{subvariant.name}</span>
                <span className={`text-sm ${isSidebar ? 'text-slate-600' : ''}`}>
                  {subvariant.priceDelta && subvariant.priceDelta > 0 ? `+$${subvariant.priceDelta.toLocaleString()}` : 'Base'}
                </span>
              </div>
              {showDescriptions && subvariant.description && (
                <p className="text-xs text-slate-500 mt-0.5">{subvariant.description}</p>
              )}
            </button>
          ))}
        </div>
      )}

      {showConfigGroups && vehicle.configGroups && vehicle.configGroups.length > 0 && vehicle.configGroups.map((group) => {
        const selectedIds = selection.selectedOptionsByGroup?.[group.id] ?? [];
        return (
          <div key={group.id} className="space-y-2 mb-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{group.title}</p>
            {group.options.map((option) => {
              const isSelected = group.type === 'single'
                ? selectedIds[0] === option.id
                : selectedIds.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleGroupOption(group.id, option.id, group.type)}
                  className={`w-full text-left rounded-lg transition-all ${
                    isSidebar ? 'px-4 py-3 border-2' : 'p-3 border'
                  } ${
                    isSelected
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{option.name}</span>
                    <span className={`text-sm ${isSidebar ? 'text-slate-600' : ''}`}>
                      {option.priceDelta && option.priceDelta > 0 ? `+$${option.priceDelta.toLocaleString()}` : 'Base'}
                    </span>
                  </div>
                  {showDescriptions && option.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
                  )}
                </button>
              );
            })}
          </div>
        );
      })}

      {vehicle.trims.length > 1 && (
        <div className="space-y-2 mb-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Select Trim</p>
          {isSidebar ? (
            <select
              value={selection.trimId || vehicle.trims[0].id}
              onChange={(e) => onChange({ trimId: e.target.value, packIds: [] })}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
            >
              {vehicle.trims.map((trim) => {
                const delta = trim.basePrice - vehicle.trims[0].basePrice;
                return (
                  <option key={trim.id} value={trim.id}>
                    {trim.name}{delta > 0 ? ` (+$${delta.toLocaleString()})` : ''}
                  </option>
                );
              })}
            </select>
          ) : (
            vehicle.trims.map((trim) => {
              const delta = trim.basePrice - vehicle.trims[0].basePrice;
              return (
                <button
                  key={trim.id}
                  type="button"
                  onClick={() => onChange({ trimId: trim.id, packIds: [] })}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selection.trimId === trim.id
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{trim.name}</span>
                    <span className="text-sm">{delta > 0 ? `+$${delta.toLocaleString()}` : 'Base'}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {showPacks && packs.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Option Packs</p>
          {packs.map((pack) => (
            <button
              key={pack.id}
              type="button"
              aria-pressed={selectedPackIds.includes(pack.id)}
              onClick={() => togglePack(pack.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedPackIds.includes(pack.id)
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-sm">{pack.name}</span>
                <span className="text-sm font-bold">+${pack.priceDelta.toLocaleString()}</span>
              </div>
              {pack.features.length > 0 && (
                <div className="text-xs text-slate-600">
                  {pack.features.slice(0, 3).map((feature, idx) => (
                    <span key={idx}>• {feature} </span>
                  ))}
                  {pack.features.length > 3 && <span className="italic">+{pack.features.length - 3} more</span>}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

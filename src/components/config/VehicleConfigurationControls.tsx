import { StructuredVehicle, Pack, Trim } from '../../types/specs';
import { VehicleConfigSelection, ConfigGroup } from '../../types/config';

type ControlsMode = 'panel' | 'sidebar';

// ─── Layout helpers ───────────────────────────────────────────────────────────

function gridOrList(count: number): string {
  return count <= 6
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
    : 'space-y-2';
}

// ─── Priority ordering ────────────────────────────────────────────────────────

/**
 * Determines render order for gated sections.
 * Lower score = rendered and unlocked earlier.
 * "trim" is handled separately as Step 1; this orders everything after it.
 */
function sectionPriority(title: string): number {
  const t = title.toLowerCase();
  if (t === 'trim') return 0;
  if (t.includes('body')) return 1;
  if (t.includes('transmission')) return 2;
  if (t.includes('assist') || t.includes('assistance')) return 3;
  return 100;
}

// ─── Gated section descriptors ────────────────────────────────────────────────

type GatedSection =
  | { kind: 'variants'; label: string; priority: number }
  | { kind: 'subvariants'; label: string; priority: number }
  | { kind: 'configGroup'; group: ConfigGroup; priority: number };

function buildGatedSections(vehicle: StructuredVehicle): GatedSection[] {
  const sections: GatedSection[] = [];
  if (vehicle.variants?.length) {
    sections.push({ kind: 'variants', label: 'Configuration', priority: sectionPriority('Configuration') });
  }
  if (vehicle.subvariants?.length) {
    sections.push({ kind: 'subvariants', label: 'Body Style', priority: sectionPriority('Body Style') });
  }
  for (const group of vehicle.configGroups ?? []) {
    sections.push({ kind: 'configGroup', group, priority: sectionPriority(group.title) });
  }
  // Stable sort: lower priority score first; original insertion order preserved for ties
  sections.sort((a, b) => a.priority - b.priority);
  return sections;
}

/** True if the user has made at least one selection in this section. */
function sectionHasSelection(section: GatedSection, sel: VehicleConfigSelection): boolean {
  switch (section.kind) {
    case 'variants':    return sel.variantId != null;
    case 'subvariants': return sel.subvariantId != null;
    case 'configGroup': return (sel.selectedOptionsByGroup?.[section.group.id]?.length ?? 0) > 0;
  }
}

// ─── Sanitize ─────────────────────────────────────────────────────────────────

/**
 * Prunes each selection dimension to only IDs that are valid for the given vehicle.
 * Does NOT wipe downstream selections — only removes IDs that no longer exist.
 * Exported so parent pages can reuse it on initial load or vehicle-swap.
 */
export function sanitizeSelectionForVehicle(
  vehicle: StructuredVehicle,
  sel: VehicleConfigSelection,
): VehicleConfigSelection {
  // Trim — fall back to first trim if stored ID is gone
  const validTrim: Trim = vehicle.trims.find(t => t.id === sel.trimId) ?? vehicle.trims[0];
  const trimId = validTrim?.id ?? null;

  // Packs — only keep IDs present in the resolved trim
  const validPackIds = new Set(validTrim?.packs.map(p => p.id) ?? []);
  const packIds = (sel.packIds ?? []).filter(id => validPackIds.has(id));

  // Variant — must exist in vehicle.variants
  const validVariantIds = new Set(vehicle.variants?.map(v => v.id) ?? []);
  const variantId =
    sel.variantId && validVariantIds.has(sel.variantId) ? sel.variantId : null;

  // Subvariant — must exist in vehicle.subvariants
  const validSubvariantIds = new Set(vehicle.subvariants?.map(s => s.id) ?? []);
  const subvariantId =
    sel.subvariantId && validSubvariantIds.has(sel.subvariantId) ? sel.subvariantId : null;

  // ConfigGroups — filter each group's selections to valid option IDs only
  const selectedOptionsByGroup: Record<string, string[]> = {};
  for (const group of vehicle.configGroups ?? []) {
    const validIds = new Set(group.options.map(o => o.id));
    const filtered = (sel.selectedOptionsByGroup?.[group.id] ?? []).filter(id => validIds.has(id));
    if (filtered.length > 0) selectedOptionsByGroup[group.id] = filtered;
  }

  return { variantId, subvariantId, trimId, packIds, selectedOptionsByGroup };
}

// ─── Component ────────────────────────────────────────────────────────────────

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
  onChange: (patch: Partial<VehicleConfigSelection>) => void;
  onHeroReset?: () => void;
  mode?: ControlsMode;
  showPacks?: boolean;
  showConfigGroups?: boolean;
  showDescriptions?: boolean;
}) {
  const selectedTrim: Trim = vehicle.trims.find(t => t.id === selection.trimId) ?? vehicle.trims[0];
  const packs: Pack[] = selectedTrim?.packs ?? [];
  const selectedPackIds = selection.packIds ?? [];
  const isSidebar = mode === 'sidebar';

  /**
   * Merges a patch into the current selection, sanitizes it (removing now-invalid IDs
   * without wiping valid downstream selections), then calls onChange with the result.
   */
  const updateSelection = (patch: Partial<VehicleConfigSelection>) => {
    const merged: VehicleConfigSelection = {
      variantId: selection.variantId ?? null,
      subvariantId: selection.subvariantId ?? null,
      trimId: selection.trimId ?? null,
      packIds: selection.packIds ?? [],
      selectedOptionsByGroup: selection.selectedOptionsByGroup ?? {},
      ...patch,
    };
    onChange(sanitizeSelectionForVehicle(vehicle, merged));
  };

  const toggleVariant = (variantId: string) => {
    updateSelection({ variantId: selection.variantId === variantId ? null : variantId });
    onHeroReset?.();
  };

  const toggleSubvariant = (subvariantId: string) => {
    updateSelection({ subvariantId: selection.subvariantId === subvariantId ? null : subvariantId });
    onHeroReset?.();
  };

  const toggleGroupOption = (groupId: string, optionId: string, type: 'single' | 'multi') => {
    const current = selection.selectedOptionsByGroup ?? {};
    const existing = current[groupId] ?? [];
    const next: string[] =
      type === 'single'
        ? existing[0] === optionId ? [] : [optionId]
        : existing.includes(optionId)
          ? existing.filter(id => id !== optionId)
          : [...existing, optionId];
    updateSelection({ selectedOptionsByGroup: { ...current, [groupId]: next } });
    onHeroReset?.();
  };

  const togglePack = (packId: string) => {
    updateSelection({
      packIds: selectedPackIds.includes(packId)
        ? selectedPackIds.filter(id => id !== packId)
        : [...selectedPackIds, packId],
    });
  };

  // Button classes
  const btnBase = isSidebar
    ? 'w-full h-full text-left rounded-lg border-2 px-4 py-3 transition-all'
    : 'w-full h-full text-left p-3 rounded-lg border transition-all';
  const btnOn  = 'border-slate-900 bg-slate-50';
  const btnOff = 'border-slate-200 hover:border-slate-300';

  // ─── Gating ──────────────────────────────────────────────────────────────

  const showTrimSelector = vehicle.trims.length > 1;

  // Build the ordered list of all secondary config sections
  const gatedSections = buildGatedSections(vehicle).filter(
    s => showConfigGroups || s.kind !== 'configGroup',
  );

  // Determine visibility: section[N] is visible only if all sections 0..N-1 have a selection
  // Trim is always pre-selected (parents initialise trimId to trims[0].id), so gating starts open
  let _gate = true;
  const sectionVisible = gatedSections.map(section => {
    const visible = _gate;
    if (visible) _gate = sectionHasSelection(section, selection);
    return visible;
  });
  // Packs visible only when every visible gated section also has a selection
  const packsVisible = _gate;

  // Pre-compute step labels (only count visible sections)
  let step = showTrimSelector ? 2 : 1;
  const sectionStepLabel = gatedSections.map((section, i) => {
    if (!sectionVisible[i]) return '';
    const title = section.kind === 'configGroup' ? section.group.title : section.label;
    return `Step ${step++} · ${title}`;
  });
  const packsStepLabel = `Step ${step} · Option Packs`;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Step 1: Trim selector ─────────────────────────────────────────── */}
      {showTrimSelector && (
        <div className="mb-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
            Step 1 · Select Trim
          </p>
          {isSidebar ? (
            <select
              value={selection.trimId || vehicle.trims[0].id}
              onChange={e => updateSelection({ trimId: e.target.value })}
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
            <div className={gridOrList(vehicle.trims.length)}>
              {vehicle.trims.map(trim => {
                const delta = trim.basePrice - vehicle.trims[0].basePrice;
                const isSelected = selection.trimId === trim.id;
                return (
                  <button
                    key={trim.id}
                    type="button"
                    onClick={() => updateSelection({ trimId: trim.id })}
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
      )}

      {/* ── Gated sections (variants / subvariants / configGroups) ─────────── */}
      {gatedSections.map((section, idx) => {
        if (!sectionVisible[idx]) return null;
        const label = sectionStepLabel[idx];

        if (section.kind === 'variants') {
          return (
            <div key="variants" className="mb-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{label}</p>
              <div className={gridOrList(vehicle.variants!.length)}>
                {vehicle.variants!.map(v => {
                  const isSelected = selection.variantId === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleVariant(v.id)}
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

        if (section.kind === 'subvariants') {
          return (
            <div key="subvariants" className="mb-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{label}</p>
              <div className={gridOrList(vehicle.subvariants!.length)}>
                {vehicle.subvariants!.map(s => {
                  const isSelected = selection.subvariantId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleSubvariant(s.id)}
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

        if (section.kind === 'configGroup') {
          const { group } = section;
          const selectedIds = selection.selectedOptionsByGroup?.[group.id] ?? [];
          return (
            <div key={group.id} className="mb-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{label}</p>
              <div className={gridOrList(group.options.length)}>
                {group.options.map(option => {
                  const isSelected = group.type === 'single'
                    ? selectedIds[0] === option.id
                    : selectedIds.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleGroupOption(group.id, option.id, group.type)}
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

        return null;
      })}

      {/* ── Option Packs — last, gated behind all prior sections ──────────── */}
      {showPacks && packs.length > 0 && packsVisible && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{packsStepLabel}</p>
          <div className={gridOrList(packs.length)}>
            {packs.map(pack => {
              const isSelected = selectedPackIds.includes(pack.id);
              return (
                <button
                  key={pack.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => togglePack(pack.id)}
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
      )}
    </>
  );
}

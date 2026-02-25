import { StructuredVehicle, Pack, Trim } from '../../types/specs';
import { VehicleConfigSelection, ConfigGroup } from '../../types/config';
import { TrimSection } from './sections/TrimSection';
import { VariantSection } from './sections/VariantSection';
import { SubvariantSection } from './sections/SubvariantSection';
import { ConfigGroupsSection } from './sections/ConfigGroupsSection';
import { PacksSection } from './sections/PacksSection';

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
        <TrimSection
          vehicle={vehicle}
          selectedTrimId={selection.trimId}
          onSelectTrim={(trimId) => updateSelection({ trimId })}
          isSidebar={isSidebar}
          btnBase={btnBase}
          btnOn={btnOn}
          btnOff={btnOff}
          gridClass={gridOrList(vehicle.trims.length)}
        />
      )}

      {/* ── Gated sections (variants / subvariants / configGroups) ─────────── */}
      {gatedSections.map((section, idx) => {
        if (!sectionVisible[idx]) return null;
        const label = sectionStepLabel[idx];

        if (section.kind === 'variants') {
          return (
            <VariantSection
              key="variants"
              label={label}
              variants={vehicle.variants!}
              selectedVariantId={selection.variantId}
              onToggleVariant={toggleVariant}
              showDescriptions={showDescriptions}
              isSidebar={isSidebar}
              btnBase={btnBase}
              btnOn={btnOn}
              btnOff={btnOff}
              gridClass={gridOrList(vehicle.variants!.length)}
            />
          );
        }

        if (section.kind === 'subvariants') {
          return (
            <SubvariantSection
              key="subvariants"
              label={label}
              subvariants={vehicle.subvariants!}
              selectedSubvariantId={selection.subvariantId}
              onToggleSubvariant={toggleSubvariant}
              showDescriptions={showDescriptions}
              isSidebar={isSidebar}
              btnBase={btnBase}
              btnOn={btnOn}
              btnOff={btnOff}
              gridClass={gridOrList(vehicle.subvariants!.length)}
            />
          );
        }

        if (section.kind === 'configGroup') {
          const { group } = section;
          const selectedIds = selection.selectedOptionsByGroup?.[group.id] ?? [];
          return (
            <ConfigGroupsSection
              key={group.id}
              label={label}
              group={group}
              selectedIds={selectedIds}
              onToggleGroupOption={toggleGroupOption}
              showDescriptions={showDescriptions}
              isSidebar={isSidebar}
              btnBase={btnBase}
              btnOn={btnOn}
              btnOff={btnOff}
              gridClass={gridOrList(group.options.length)}
            />
          );
        }

        return null;
      })}

      {/* ── Option Packs — last, gated behind all prior sections ──────────── */}
      {showPacks && packs.length > 0 && packsVisible && (
        <PacksSection
          label={packsStepLabel}
          packs={packs}
          selectedPackIds={selectedPackIds}
          onTogglePack={togglePack}
          btnBase={btnBase}
          btnOn={btnOn}
          btnOff={btnOff}
          gridClass={gridOrList(packs.length)}
        />
      )}
    </>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { StructuredVehicle } from '../../../types/specs';
import { resolveConfiguredVehicle, ResolvedVehicle } from '../../../lib/resolveConfiguredVehicle';
import { upsertGarageItem, removeGarageItem, isInGarage, doesSavedSelectionMatch } from '../../../lib/session';
import { Filters } from '../types';
import { getDisplayProps } from '../utils/display';
import { VehicleConfigSelection } from '../../../types/config';
import { AdvancedFilters, defaultAdvancedFilters, matchesAdvancedFilters } from '../../../lib/advancedFilters';

function createEmptySelection(): VehicleConfigSelection {
  return {
    variantId: null,
    subvariantId: null,
    trimId: null,
    packIds: [],
    selectedOptionsByGroup: {},
  };
}

function createSelectionForVehicle(vehicle: StructuredVehicle | null): VehicleConfigSelection {
  if (!vehicle) return createEmptySelection();
  return {
    variantId: null,
    subvariantId: null,
    trimId: vehicle.trims[0]?.id ?? null,
    packIds: [],
    selectedOptionsByGroup: {},
  };
}

function sanitizeSelection(vehicle: StructuredVehicle, selection: VehicleConfigSelection): VehicleConfigSelection {
  const trim = vehicle.trims.find((t) => t.id === selection.trimId) ?? vehicle.trims[0];
  const validPackIds = new Set(vehicle.trims.flatMap((t) => t.packs.map((p) => p.id)));
  const validVariantIds = new Set(vehicle.variants?.map((v) => v.id) ?? []);
  const validSubvariantIds = new Set(vehicle.subvariants?.map((s) => s.id) ?? []);
  const validGroupIds = new Set((vehicle.configGroups ?? []).map((g) => g.id));

  const sanitizedGroups: Record<string, string[]> = {};
  for (const [groupId, optionIds] of Object.entries(selection.selectedOptionsByGroup ?? {})) {
    if (!validGroupIds.has(groupId)) continue;
    const group = vehicle.configGroups!.find((g) => g.id === groupId)!;
    const validOptionIds = new Set(group.options.map((o) => o.id));
    const filtered = optionIds.filter((id) => validOptionIds.has(id));
    if (filtered.length > 0) sanitizedGroups[groupId] = filtered;
  }

  return {
    variantId: selection.variantId && validVariantIds.has(selection.variantId) ? selection.variantId : null,
    subvariantId: selection.subvariantId && validSubvariantIds.has(selection.subvariantId) ? selection.subvariantId : null,
    trimId: trim?.id ?? null,
    packIds: (selection.packIds ?? []).filter((id) => validPackIds.has(id)),
    selectedOptionsByGroup: sanitizedGroups,
  };
}

export function useComparisonState({
  vehicles: allVehicles,
  prefillVehicleIdA,
  prefillVehicleIdB,
}: {
  vehicles: StructuredVehicle[];
  prefillVehicleIdA?: string | null;
  prefillVehicleIdB?: string | null;
}) {
  const [vehicles, setVehicles] = useState<[StructuredVehicle | null, StructuredVehicle | null]>([null, null]);
  const [selection, setSelection] = useState<[VehicleConfigSelection, VehicleConfigSelection]>([
    createEmptySelection(),
    createEmptySelection(),
  ]);
  const [resolvedSpecs, setResolvedSpecsState] = useState<[ResolvedVehicle | null, ResolvedVehicle | null]>([null, null]);
  const [inGarage, setInGarage] = useState<[boolean, boolean]>([false, false]);
  const [heroIndexA, setHeroIndexA] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [filtersA, setFiltersA] = useState<Filters>({ search: '', make: '', model: '', bodyType: '', fuelType: '' });
  const [filtersB, setFiltersB] = useState<Filters>({ search: '', make: '', model: '', bodyType: '', fuelType: '' });
  const [advancedFiltersA, setAdvancedFiltersA] = useState<AdvancedFilters>(defaultAdvancedFilters);
  const [advancedFiltersB, setAdvancedFiltersB] = useState<AdvancedFilters>(defaultAdvancedFilters);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    trim: true,
    efficiency: true,
    performance: true,
    connectivity: true,
    safety: true,
  });

  const selectCarA = (vehicle: StructuredVehicle | null) => {
    if (vehicle === null) {
      setVehicles([null, null]);
      setSelection([createEmptySelection(), createEmptySelection()]);
    } else {
      setVehicles([vehicle, null]);
      setSelection([createSelectionForVehicle(vehicle), createEmptySelection()]);
    }
  };

  const selectCarB = (vehicle: StructuredVehicle | null) => {
    if (vehicle === null) {
      setVehicles(prev => [prev[0], null]);
      setSelection(prev => [prev[0], createEmptySelection()]);
    } else {
      setVehicles(prev => [prev[0], vehicle]);
      setSelection(prev => [prev[0], createSelectionForVehicle(vehicle)]);
    }
  };

  useEffect(() => {
    if (vehicles[0]) {
      const specs = resolveConfiguredVehicle(vehicles[0], selection[0]);
      setResolvedSpecsState(prev => [specs, prev[1]]);
      setInGarage(prev => [isInGarage(vehicles[0]!.id), prev[1]]);
    } else {
      setResolvedSpecsState(prev => [null, prev[1]]);
    }
  }, [vehicles[0], selection[0]]);

  useEffect(() => {
    setHeroIndexA(0);
  }, [vehicles[0]]);

  useEffect(() => {
    const carA = prefillVehicleIdA ? allVehicles.find(v => v.id === prefillVehicleIdA) ?? null : null;
    const carB = prefillVehicleIdB ? allVehicles.find(v => v.id === prefillVehicleIdB) ?? null : null;
    if (carA && carB && carA.id !== carB.id) {
      setVehicles([carA, carB]);
      setSelection([createSelectionForVehicle(carA), createSelectionForVehicle(carB)]);
      return;
    }
    if (carA) {
      selectCarA(carA);
    }
  }, [prefillVehicleIdA, prefillVehicleIdB, allVehicles]);

  useEffect(() => {
    if (vehicles[1]) {
      const specs = resolveConfiguredVehicle(vehicles[1], selection[1]);
      setResolvedSpecsState(prev => [prev[0], specs]);
      setInGarage(prev => [prev[0], isInGarage(vehicles[1]!.id)]);
    } else {
      setResolvedSpecsState(prev => [prev[0], null]);
    }
  }, [vehicles[1], selection[1]]);

  const makes = useMemo(
    () => Array.from(new Set(allVehicles.map(v => v.make))).sort(),
    [allVehicles],
  );

  const modelsA = useMemo(
    () =>
      Array.from(
        new Set(allVehicles.filter(v => !filtersA.make || v.make === filtersA.make).map(v => v.model)),
      ).sort(),
    [allVehicles, filtersA.make],
  );
  const bodyTypesA = useMemo(
    () => Array.from(new Set(allVehicles.map(v => getDisplayProps(v).bodyType).filter(Boolean))).sort(),
    [allVehicles],
  );
  const fuelTypesA = useMemo(
    () => Array.from(new Set(allVehicles.map(v => getDisplayProps(v).fuelType).filter(Boolean))).sort(),
    [allVehicles],
  );

  const modelsB = useMemo(
    () =>
      Array.from(
        new Set(allVehicles.filter(v => !filtersB.make || v.make === filtersB.make).map(v => v.model)),
      ).sort(),
    [allVehicles, filtersB.make],
  );
  const bodyTypesB = useMemo(
    () => Array.from(new Set(allVehicles.map(v => getDisplayProps(v).bodyType).filter(Boolean))).sort(),
    [allVehicles],
  );
  const fuelTypesB = useMemo(
    () => Array.from(new Set(allVehicles.map(v => getDisplayProps(v).fuelType).filter(Boolean))).sort(),
    [allVehicles],
  );

  const selectionMatchesSaved: [boolean, boolean] = [
    inGarage[0] && !!vehicles[0] && doesSavedSelectionMatch(vehicles[0].id, selection[0]),
    inGarage[1] && !!vehicles[1] && doesSavedSelectionMatch(vehicles[1].id, selection[1]),
  ];

  const toggleGarage = (index: 0 | 1) => {
    const vehicle = vehicles[index];
    if (!vehicle) return;
    if (inGarage[index] && selectionMatchesSaved[index]) {
      removeGarageItem(vehicle.id);
      setInGarage(prev => {
        const updated = [...prev] as [boolean, boolean];
        updated[index] = false;
        return updated;
      });
    } else {
      upsertGarageItem(vehicle.id, selection[index]);
      setInGarage(prev => {
        const updated = [...prev] as [boolean, boolean];
        updated[index] = true;
        return updated;
      });
    }
    window.dispatchEvent(new Event('garage-updated'));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateSelection = (index: 0 | 1, patch: Partial<VehicleConfigSelection>) => {
    setSelection(prev => {
      const next = [...prev] as [VehicleConfigSelection, VehicleConfigSelection];
      const vehicle = vehicles[index];
      const patched: VehicleConfigSelection = {
        ...next[index],
        ...patch,
      };
      next[index] = vehicle ? sanitizeSelection(vehicle, patched) : patched;
      return next;
    });
  };

  const filteredVehiclesA = useMemo(
    () =>
      allVehicles.filter(v => {
        const dp = getDisplayProps(v);
        if (filtersA.search) {
          const s = filtersA.search.toLowerCase();
          if (!v.make.toLowerCase().includes(s) && !v.model.toLowerCase().includes(s) &&
              !dp.bodyType.toLowerCase().includes(s) && !dp.fuelType.toLowerCase().includes(s)) return false;
        }
        if (filtersA.make && v.make !== filtersA.make) return false;
        if (filtersA.model && v.model !== filtersA.model) return false;
        if (filtersA.bodyType && dp.bodyType !== filtersA.bodyType) return false;
        if (filtersA.fuelType && dp.fuelType !== filtersA.fuelType) return false;
        if (!matchesAdvancedFilters(v, advancedFiltersA)) return false;
        return true;
      }),
    [allVehicles, filtersA, advancedFiltersA],
  );

  const filteredVehiclesB = useMemo(
    () =>
      allVehicles.filter(v => {
        if (v.id === vehicles[0]?.id) return false;
        const dp = getDisplayProps(v);
        if (filtersB.search) {
          const s = filtersB.search.toLowerCase();
          if (!v.make.toLowerCase().includes(s) && !v.model.toLowerCase().includes(s) &&
              !dp.bodyType.toLowerCase().includes(s) && !dp.fuelType.toLowerCase().includes(s)) return false;
        }
        if (filtersB.make && v.make !== filtersB.make) return false;
        if (filtersB.model && v.model !== filtersB.model) return false;
        if (filtersB.bodyType && dp.bodyType !== filtersB.bodyType) return false;
        if (filtersB.fuelType && dp.fuelType !== filtersB.fuelType) return false;
        if (!matchesAdvancedFilters(v, advancedFiltersB)) return false;
        return true;
      }),
    [allVehicles, vehicles[0]?.id, filtersB, advancedFiltersB],
  );

  const v1 = vehicles[0];
  const v2 = vehicles[1];
  const specs1 = resolvedSpecs[0];
  const specs2 = resolvedSpecs[1];

  return {
    selection,
    inGarage,
    heroIndexA,
    lightboxOpen,
    filtersA,
    filtersB,
    advancedFiltersA,
    advancedFiltersB,
    expandedSections,
    makes,
    modelsA,
    bodyTypesA,
    fuelTypesA,
    modelsB,
    bodyTypesB,
    fuelTypesB,
    selectionMatchesSaved,
    filteredVehiclesA,
    filteredVehiclesB,
    v1,
    v2,
    specs1,
    specs2,
    setHeroIndexA,
    setLightboxOpen,
    setFiltersA,
    setFiltersB,
    setAdvancedFiltersA,
    setAdvancedFiltersB,
    toggleGarage,
    toggleSection,
    updateSelection,
    selectCarA,
    selectCarB,
  };
}

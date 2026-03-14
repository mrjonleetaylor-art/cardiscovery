import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Download, Upload, ExternalLink, Copy, Archive, RotateCcw, Pencil, ChevronDown, Eye, ArrowUp, ArrowDown } from 'lucide-react';
import { AdminVehicle, AdminVehicleStatus, ImportResult } from '../adminTypes';
import { listVehicles, archiveVehicle, restoreVehicle, duplicateVehicle } from '../lib/adminVehicles';
import { seedAdminFromDataset } from '../lib/seedAdminFromDataset';
import { buildCsvContent, downloadCsv, sortVehiclesForExport } from '../csv/csvExport';
import { parseCsv, applyImport } from '../csv/csvImport';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { supabase } from '../../lib/supabase';
import { FUEL_TYPES, labelFor, normalizeEnum } from '../lib/enums';

type StatusFilter = 'active' | 'draft' | 'live' | 'archived';
type SortCol = 'make' | 'id' | 'model' | 'year' | 'body' | 'price' | 'status' | 'updated';
type SortDir = 'asc' | 'desc';

interface CarsListProps {
  listQuery?: string;
  onNavigate: (path: string) => void;
}

interface DuplicatePrompt {
  sourceId: string;
  rowType: AdminVehicle['row_type'];
  baseId: string;
}

interface VehicleFilterFields {
  makeKey: string;
  modelKey: string;
  yearValue: number | null;
  fuelTypeKey: string;
  fuelTypeLabel: string;
}

function SortIndicator({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol; sortDir: SortDir }) {
  if (sortCol !== col) return <span className="w-3 h-3 flex-shrink-0 inline-block" />;
  return sortDir === 'asc'
    ? <ArrowUp className="w-3 h-3 flex-shrink-0" />
    : <ArrowDown className="w-3 h-3 flex-shrink-0" />;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function toDisplayLabel(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function CarsList({ listQuery = '', onNavigate }: CarsListProps) {
  const parseInitialFilters = () => {
    const params = new URLSearchParams(listQuery.startsWith('?') ? listQuery.slice(1) : listQuery);
    const status = params.get('status');
    const year = params.get('year');
    return {
      statusFilter: status === 'active' || status === 'draft' || status === 'live' || status === 'archived'
        ? status
        : 'active',
      showVariants: params.get('showVariants') === '1',
      showPacks: params.get('showPacks') === '1',
      noImage: params.get('noImage') === '1',
      makeFilter: params.get('make') ?? '',
      modelFilter: params.get('model') ?? '',
      yearFilter: year && /^\d{4}$/.test(year) ? year : '',
      fuelTypeFilter: params.get('fuel') ?? '',
      searchFilter: params.get('search') ?? '',
    } as const;
  };

  const initialFilters = parseInitialFilters();

  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialFilters.statusFilter);
  const [showVariants, setShowVariants] = useState(initialFilters.showVariants);
  const [showPacks, setShowPacks] = useState(initialFilters.showPacks);
  const [noImage, setHasImage] = useState(initialFilters.noImage);
  const [makeFilter, setMakeFilter] = useState(initialFilters.makeFilter);
  const [modelFilter, setModelFilter] = useState(initialFilters.modelFilter);
  const [yearFilter, setYearFilter] = useState(initialFilters.yearFilter);
  const [fuelTypeFilter, setFuelTypeFilter] = useState(initialFilters.fuelTypeFilter);
  const [searchFilter] = useState(initialFilters.searchFilter);

  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [duplicatePrompt, setDuplicatePrompt] = useState<DuplicatePrompt | null>(null);
  const [newIdInput, setNewIdInput] = useState('');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelComboRef = useRef<HTMLDivElement>(null);

  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);

  const [modelSearch, setModelSearch] = useState('');
  const [modelOpen, setModelOpen] = useState(false);

  const [sortCol, setSortCol] = useState<SortCol>('updated');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkStatus = async (newStatus: AdminVehicleStatus) => {
    if (selectedIds.size === 0 || bulkWorking) return;
    setBulkWorking(true);
    try {
      const ids = [...selectedIds];
      const { error: updateError } = await supabase
        .from('admin_vehicles')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .in('id', ids);
      if (updateError) throw updateError;
      setSelectedIds(new Set());
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setBulkWorking(false);
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const statuses: AdminVehicleStatus[] =
        statusFilter === 'active' ? ['draft', 'live']
        : statusFilter === 'archived' ? ['archived']
        : [statusFilter];

      const data = await listVehicles({ statuses, includeVariants: showVariants });
      setVehicles(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter, showVariants]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = () => {
    try {
      const sorted = sortVehiclesForExport(filteredVehicles);
      const csv = buildCsvContent(sorted);
      downloadCsv(csv, `carfinder-vehicles-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (e) {
      alert(`Export failed: ${String(e)}`);
    }
  };

  // ── Import ─────────────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);

      if (!parsed.isValid) {
        const fakeResult: ImportResult = {
          batch: {
            id: 'parse-error',
            created_at: new Date().toISOString(),
            created_by_admin_id: null,
            file_name: file.name,
            file_hash: null,
            stats: { total_rows: 0, base_rows: 0, variant_rows: 0, created: 0, updated: 0, archived: 0, errors: parsed.errors.length },
            errors: parsed.errors,
            raw_csv_stored: false,
            notes: parsed.headerErrors.join('; ') || null,
          },
          success: false,
          stats: { total_rows: 0, base_rows: 0, variant_rows: 0, created: 0, updated: 0, archived: 0, errors: parsed.errors.length },
          errors: parsed.errors,
        };
        setImportResult(fakeResult);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const result = await applyImport(parsed, file.name, session?.user.id ?? null);
      setImportResult(result);
      if (result.success) load();
    } catch (e) {
      alert(`Import failed: ${String(e)}`);
    } finally {
      setImporting(false);
      // Reset file input so same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Archive ─────────────────────────────────────────────────────────────────
  const handleArchiveConfirm = async () => {
    if (!confirmArchive) return;
    await archiveVehicle(confirmArchive);
    setConfirmArchive(null);
    load();
  };

  // ── Restore ─────────────────────────────────────────────────────────────────
  const handleRestoreConfirm = async () => {
    if (!confirmRestore) return;
    await restoreVehicle(confirmRestore);
    setConfirmRestore(null);
    load();
  };

  // ── Duplicate ─────────────────────────────────────────────────────────────────
  const handleDuplicate = (v: AdminVehicle) => {
    const suggestedId = v.row_type === 'BASE'
      ? `${v.base_id}-copy`
      : v.variant_code ? `${v.base_id}${v.variant_code}-copy` : '';
    setNewIdInput(suggestedId);
    setDuplicateError(null);
    setDuplicatePrompt({ sourceId: v.id, rowType: v.row_type, baseId: v.base_id });
  };

  const handleDuplicateConfirm = async () => {
    if (!duplicatePrompt || !newIdInput.trim()) return;
    setDuplicateError(null);

    const newId = newIdInput.trim();
    const newBaseId = duplicatePrompt.rowType === 'BASE' ? newId : duplicatePrompt.baseId;
    const newVariantCode = duplicatePrompt.rowType === 'VARIANT'
      ? newId.replace(duplicatePrompt.baseId, '') || newId
      : null;

    try {
      await duplicateVehicle(duplicatePrompt.sourceId, newId, newBaseId, newVariantCode);
      setDuplicatePrompt(null);
      load();
    } catch (e: unknown) {
      setDuplicateError(String(e));
    }
  };

  // ── Seed from dataset ─────────────────────────────────────────────────────
  const handleSeedFromDataset = async () => {
    setSeeding(true);
    setSeedError(null);
    try {
      await seedAdminFromDataset();
      load();
    } catch (e) {
      setSeedError(String(e));
    } finally {
      setSeeding(false);
    }
  };

  // ── View on site ──────────────────────────────────────────────────────────
  const handleViewOnSite = (vehicleId: string) => {
    const url = new URL(window.location.href);
    url.hash = '';
    // Dispatch view-vehicle event after redirecting to public app
    const target = url.href + `#view=${encodeURIComponent(vehicleId)}`;
    window.open(target, '_blank');
  };

  // ─────────────────────────────────────────────────────────────────────────
  const statusFilterOptions: { value: StatusFilter; label: string }[] = [
    { value: 'active', label: 'Active (draft + live)' },
    { value: 'draft', label: 'Draft only' },
    { value: 'live', label: 'Live only' },
    { value: 'archived', label: 'Archived (Graveyard)' },
  ];

  const baseById = useMemo(
    () => new Map(vehicles.filter((v) => v.row_type === 'BASE').map((v) => [v.id, v] as const)),
    [vehicles],
  );

  const getFilterFields = (vehicle: AdminVehicle): VehicleFilterFields => {
    const base = vehicle.row_type === 'VARIANT' ? baseById.get(vehicle.base_id) : undefined;

    const rawMake = vehicle.make?.trim() || base?.make?.trim() || '';
    const makeKey = normalizeKey(rawMake);

    const rawModel = vehicle.model?.trim() || base?.model?.trim() || '';
    const modelKey = normalizeKey(rawModel);

    const rawYear = vehicle.year || base?.year || null;
    const yearValue = rawYear && rawYear > 0 ? rawYear : null;

    const rawFuelType = vehicle.specs?.['spec_overview_fuel_type']?.trim()
      || base?.specs?.['spec_overview_fuel_type']?.trim()
      || '';
    const canonicalFuelType = normalizeEnum(rawFuelType, FUEL_TYPES);
    const fuelTypeKey = !rawFuelType
      ? 'unknown'
      : canonicalFuelType ?? `custom:${normalizeKey(rawFuelType)}`;
    const fuelTypeLabel = !rawFuelType
      ? 'Unknown'
      : canonicalFuelType ? labelFor(canonicalFuelType, FUEL_TYPES) : rawFuelType;

    return { makeKey, modelKey, yearValue, fuelTypeKey, fuelTypeLabel };
  };

  const makeOptions = useMemo(() => {
    const countsByKey = new Map<string, Map<string, number>>();
    for (const vehicle of vehicles) {
      const fields = getFilterFields(vehicle);
      if (!fields.makeKey) continue;
      const rawMake = vehicle.make?.trim() || baseById.get(vehicle.base_id)?.make?.trim() || '';
      const displayCandidate = rawMake || toDisplayLabel(fields.makeKey);
      const keyCounts = countsByKey.get(fields.makeKey) ?? new Map<string, number>();
      keyCounts.set(displayCandidate, (keyCounts.get(displayCandidate) ?? 0) + 1);
      countsByKey.set(fields.makeKey, keyCounts);
    }

    return Array.from(countsByKey.entries())
      .map(([value, labels]) => {
        const label = Array.from(labels.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? toDisplayLabel(value);
        return { value, label };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [vehicles, baseById]);

  const modelOptions = useMemo(() => {
    const countsByKey = new Map<string, Map<string, number>>();
    for (const vehicle of vehicles) {
      const fields = getFilterFields(vehicle);
      if (!fields.modelKey) continue;
      if (makeFilter && fields.makeKey !== makeFilter) continue;
      const rawModel = vehicle.model?.trim() || baseById.get(vehicle.base_id)?.model?.trim() || '';
      const displayCandidate = rawModel || toDisplayLabel(fields.modelKey);
      const keyCounts = countsByKey.get(fields.modelKey) ?? new Map<string, number>();
      keyCounts.set(displayCandidate, (keyCounts.get(displayCandidate) ?? 0) + 1);
      countsByKey.set(fields.modelKey, keyCounts);
    }
    return Array.from(countsByKey.entries())
      .map(([value, labels]) => {
        const label = Array.from(labels.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? toDisplayLabel(value);
        return { value, label };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [vehicles, baseById, makeFilter]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    for (const vehicle of vehicles) {
      const { yearValue } = getFilterFields(vehicle);
      if (yearValue) years.add(yearValue);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [vehicles, baseById]);

  const fuelTypeOptions = useMemo(() => {
    const labelsByKey = new Map<string, string>();
    for (const vehicle of vehicles) {
      const { fuelTypeKey, fuelTypeLabel } = getFilterFields(vehicle);
      if (!fuelTypeKey) continue;
      if (!labelsByKey.has(fuelTypeKey)) {
        labelsByKey.set(fuelTypeKey, fuelTypeLabel);
      }
    }

    return Array.from(labelsByKey.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [vehicles, baseById]);

  const filteredModelOptions = useMemo(() => {
    if (!modelSearch.trim()) return modelOptions;
    const q = modelSearch.toLowerCase();
    return modelOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [modelOptions, modelSearch]);

  useEffect(() => {
    if (!modelOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (modelComboRef.current && !modelComboRef.current.contains(e.target as Node)) {
        setModelOpen(false);
        setModelSearch('');
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [modelOpen]);

  // Keep filtering client-side for now; move these predicates to query params for server-side filtering later.
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const fields = getFilterFields(vehicle);
      if (makeFilter && fields.makeKey !== makeFilter) return false;
      if (modelFilter && fields.modelKey !== modelFilter) return false;
      if (yearFilter && String(fields.yearValue ?? '') !== yearFilter) return false;
      if (fuelTypeFilter && fields.fuelTypeKey !== fuelTypeFilter) return false;
      if (!showPacks && vehicle.specs?.['admin_variant_kind'] === 'pack') return false;
      if (noImage && vehicle.cover_image_url) return false;
      return true;
    });
  }, [vehicles, makeFilter, modelFilter, yearFilter, fuelTypeFilter, showPacks, noImage, baseById]);

  const sortedVehicles = useMemo(() => {
    const getValue = (v: AdminVehicle): string | number | null => {
      switch (sortCol) {
        case 'make': return v.make?.toLowerCase() ?? null;
        case 'id': return v.id.toLowerCase();
        case 'model': return v.model?.toLowerCase() ?? null;
        case 'year': return v.year ?? null;
        case 'body': return v.body_type?.toLowerCase() ?? null;
        case 'price': return v.price_aud ?? null;
        case 'status': return v.status.toLowerCase();
        case 'updated': return v.updated_at;
      }
    };
    return [...filteredVehicles].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      const cmp = typeof av === 'string' && typeof bv === 'string'
        ? av.localeCompare(bv)
        : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredVehicles, sortCol, sortDir]);

  // Deselect rows that are no longer in the filtered view
  useEffect(() => {
    const visibleIds = new Set(filteredVehicles.map((v) => v.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filteredVehicles]); // eslint-disable-line react-hooks/exhaustive-deps

  const allVisibleSelected =
    filteredVehicles.length > 0 && filteredVehicles.every((v) => selectedIds.has(v.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVehicles.map((v) => v.id)));
    }
  };

  const clearFilters = () => {
    setMakeFilter('');
    setModelFilter('');
    setModelSearch('');
    setModelOpen(false);
    setYearFilter('');
    setFuelTypeFilter('');
  };

  const currentListQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set('status', statusFilter);
    if (showVariants) params.set('showVariants', '1');
    if (showPacks) params.set('showPacks', '1');
    if (noImage) params.set('noImage', '1');
    if (makeFilter) params.set('make', makeFilter);
    if (modelFilter) params.set('model', modelFilter);
    if (yearFilter) params.set('year', yearFilter);
    if (fuelTypeFilter) params.set('fuel', fuelTypeFilter);
    if (searchFilter) params.set('search', searchFilter);
    const query = params.toString();
    return query ? `?${query}` : '';
  }, [statusFilter, showVariants, showPacks, noImage, makeFilter, modelFilter, yearFilter, fuelTypeFilter, searchFilter]);

  useEffect(() => {
    const hash = `/admin/cars${currentListQuery}`;
    const base = window.location.href.split('#')[0];
    window.history.replaceState(null, '', `${base}#${hash}`);
  }, [currentListQuery]);

  useEffect(() => {
    const storageKey = `admin-cars-scroll:${currentListQuery}`;
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      const y = parseInt(saved, 10);
      if (!Number.isNaN(y)) {
        window.setTimeout(() => window.scrollTo({ top: y, behavior: 'auto' }), 0);
      }
    }
    const saveScroll = () => sessionStorage.setItem(storageKey, String(window.scrollY));
    window.addEventListener('scroll', saveScroll);
    return () => {
      saveScroll();
      window.removeEventListener('scroll', saveScroll);
    };
  }, [currentListQuery]);

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Cars</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage vehicle records</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="h-9 flex items-center gap-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV ({filteredVehicles.length})
          </button>
          <label className={`h-9 flex items-center gap-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload className="w-3.5 h-3.5" />
            {importing ? 'Importing…' : 'Upload CSV'}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
              disabled={importing}
            />
          </label>
          <button
            onClick={() => onNavigate(`/admin/cars/new${currentListQuery}`)}
            className="h-9 flex items-center gap-1.5 px-3 rounded-lg bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add car
          </button>
        </div>
      </div>

      {/* Import result banner */}
      {importResult && (
        <div className={`mb-4 p-4 rounded-lg border text-sm ${importResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium mb-1">{importResult.success ? 'Import complete' : 'Import failed'}</p>
              <p className="text-xs opacity-80">
                Created: {importResult.stats.created} · Updated: {importResult.stats.updated} · Archived: {importResult.stats.archived} · Errors: {importResult.stats.errors}
              </p>
              {importResult.batch.notes && (
                <p className="text-xs mt-1 opacity-80">{importResult.batch.notes}</p>
              )}
            </div>
            <button onClick={() => setImportResult(null)} className="opacity-60 hover:opacity-100 flex-shrink-0 text-xs">Dismiss</button>
          </div>
          {importResult.errors.length > 0 && (
            <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
              {importResult.errors.slice(0, 20).map((err, i) => (
                <p key={i} className="text-xs opacity-80">
                  Row {err.row_number}{err.vehicle_id ? ` (${err.vehicle_id})` : ''}{err.field ? ` [${err.field}]` : ''}: {err.message}
                </p>
              ))}
              {importResult.errors.length > 20 && (
                <p className="text-xs opacity-60">…and {importResult.errors.length - 20} more</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-8 pl-3 pr-8 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 appearance-none cursor-pointer"
          >
            {statusFilterOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showVariants}
            onChange={(e) => setShowVariants(e.target.checked)}
            className="rounded border-slate-300"
          />
          Show variants
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showPacks}
            onChange={(e) => setShowPacks(e.target.checked)}
            className="rounded border-slate-300"
          />
          Show packs
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={noImage}
            onChange={(e) => setHasImage(e.target.checked)}
            className="rounded border-slate-300"
          />
          No image
        </label>
        <div className="relative">
          <select
            value={makeFilter}
            onChange={(e) => { setMakeFilter(e.target.value); setModelFilter(''); setModelSearch(''); setModelOpen(false); }}
            className="h-8 pl-3 pr-8 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 appearance-none cursor-pointer"
          >
            <option value="">All makes</option>
            {makeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative" ref={modelComboRef}>
          <input
            type="text"
            value={modelOpen ? modelSearch : (modelOptions.find((o) => o.value === modelFilter)?.label ?? '')}
            placeholder="All models"
            onFocus={() => { setModelOpen(true); setModelSearch(''); }}
            onChange={(e) => setModelSearch(e.target.value)}
            className="h-8 pl-3 pr-8 w-36 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 placeholder-slate-400 dark:placeholder-slate-500"
          />
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          {modelOpen && (
            <div className="absolute z-20 top-full mt-1 left-0 min-w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-52 overflow-y-auto">
              <button
                onMouseDown={(e) => { e.preventDefault(); setModelFilter(''); setModelOpen(false); setModelSearch(''); }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 ${!modelFilter ? 'text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-500 dark:text-slate-400'}`}
              >
                All models
              </button>
              {filteredModelOptions.map((o) => (
                <button
                  key={o.value}
                  onMouseDown={(e) => { e.preventDefault(); setModelFilter(o.value); setModelOpen(false); setModelSearch(''); }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 ${modelFilter === o.value ? 'text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-700 dark:text-slate-300'}`}
                >
                  {o.label}
                </button>
              ))}
              {filteredModelOptions.length === 0 && (
                <p className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">No models match</p>
              )}
            </div>
          )}
        </div>
        <div className="relative">
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="h-8 pl-3 pr-8 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 appearance-none cursor-pointer"
          >
            <option value="">All years</option>
            {yearOptions.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={fuelTypeFilter}
            onChange={(e) => setFuelTypeFilter(e.target.value)}
            className="h-8 pl-3 pr-8 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 appearance-none cursor-pointer"
          >
            <option value="">All fuel types</option>
            {fuelTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>
        <button
          onClick={clearFilters}
          className="h-8 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Clear filters
        </button>
        <p className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
          {filteredVehicles.length} / {vehicles.length} record{filteredVehicles.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-900 text-white rounded-lg mb-3 text-sm">
          <span className="font-medium">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => handleBulkStatus('live')}
              disabled={bulkWorking}
              className="h-7 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-medium transition-colors"
            >
              Set Live
            </button>
            <button
              onClick={() => handleBulkStatus('draft')}
              disabled={bulkWorking}
              className="h-7 px-3 rounded-md bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-xs font-medium transition-colors"
            >
              Set Draft
            </button>
            <button
              onClick={() => handleBulkStatus('archived')}
              disabled={bulkWorking}
              className="h-7 px-3 rounded-md bg-red-700 hover:bg-red-600 disabled:opacity-50 text-xs font-medium transition-colors"
            >
              Archive
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="h-7 px-3 rounded-md bg-slate-700 hover:bg-slate-600 text-xs transition-colors"
            >
              Deselect all
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg mb-4">{error}</div>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300"
                  />
                </th>
                {showVariants && (
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Type</th>
                )}
                <th className="px-4 py-3">
                  <button onClick={() => handleSort('id')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                    ID <SortIndicator col="id" sortCol={sortCol} sortDir={sortDir} />
                  </button>
                </th>
                {showVariants && (
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Base / Code</th>
                )}
                <th className="px-4 py-3">
                  <button onClick={() => handleSort('make')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                    Make <SortIndicator col="make" sortCol={sortCol} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => handleSort('model')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                    Model <SortIndicator col="model" sortCol={sortCol} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => handleSort('year')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                    Year <SortIndicator col="year" sortCol={sortCol} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => handleSort('body')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                    Body <SortIndicator col="body" sortCol={sortCol} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => handleSort('price')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                    Price <SortIndicator col="price" sortCol={sortCol} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => handleSort('status')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                    Status <SortIndicator col="status" sortCol={sortCol} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => handleSort('updated')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                    Updated <SortIndicator col="updated" sortCol={sortCol} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={showVariants ? 12 : 10} className="px-4 py-8 text-center text-sm text-slate-400">Loading…</td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={showVariants ? 12 : 10} className="px-4 py-12 text-center">
                    {statusFilter === 'active' && !showVariants && vehicles.length === 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-slate-700">No vehicles yet</p>
                        <p className="text-xs text-slate-400">Import the current site dataset to get started.</p>
                        {seedError && (
                          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 inline-block">{seedError}</p>
                        )}
                        <div>
                          <button
                            onClick={handleSeedFromDataset}
                            disabled={seeding}
                            className="h-9 px-4 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
                          >
                            {seeding ? 'Importing…' : 'Import current site cars'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">No vehicles found</span>
                    )}
                  </td>
                </tr>
              ) : (
                sortedVehicles.map((v) => (
                  <tr key={v.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${selectedIds.has(v.id) ? 'bg-blue-50/40 dark:bg-blue-900/20' : v.row_type === 'VARIANT' ? 'bg-slate-50/40 dark:bg-slate-700/20' : ''}`}>
                    <td className="px-4 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(v.id)}
                        onChange={() => toggleRow(v.id)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    {showVariants && (
                      <td className="px-4 py-3">
                        {v.row_type === 'BASE' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">BASE</span>
                        ) : v.specs?.['admin_variant_kind'] === 'pack' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">Pack</span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">Variant</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {v.id}
                    </td>
                    {showVariants && (
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                        {v.row_type === 'VARIANT' ? (
                          <span>
                            <span className="text-slate-400">{v.base_id}</span>
                            {v.variant_code && (
                              <span className="ml-1 text-blue-600 font-semibold">+{v.variant_code}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{v.make}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{v.model}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{v.year}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{v.body_type}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">
                      {v.price_aud != null ? `$${v.price_aud.toLocaleString()}` : <span className="text-slate-400 dark:text-slate-500">—</span>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">
                      {new Date(v.updated_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => onNavigate(`/admin/cars/${encodeURIComponent(v.id)}${currentListQuery}`)}
                          title="Edit"
                          className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onNavigate(`/admin/preview/${encodeURIComponent(v.row_type === 'BASE' ? v.id : v.base_id)}${currentListQuery}`)}
                          title="Preview"
                          className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(v)}
                          title="Duplicate"
                          className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {v.status === 'archived' ? (
                          <button
                            onClick={() => setConfirmRestore(v.id)}
                            title="Restore"
                            className="p-1.5 rounded border border-slate-200 text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmArchive(v.id)}
                            title="Archive"
                            className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleViewOnSite(v.id)}
                          title="View on site"
                          className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Dialogs ── */}
      {confirmArchive && (
        <ConfirmDialog
          title="Archive vehicle?"
          message="The vehicle will be moved to the graveyard. It will no longer appear in the public site. You can restore it at any time."
          confirmLabel="Archive"
          confirmDestructive
          onConfirm={handleArchiveConfirm}
          onCancel={() => setConfirmArchive(null)}
        />
      )}

      {confirmRestore && (
        <ConfirmDialog
          title="Restore vehicle?"
          message="The vehicle will be set to Draft status and appear in the admin list. Publish it manually when ready."
          confirmLabel="Restore"
          onConfirm={handleRestoreConfirm}
          onCancel={() => setConfirmRestore(null)}
        />
      )}

      {duplicatePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDuplicatePrompt(null)} aria-hidden="true" />
          <div className="relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Duplicate vehicle</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {duplicatePrompt.rowType === 'BASE'
                ? 'Enter a new unique base ID for the duplicate.'
                : 'Enter a new unique ID for the duplicate variant.'}
            </p>
            <input
              type="text"
              value={newIdInput}
              onChange={(e) => { setNewIdInput(e.target.value); setDuplicateError(null); }}
              placeholder={duplicatePrompt.rowType === 'BASE' ? 'new-base-id' : `${duplicatePrompt.baseId}X`}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 mb-3"
              autoFocus
            />
            {duplicateError && (
              <p className="text-xs text-red-600 dark:text-red-400 mb-3">{duplicateError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDuplicatePrompt(null)}
                className="h-9 px-4 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDuplicateConfirm}
                disabled={!newIdInput.trim()}
                className="h-9 px-4 text-sm rounded-lg bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 disabled:opacity-50"
              >
                Duplicate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

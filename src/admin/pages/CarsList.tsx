import { useEffect, useRef, useState } from 'react';
import { Plus, Download, Upload, ExternalLink, Copy, Archive, RotateCcw, Pencil, ChevronDown } from 'lucide-react';
import { AdminVehicle, AdminVehicleStatus, ImportResult } from '../adminTypes';
import { listVehicles, archiveVehicle, restoreVehicle, duplicateVehicle } from '../lib/adminVehicles';
import { seedAdminFromDataset } from '../lib/seedAdminFromDataset';
import { buildCsvContent, downloadCsv, sortVehiclesForExport } from '../csv/csvExport';
import { parseCsv, applyImport } from '../csv/csvImport';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { supabase } from '../../lib/supabase';

type StatusFilter = 'active' | 'draft' | 'live' | 'archived';

interface CarsListProps {
  onNavigate: (path: string) => void;
}

interface DuplicatePrompt {
  sourceId: string;
  rowType: AdminVehicle['row_type'];
  baseId: string;
}

export function CarsList({ onNavigate }: CarsListProps) {
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [showVariants, setShowVariants] = useState(false);

  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [duplicatePrompt, setDuplicatePrompt] = useState<DuplicatePrompt | null>(null);
  const [newIdInput, setNewIdInput] = useState('');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

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
  const handleExport = async () => {
    try {
      // Export ALL statuses (full roundtrip including archived)
      const all = await listVehicles({ statuses: ['draft', 'live', 'archived'], includeVariants: true });
      const sorted = sortVehiclesForExport(all);
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
    const target = url.href + `#view=${vehicleId}`;
    window.open(target, '_blank');
  };

  // ─────────────────────────────────────────────────────────────────────────
  const statusFilterOptions: { value: StatusFilter; label: string }[] = [
    { value: 'active', label: 'Active (draft + live)' },
    { value: 'draft', label: 'Draft only' },
    { value: 'live', label: 'Live only' },
    { value: 'archived', label: 'Archived (Graveyard)' },
  ];

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Cars</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage vehicle records</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="h-9 flex items-center gap-1.5 px-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV
          </button>
          <label className={`h-9 flex items-center gap-1.5 px-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
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
            onClick={() => onNavigate('/admin/cars/new')}
            className="h-9 flex items-center gap-1.5 px-3 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium transition-colors"
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
            className="h-8 pl-3 pr-8 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 appearance-none cursor-pointer"
          >
            {statusFilterOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showVariants}
            onChange={(e) => setShowVariants(e.target.checked)}
            className="rounded border-slate-300"
          />
          Show variants
        </label>
        <p className="text-xs text-slate-400 ml-auto">{vehicles.length} record{vehicles.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Table */}
      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg mb-4">{error}</div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Make</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Model</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Year</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Body</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">Loading…</td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    {statusFilter === 'active' && !showVariants ? (
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
                vehicles.map((v) => (
                  <tr key={v.id} className={`hover:bg-slate-50 transition-colors ${v.row_type === 'VARIANT' ? 'bg-slate-50/40' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {v.row_type === 'VARIANT' && (
                        <span className="text-slate-400 mr-1">↳</span>
                      )}
                      {v.id}
                      {v.row_type === 'VARIANT' && (
                        <span className="ml-1 text-xs text-slate-400">(variant)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-900">{v.make}</td>
                    <td className="px-4 py-3 text-slate-900">{v.model}</td>
                    <td className="px-4 py-3 text-slate-600">{v.year}</td>
                    <td className="px-4 py-3 text-slate-600">{v.body_type}</td>
                    <td className="px-4 py-3 text-slate-900">
                      {v.price_aud != null ? `$${v.price_aud.toLocaleString()}` : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(v.updated_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => onNavigate(`/admin/cars/${v.id}`)}
                          title="Edit"
                          className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(v)}
                          title="Duplicate"
                          className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
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
                          className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
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
          <div className="relative bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-1">Duplicate vehicle</h2>
            <p className="text-sm text-slate-500 mb-4">
              {duplicatePrompt.rowType === 'BASE'
                ? 'Enter a new unique base ID for the duplicate.'
                : 'Enter a new unique ID for the duplicate variant.'}
            </p>
            <input
              type="text"
              value={newIdInput}
              onChange={(e) => { setNewIdInput(e.target.value); setDuplicateError(null); }}
              placeholder={duplicatePrompt.rowType === 'BASE' ? 'new-base-id' : `${duplicatePrompt.baseId}X`}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 mb-3"
              autoFocus
            />
            {duplicateError && (
              <p className="text-xs text-red-600 mb-3">{duplicateError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDuplicatePrompt(null)}
                className="h-9 px-4 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDuplicateConfirm}
                disabled={!newIdInput.trim()}
                className="h-9 px-4 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
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

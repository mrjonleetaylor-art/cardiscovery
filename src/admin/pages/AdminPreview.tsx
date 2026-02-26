/**
 * AdminPreview — renders the public Profile UI driven by admin_vehicles data.
 *
 * Route: #/admin/preview/:baseId
 *
 * Flow:
 *   1. Fetch BASE row from admin_vehicles.
 *   2. Fetch all VARIANT rows for this base.
 *   3. Filter pack variants (admin_variant_kind === 'pack').
 *   4. Resolve and convert to StructuredVehicle via adminVehicleToStructuredVehicle.
 *   5. Render VehicleProfileContent (the same component the public site uses)
 *      with live pack-driven selection state.
 *
 * This preview is rendered without the AdminLayout sidebar so the Profile UI
 * gets full page width, identical to the public app.
 */

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import type { StructuredVehicle } from '../../types/specs';
import type { VehicleConfigSelection } from '../../types/config';
import { resolveConfiguredVehicle, ResolvedVehicle } from '../../lib/resolveConfiguredVehicle';
import { VehicleProfileContent } from '../../components/profile/VehicleProfileContent';
import type { AdminVehicle } from '../adminTypes';
import { getVehicle, getVariantsForBase } from '../lib/adminVehicles';
import { resolveAdminVehicle, adminVehicleToStructuredVehicle } from '../lib/adminResolver';

interface AdminPreviewProps {
  baseId: string;
  onNavigate: (path: string) => void;
}

function sanitizeSelection(
  vehicle: StructuredVehicle,
  sel: VehicleConfigSelection,
): VehicleConfigSelection {
  const trim = vehicle.trims.find((t) => t.id === sel.trimId) ?? vehicle.trims[0];
  const validPackIds = new Set(trim?.packs.map((p) => p.id) ?? []);
  return {
    ...sel,
    trimId: trim?.id ?? null,
    packIds: (sel.packIds ?? []).filter((id) => validPackIds.has(id)),
  };
}

export function AdminPreview({ baseId, onNavigate }: AdminPreviewProps) {
  const [base, setBase] = useState<AdminVehicle | null>(null);
  const [structured, setStructured] = useState<StructuredVehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selection, setSelection] = useState<VehicleConfigSelection>({
    variantId: null,
    subvariantId: null,
    trimId: null,
    packIds: [],
    selectedOptionsByGroup: {},
  });

  useEffect(() => {
    setLoading(true);
    setError(null);
    setBase(null);
    setStructured(null);

    (async () => {
      try {
        const vehicle = await getVehicle(baseId);

        if (!vehicle) {
          setError(`Vehicle "${baseId}" not found in admin_vehicles.`);
          return;
        }
        if (vehicle.row_type !== 'BASE') {
          setError(`"${baseId}" is a VARIANT row. Preview requires a BASE row.`);
          return;
        }

        setBase(vehicle);

        const variants = await getVariantsForBase(vehicle.base_id);
        const packVariants = variants.filter(
          (v) => v.specs?.['admin_variant_kind'] === 'pack',
        );

        const resolvedBase = resolveAdminVehicle(vehicle);
        const sv = adminVehicleToStructuredVehicle(resolvedBase, packVariants);

        setStructured(sv);
        setSelection({
          variantId: null,
          subvariantId: null,
          trimId: sv.trims[0]?.id ?? null,
          packIds: [],
          selectedOptionsByGroup: {},
        });
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [baseId]);

  const resolvedData: ResolvedVehicle | null = useMemo(() => {
    if (!structured) return null;
    return resolveConfiguredVehicle(structured, sanitizeSelection(structured, selection));
  }, [structured, selection]);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading preview…</p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error || !structured || !base) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-red-600 mb-4">{error ?? 'Unknown error'}</p>
          <button
            onClick={() => onNavigate(`/admin/cars/${baseId}`)}
            className="text-sm text-slate-600 hover:text-slate-900 underline"
          >
            Back to edit
          </button>
        </div>
      </div>
    );
  }

  const packCount = structured.trims[0]?.packs.length ?? 0;

  // ── Preview ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin preview banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate(`/admin/cars/${baseId}`)}
            className="flex items-center gap-1.5 text-xs font-medium text-amber-800 hover:text-amber-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to edit
          </button>
          <span className="text-xs text-amber-600 font-mono opacity-75">{baseId}</span>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded">
          Admin Preview
        </span>
      </div>

      {/* Profile UI — same layout as VehicleDetailPage */}
      <div className="pt-6 pb-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">

            {/* Left: profile content (identical to public site) */}
            <div className="lg:col-span-2">
              <VehicleProfileContent
                vehicle={structured}
                selection={selection}
                resolvedData={resolvedData}
                onSelectionChange={(patch) =>
                  setSelection((prev) => ({ ...prev, ...patch }))
                }
                mode="page"
                showTrimOptions={true}
              />
            </div>

            {/* Right: price panel (simplified — no garage/compare actions) */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-16">
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <h1 className="text-2xl font-bold text-slate-900 mb-1">
                    {structured.year} {structured.make} {structured.model}
                  </h1>
                  {resolvedData && (
                    <p className="text-slate-600 mb-4">{resolvedData.selectedTrim.name}</p>
                  )}

                  <div className="mb-6">
                    <div className="text-sm text-slate-600 mb-1">Price</div>
                    <div className="text-3xl font-bold text-slate-900">
                      {resolvedData
                        ? `$${resolvedData.totalPrice.toLocaleString()}`
                        : '—'}
                    </div>
                    {(resolvedData?.selectedPacks ?? []).length > 0 && (
                      <div className="mt-1 text-xs text-slate-500">
                        incl.{' '}
                        {resolvedData!.selectedPacks
                          .map((p) => p.name)
                          .join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Admin metadata */}
                  <div className="border-t border-slate-100 pt-4 space-y-1">
                    <p className="text-xs text-slate-500">
                      Status:{' '}
                      <span className="font-medium text-slate-800">{base.status}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Row type:{' '}
                      <span className="font-mono text-slate-800">{base.row_type}</span>
                    </p>
                    {packCount > 0 && (
                      <p className="text-xs text-slate-500">
                        Option packs available:{' '}
                        <span className="font-medium text-slate-800">{packCount}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

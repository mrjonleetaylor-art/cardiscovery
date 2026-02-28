import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Trash2, GitCompare, RefreshCw } from 'lucide-react';
import { StructuredVehicle } from '../../types/specs';
import { VehicleConfigSelection } from '../../types/config';
import { GarageItem, removeGarageItem, upsertGarageItem, doesSavedSelectionMatch } from '../../lib/session';
import { resolveConfiguredVehicle, ResolvedVehicle } from '../../lib/resolveConfiguredVehicle';
import { VehicleProfileContent } from '../profile/VehicleProfileContent';

export function GarageProfileModal({
  vehicle,
  allVehicles,
  savedItem,
  onClose,
  onRemoved,
  onUpdated,
  returnFocusTo,
}: {
  vehicle: StructuredVehicle;
  allVehicles: StructuredVehicle[];
  savedItem: GarageItem;
  onClose: () => void;
  onRemoved: (vehicleId: string) => void;
  onUpdated: (vehicleId: string, newSelection: VehicleConfigSelection) => void;
  returnFocusTo: HTMLElement | null;
}) {
  const [selection, setSelection] = useState<VehicleConfigSelection>(savedItem.selection);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = `garage-dialog-title-${vehicle.id}`;

  const resolvedData: ResolvedVehicle = useMemo(
    () => resolveConfiguredVehicle(vehicle, selection),
    [vehicle, selection],
  );

  const isDirty = !doesSavedSelectionMatch(vehicle.id, selection);

  // Primary image for the sticky context bar thumbnail
  const heroSrc =
    resolvedData.heroImageUrl ??
    resolvedData.resolvedImages[0] ??
    vehicle.images[0] ??
    null;

  // Lock body scroll; return focus to opener on unmount
  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      returnFocusTo?.focus();
    };
  }, [returnFocusTo]);

  // ESC close + Tab focus trap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.offsetParent !== null,
      );
      if (focusables.length === 0) { e.preventDefault(); return; }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) { e.preventDefault(); last.focus(); }
      } else if (active === last || !root.contains(active)) {
        e.preventDefault(); first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleUpdate = () => {
    upsertGarageItem(vehicle.id, selection);
    window.dispatchEvent(new Event('garage-updated'));
    onUpdated(vehicle.id, selection);
  };

  const handleRemove = () => {
    removeGarageItem(vehicle.id);
    window.dispatchEvent(new Event('garage-updated'));
    onRemoved(vehicle.id);
    onClose();
  };

  const handleCompare = () => {
    window.dispatchEvent(new CustomEvent('navigate-compare', { detail: { vehicleId: vehicle.id } }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      {/* Modal container */}
      <div
        ref={dialogRef}
        data-testid="garage-profile-modal"
        className="relative w-[min(1100px,92vw)] max-h-[85vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
      >

        {/* ── Fixed title bar ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 flex-shrink-0">
          <div className="min-w-0 mr-3">
            <h2 id={titleId} className="text-sm font-semibold text-slate-900 truncate leading-tight">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h2>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {resolvedData.selectedTrim.name}
            </p>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="flex-shrink-0 p-1 rounded-md border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Mini banner — pinned, holds identity + action buttons ────────── */}
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-3 z-10">
          {heroSrc && (
            <div className="flex-shrink-0 w-12 h-9 rounded overflow-hidden bg-slate-100">
              <img
                src={heroSrc}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 truncate leading-tight">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </p>
            <p className="text-xs text-slate-500 truncate">{resolvedData.selectedTrim.name}</p>
          </div>
          {/* Action buttons — always horizontal, labels hidden on xs */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleCompare}
              aria-label="Add to Compare"
              className="h-9 flex items-center gap-1.5 px-3 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition-colors whitespace-nowrap"
            >
              <GitCompare className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">Compare</span>
            </button>
            <button
              onClick={handleUpdate}
              disabled={!isDirty}
              aria-disabled={!isDirty}
              aria-label="Update Garage"
              className={`h-9 flex items-center gap-1.5 px-3 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                isDirty
                  ? 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                  : 'border-slate-200 text-slate-400 bg-white cursor-not-allowed'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">Update</span>
            </button>
            <button
              onClick={handleRemove}
              aria-label="Remove from Garage"
              className="h-9 flex items-center gap-1.5 px-3 rounded-lg border border-red-300 text-red-600 bg-white hover:bg-red-50 text-xs font-medium transition-colors whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">Remove</span>
            </button>
          </div>
        </div>

        {/* ── Scrollable body ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Full profile content */}
          <div className="px-4 py-4 sm:px-5">
            <VehicleProfileContent
              vehicle={vehicle}
              allVehicles={allVehicles}
              selection={selection}
              resolvedData={resolvedData}
              onSelectionChange={(patch) => setSelection((prev) => ({ ...prev, ...patch }))}
              mode="modal"
              showTrimOptions={true}
            />
          </div>

        </div>


      </div>
    </div>
  );
}

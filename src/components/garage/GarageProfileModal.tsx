import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Trash2, GitCompare, RefreshCw, ChevronRight } from 'lucide-react';
import { StructuredVehicle } from '../../types/specs';
import { VehicleConfigSelection } from '../../types/config';
import { GarageItem, removeGarageItem, upsertGarageItem, doesSavedSelectionMatch } from '../../lib/session';
import { resolveConfiguredVehicle, ResolvedVehicle } from '../../lib/resolveConfiguredVehicle';
import { VehicleProfileContent } from '../profile/VehicleProfileContent';

export function GarageProfileModal({
  vehicle,
  savedItem,
  onClose,
  onRemoved,
  onUpdated,
  returnFocusTo,
}: {
  vehicle: StructuredVehicle;
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

  useEffect(() => {
    closeRef.current?.focus();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
      returnFocusTo?.focus();
    };
  }, [returnFocusTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.offsetParent !== null);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !root.contains(active)) {
        e.preventDefault();
        first.focus();
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
    window.dispatchEvent(
      new CustomEvent('navigate-compare', { detail: { vehicleId: vehicle.id } }),
    );
  };

  const handleViewProfile = () => {
    window.dispatchEvent(
      new CustomEvent('view-vehicle', { detail: { vehicleId: vehicle.id } }),
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        className="relative w-[min(1100px,92vw)] max-h-[85vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
      >
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

        <div className="overflow-y-auto px-5 py-4 md:px-6">
          <VehicleProfileContent
            vehicle={vehicle}
            selection={selection}
            resolvedData={resolvedData}
            onSelectionChange={(patch) => setSelection((prev) => ({ ...prev, ...patch }))}
            mode="modal"
            showTrimOptions={true}
          />
        </div>

        <div className="px-5 py-4 md:px-6 border-t border-slate-200 bg-white/95 backdrop-blur-sm flex-shrink-0 sticky bottom-0 space-y-2">
          <button
            onClick={handleCompare}
            className="w-full h-10 flex items-center justify-center gap-2 px-4 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-sm font-medium transition-colors"
          >
            <GitCompare className="w-4 h-4" />
            Add to Compare
          </button>
          <button
            onClick={handleUpdate}
            disabled={!isDirty}
            aria-disabled={!isDirty}
            className={`w-full h-10 flex items-center justify-center gap-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
              isDirty
                ? 'border-slate-700 text-slate-800 bg-white hover:bg-slate-50'
                : 'border-slate-200 text-slate-400 bg-white cursor-not-allowed'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Update Garage
          </button>
          <button
            onClick={handleRemove}
            className="w-full h-10 flex items-center justify-center gap-2 px-4 rounded-lg border border-red-300 text-red-600 bg-white hover:bg-red-50 text-sm font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Remove from Garage
          </button>
          <button
            onClick={handleViewProfile}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1 text-slate-500 hover:text-slate-700 text-xs font-medium transition-colors"
          >
            View full profile
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

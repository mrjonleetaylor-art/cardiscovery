import { useEffect, useState } from 'react';
import { StructuredVehicle } from '../../../types/specs';
import { ResolvedVehicle } from '../../../lib/resolveConfiguredVehicle';
import { VehicleConfigSelection } from '../../../types/config';
import { VehicleConfigurationControls } from '../../config/VehicleConfigurationControls';

export function CarAExplorePanel({
  vehicle,
  specs,
  selection,
  onSelectionChange,
  heroIndex,
  setHeroIndex,
  lightboxOpen,
  setLightboxOpen,
}: {
  vehicle: StructuredVehicle;
  specs: ResolvedVehicle | null;
  selection: VehicleConfigSelection;
  onSelectionChange: (selectionPatch: Partial<VehicleConfigSelection>) => void;
  heroIndex: number;
  setHeroIndex: (i: number) => void;
  lightboxOpen: boolean;
  setLightboxOpen: (open: boolean) => void;
}) {
  const images = specs?.resolvedImages ?? vehicle.images ?? [];
  const heroSrc = specs?.heroImageUrl ?? images[heroIndex] ?? vehicle.images[heroIndex] ?? vehicle.images[0] ?? null;
  const [heroError, setHeroError] = useState(false);

  useEffect(() => { setHeroError(false); }, [heroSrc]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, setLightboxOpen]);

  return (
    <div className="bg-white rounded-lg border-2 border-slate-200 overflow-hidden flex flex-col min-h-[600px] max-w-[900px] mx-auto w-full">

      {/* Framed hero section */}
      <div className="p-4 border-b border-slate-200 flex-shrink-0">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">

          {/* Hero image */}
          <div className="relative aspect-[16/10] max-h-[50vh] mx-auto rounded-lg overflow-hidden bg-slate-100">
            {heroSrc && !heroError ? (
              <img
                key={heroSrc}
                src={heroSrc}
                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                className="w-full h-full object-cover cursor-zoom-in"
                onClick={() => setLightboxOpen(true)}
                onError={() => setHeroError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                No image available
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          <div className="mt-4 flex gap-3 overflow-x-auto">
            {images.length > 1 && images.map((src, i) => (
              <button
                key={i}
                onClick={() => setHeroIndex(i)}
                className={`flex-shrink-0 w-16 h-11 rounded overflow-hidden border-2 transition-all ${
                  i === heroIndex ? 'border-slate-900' : 'border-transparent hover:border-slate-300'
                }`}
              >
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const btn = (e.target as HTMLImageElement).closest('button') as HTMLElement | null;
                    if (btn) btn.style.display = 'none';
                  }}
                />
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Trim & Options */}
      <div className="flex-1 overflow-y-auto p-4">
        <h4 className="font-semibold text-sm text-slate-700 mb-3">Trim &amp; Options</h4>
        <VehicleConfigurationControls
          vehicle={vehicle}
          selection={selection}
          onChange={onSelectionChange}
          onHeroReset={() => setHeroIndex(0)}
          mode="panel"
          showPacks={true}
          showDescriptions={true}
        />
      </div>

      {/* Lightbox */}
      {lightboxOpen && heroSrc && !heroError && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <img
            src={heroSrc}
            alt=""
            className="max-w-full max-h-full object-contain rounded"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

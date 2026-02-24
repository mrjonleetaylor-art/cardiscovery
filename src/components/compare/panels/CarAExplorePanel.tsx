import { useEffect, useState } from 'react';
import { StructuredVehicle, Pack, ResolvedSpecs } from '../../../types/specs';

export function CarAExplorePanel({
  vehicle,
  specs,
  selectedTrimId,
  setSelectedTrimId,
  selectedPackIds,
  togglePack,
  heroIndex,
  setHeroIndex,
  lightboxOpen,
  setLightboxOpen,
}: {
  vehicle: StructuredVehicle;
  specs: ResolvedSpecs | null;
  selectedTrimId: string | null;
  setSelectedTrimId: (id: string) => void;
  selectedPackIds: string[];
  togglePack: (packId: string) => void;
  heroIndex: number;
  setHeroIndex: (i: number) => void;
  lightboxOpen: boolean;
  setLightboxOpen: (open: boolean) => void;
}) {
  const images = vehicle.images ?? [];
  const heroSrc = images[heroIndex] ?? null;
  const [heroError, setHeroError] = useState(false);

  useEffect(() => { setHeroError(false); }, [heroSrc]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen]);

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

        {vehicle.trims.length > 1 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Select Trim</p>
            {vehicle.trims.map((trim) => {
              const delta = trim.basePrice - vehicle.trims[0].basePrice;
              return (
                <button
                  key={trim.id}
                  onClick={() => setSelectedTrimId(trim.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedTrimId === trim.id
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
            })}
          </div>
        )}

        {specs && specs.selectedTrim.packs.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Option Packs</p>
            {specs.selectedTrim.packs.map((pack: Pack) => (
              <button
                key={pack.id}
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
                    {pack.features.slice(0, 3).map((f, idx) => (
                      <span key={idx}>• {f} </span>
                    ))}
                    {pack.features.length > 3 && <span className="italic">+{pack.features.length - 3} more</span>}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
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

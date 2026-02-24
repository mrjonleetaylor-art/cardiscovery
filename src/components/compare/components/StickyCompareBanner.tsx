import { Heart, X } from 'lucide-react';
import { StructuredVehicle, ResolvedSpecs } from '../../../types/specs';
import { TABLE_GRID } from '../sections/tableLayout';

export function StickyCompareBanner({
  v1,
  v2,
  specs1,
  specs2,
  inGarage,
  selectionMatchesSaved,
  onToggleGarage,
  onChangeA,
  onRemoveA,
  onChangeB,
  onRemoveB,
  heroUrl1,
  heroUrl2,
}: {
  v1: StructuredVehicle;
  v2: StructuredVehicle | null;
  specs1: ResolvedSpecs | null;
  specs2: ResolvedSpecs | null;
  inGarage: [boolean, boolean];
  selectionMatchesSaved: [boolean, boolean];
  onToggleGarage: (index: 0 | 1) => void;
  onChangeA: () => void;
  onRemoveA: () => void;
  onChangeB: () => void;
  onRemoveB: () => void;
  heroUrl1?: string | null;
  heroUrl2?: string | null;
}) {
  return (
    <div className="bg-white rounded-lg border-2 border-slate-200 overflow-hidden mb-6 sticky top-16 z-10 shadow-lg">
      <div className={`grid ${TABLE_GRID} divide-x divide-slate-200`}>
        {/* Label-column spacer — aligns Car A / Car B with the comparison table below */}
        <div className="bg-slate-50" />
        {/* Car A */}
        <div className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 flex gap-3">
              {(heroUrl1 ?? v1.images[0]) && (
                <div className="flex-shrink-0 w-14 h-10 rounded overflow-hidden bg-slate-100">
                  <img
                    src={heroUrl1 ?? v1.images[0]}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                  />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {v1.year} {v1.make} {v1.model}
                </h2>
                {specs1?.selectedTrim.name && (
                  <p className="text-xs text-slate-500 truncate">{specs1.selectedTrim.name}</p>
                )}
                <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                  ${specs1?.totalPrice.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onToggleGarage(0)}
                className={`hidden sm:flex text-xs px-2 py-1.5 rounded-lg border font-medium transition-all items-center gap-1 ${
                  inGarage[0]
                    ? 'border-red-400 text-red-600 hover:bg-red-50'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Heart className={`w-3 h-3 ${inGarage[0] ? 'fill-red-500' : ''}`} />
                {!inGarage[0] ? 'Save' : selectionMatchesSaved[0] ? 'Saved' : 'Update'}
              </button>
              <button
                onClick={() => onToggleGarage(0)}
                className={`sm:hidden p-1.5 rounded-lg border transition-all ${
                  inGarage[0]
                    ? 'border-red-400 text-red-600 hover:bg-red-50'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${inGarage[0] ? 'fill-red-500' : ''}`} />
              </button>
              <button
                onClick={onChangeA}
                className="text-xs px-2 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
              >
                Change
              </button>
              <button
                onClick={onRemoveA}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50"
                title="Remove Car A"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Car B — placeholder or content */}
        <div className="p-3 sm:p-4">
          {!v2 ? (
            <div className="flex items-center justify-center h-full min-h-[56px]">
              <p className="text-sm text-slate-400">No Car B selected</p>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0 flex gap-3">
                {(heroUrl2 ?? v2.images[0]) && (
                  <div className="flex-shrink-0 w-14 h-10 rounded overflow-hidden bg-slate-100">
                    <img
                      src={heroUrl2 ?? v2.images[0]}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                    />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    {v2.year} {v2.make} {v2.model}
                  </h2>
                  {specs2?.selectedTrim.name && (
                    <p className="text-xs text-slate-500 truncate">{specs2.selectedTrim.name}</p>
                  )}
                  <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                    ${specs2?.totalPrice.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => onToggleGarage(1)}
                  className={`hidden sm:flex text-xs px-2 py-1.5 rounded-lg border font-medium transition-all items-center gap-1 ${
                    inGarage[1]
                      ? 'border-red-400 text-red-600 hover:bg-red-50'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Heart className={`w-3 h-3 ${inGarage[1] ? 'fill-red-500' : ''}`} />
                  {!inGarage[1] ? 'Save' : selectionMatchesSaved[1] ? 'Saved' : 'Update'}
                </button>
                <button
                  onClick={() => onToggleGarage(1)}
                  className={`sm:hidden p-1.5 rounded-lg border transition-all ${
                    inGarage[1]
                      ? 'border-red-400 text-red-600 hover:bg-red-50'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${inGarage[1] ? 'fill-red-500' : ''}`} />
                </button>
                <button
                  onClick={onChangeB}
                  className="text-xs px-2 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Change
                </button>
                <button
                  onClick={onRemoveB}
                  className="p-1.5 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50"
                  title="Remove Car B"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

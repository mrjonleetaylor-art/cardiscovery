import { useState } from 'react';
import { StructuredVehicle } from '../../../types/specs';

export function VehicleHeroCard({ vehicle }: { vehicle: StructuredVehicle }) {
  const src = vehicle.images[0] ?? null;
  const [imgError, setImgError] = useState(false);
  return (
    <div className="bg-white rounded-lg border-2 border-slate-200 overflow-hidden p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="relative aspect-[16/10] max-h-[50vh] mx-auto rounded-lg overflow-hidden bg-slate-100">
          {src && !imgError ? (
            <img
              src={src}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
              No image available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

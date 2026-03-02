import { useState } from 'react';
import { StructuredVehicle } from '../../types/specs';
import { LeadCaptureModal } from './LeadCaptureModal';

interface FindDealerButtonProps {
  vehicle: StructuredVehicle;
  trim?: string;
  price?: number;
}

export function FindDealerButton({ vehicle, trim, price }: FindDealerButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition-colors text-sm"
      >
        Find dealers with this car
      </button>
      {open && (
        <LeadCaptureModal
          vehicle={vehicle}
          trim={trim}
          price={price}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

import { AdminVehicleStatus } from '../adminTypes';

const STATUS_STYLES: Record<AdminVehicleStatus, string> = {
  draft:    'bg-amber-50 text-amber-700 border border-amber-200',
  live:     'bg-emerald-50 text-emerald-700 border border-emerald-200',
  archived: 'bg-slate-100 text-slate-500 border border-slate-200',
};

export function StatusBadge({ status }: { status: AdminVehicleStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

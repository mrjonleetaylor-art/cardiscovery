import { TABLE_GRID, TABLE_CELL_PAD } from './tableLayout';

export function ComparisonRow({
  label,
  v1,
  v2,
  carBSelected,
}: {
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v2: any;
  carBSelected: boolean;
}) {
  const val1 = v1 != null ? v1.toString() : 'N/A';
  const val2 = !carBSelected ? '—' : (v2 != null ? v2.toString() : 'N/A');
  const isDifferent = carBSelected && v1 != null && v2 != null && val1 !== val2;

  return (
    <div className={`grid ${TABLE_GRID} divide-x divide-slate-200 border-b border-slate-200 last:border-b-0`}>
      <div className={`${TABLE_CELL_PAD} bg-slate-50 font-medium text-slate-700`}>{label}</div>
      <div className={`${TABLE_CELL_PAD} ${isDifferent ? 'bg-yellow-50' : ''}`}>{val1}</div>
      <div className={`${TABLE_CELL_PAD} ${isDifferent ? 'bg-yellow-50' : ''} ${!carBSelected ? 'text-slate-300' : ''}`}>
        {val2}
      </div>
    </div>
  );
}

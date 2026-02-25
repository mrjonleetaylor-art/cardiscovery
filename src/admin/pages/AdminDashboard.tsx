import { useEffect, useState } from 'react';
import { Car, Archive, FileText } from 'lucide-react';
import { listVehicles } from '../lib/adminVehicles';

interface AdminDashboardProps {
  onNavigate: (path: string) => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [counts, setCounts] = useState({ live: 0, draft: 0, archived: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [live, draft, archived] = await Promise.all([
          listVehicles({ statuses: ['live'], includeVariants: true }),
          listVehicles({ statuses: ['draft'], includeVariants: true }),
          listVehicles({ statuses: ['archived'], includeVariants: true }),
        ]);
        setCounts({ live: live.length, draft: draft.length, archived: archived.length });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">CarFinder admin</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={<Car className="w-5 h-5" />} label="Live vehicles" value={loading ? '—' : counts.live} color="emerald" onClick={() => onNavigate('/admin/cars')} />
        <StatCard icon={<FileText className="w-5 h-5" />} label="Draft vehicles" value={loading ? '—' : counts.draft} color="amber" onClick={() => onNavigate('/admin/cars')} />
        <StatCard icon={<Archive className="w-5 h-5" />} label="Archived (Graveyard)" value={loading ? '—' : counts.archived} color="slate" onClick={() => onNavigate('/admin/cars')} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Quick links</h2>
        <div className="space-y-2">
          <QuickLink label="Manage cars" description="View, edit, archive vehicles" onClick={() => onNavigate('/admin/cars')} />
          <QuickLink label="Add new car" description="Create a new BASE vehicle record" onClick={() => onNavigate('/admin/cars/new')} />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, color, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: 'emerald' | 'amber' | 'slate';
  onClick: () => void;
}) {
  const colorMap = {
    emerald: 'text-emerald-600 bg-emerald-50',
    amber:   'text-amber-600 bg-amber-50',
    slate:   'text-slate-500 bg-slate-100',
  };
  return (
    <button
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-xl p-5 text-left hover:shadow-sm transition-shadow w-full"
    >
      <div className={`inline-flex p-2 rounded-lg mb-3 ${colorMap[color]}`}>{icon}</div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </button>
  );
}

function QuickLink({ label, description, onClick }: { label: string; description: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-left"
    >
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <span className="text-slate-400 text-xs">→</span>
    </button>
  );
}

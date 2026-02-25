import { ReactNode } from 'react';
import { LayoutGrid, Car, ArrowLeft, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AdminLayoutProps {
  children: ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

function navLink(
  label: string,
  path: string,
  icon: ReactNode,
  currentPath: string,
  onNavigate: (p: string) => void,
) {
  const isActive = currentPath === path || currentPath.startsWith(path + '/');
  return (
    <button
      key={path}
      onClick={() => onNavigate(path)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
        isActive
          ? 'bg-slate-900 text-white'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export function AdminLayout({ children, currentPath, onNavigate }: AdminLayoutProps) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.hash = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
        {/* Brand */}
        <div className="px-4 py-4 border-b border-slate-200">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Admin</p>
          <p className="text-sm font-bold text-slate-900 mt-0.5">CarFinder</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navLink('Dashboard', '/admin', <LayoutGrid className="w-4 h-4 flex-shrink-0" />, currentPath, onNavigate)}
          {navLink('Cars', '/admin/cars', <Car className="w-4 h-4 flex-shrink-0" />, currentPath, onNavigate)}
        </nav>

        {/* Footer actions */}
        <div className="p-3 border-t border-slate-200 space-y-1">
          <button
            onClick={() => { window.location.hash = ''; }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            Back to site
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}

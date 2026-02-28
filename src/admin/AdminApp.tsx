/**
 * AdminApp — root component for all /admin routes.
 *
 * Uses hash-based routing: window.location.hash drives sub-page rendering.
 * Examples:
 *   #/admin          → Dashboard (redirects to /admin/cars)
 *   #/admin/cars     → CarsList
 *   #/admin/cars/new → CarEdit (create mode)
 *   #/admin/cars/:id → CarEdit (edit mode)
 *
 * Hash-based routing requires no server config and coexists cleanly with
 * the public app's event-based navigation (which never touches the hash).
 */

import { useEffect, useState } from 'react';
import { AdminAuthGuard } from './AdminAuthGuard';
import { AdminLayout } from './components/AdminLayout';
import { AdminDashboard } from './pages/AdminDashboard';
import { CarsList } from './pages/CarsList';
import { CarEdit } from './pages/CarEdit';
import { AdminPreview } from './pages/AdminPreview';

function getAdminPath(): string {
  const hash = window.location.hash;
  if (!hash.startsWith('#/admin')) return '/admin';
  return hash.slice(1); // strip the leading '#'
}

function splitPathAndQuery(path: string): { pathname: string; query: string } {
  const idx = path.indexOf('?');
  if (idx === -1) return { pathname: path, query: '' };
  return { pathname: path.slice(0, idx), query: path.slice(idx) };
}

function decodeRouteParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function navigate(path: string) {
  window.location.hash = path;
}

function AdminRouter() {
  const [path, setPath] = useState(getAdminPath);

  useEffect(() => {
    const handler = () => setPath(getAdminPath());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  // Redirect bare /admin to /admin/cars
  useEffect(() => {
    const { pathname } = splitPathAndQuery(path);
    if (pathname === '/admin' || pathname === '/admin/') {
      navigate('/admin/cars');
    }
  }, [path]);

  const { pathname, query } = splitPathAndQuery(path);

  // Preview route is full-page — rendered without AdminLayout sidebar
  const previewMatch = pathname.match(/^\/admin\/preview\/(.+)$/);
  if (previewMatch) {
    return <AdminPreview baseId={decodeRouteParam(previewMatch[1])} listQuery={query} onNavigate={navigate} />;
  }

  const renderPage = () => {
    if (pathname === '/admin/cars') {
      return <CarsList listQuery={query} onNavigate={navigate} />;
    }

    if (pathname === '/admin/cars/new') {
      return <CarEdit vehicleId={null} listQuery={query} onNavigate={navigate} />;
    }

    const carEditMatch = pathname.match(/^\/admin\/cars\/([^?/]+)/);
    if (carEditMatch) {
      return <CarEdit vehicleId={decodeRouteParam(carEditMatch[1])} listQuery={query} onNavigate={navigate} />;
    }

    // Catch-all: show dashboard
    return <AdminDashboard onNavigate={navigate} />;
  };

  return (
    <AdminLayout currentPath={pathname} onNavigate={navigate}>
      {renderPage()}
    </AdminLayout>
  );
}

export function AdminApp() {
  return (
    <AdminAuthGuard>
      <AdminRouter />
    </AdminAuthGuard>
  );
}

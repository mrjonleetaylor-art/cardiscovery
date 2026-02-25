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

function getAdminPath(): string {
  const hash = window.location.hash;
  if (!hash.startsWith('#/admin')) return '/admin';
  return hash.slice(1); // strip the leading '#'
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
    if (path === '/admin' || path === '/admin/') {
      navigate('/admin/cars');
    }
  }, [path]);

  const renderPage = () => {
    if (path === '/admin/cars') {
      return <CarsList onNavigate={navigate} />;
    }

    if (path === '/admin/cars/new') {
      return <CarEdit vehicleId={null} onNavigate={navigate} />;
    }

    const carEditMatch = path.match(/^\/admin\/cars\/([^?/]+)/);
    if (carEditMatch) {
      return <CarEdit vehicleId={carEditMatch[1]} onNavigate={navigate} />;
    }

    // Catch-all: show dashboard
    return <AdminDashboard onNavigate={navigate} />;
  };

  return (
    <AdminLayout currentPath={path} onNavigate={navigate}>
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

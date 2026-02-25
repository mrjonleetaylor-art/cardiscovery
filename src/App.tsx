import { useEffect, useState } from 'react';
import { AuthProvider } from './components/Auth/AuthContext';
import { Navigation } from './components/Navigation';
import Discovery from './components/Discovery';
import VehicleDetailPage from './components/VehicleDetailPage';
import Comparisons from './components/Comparisons';
import GaragePage from './components/GaragePage';
import { seedDatabase } from './lib/seedDatabase';
import { AdminApp } from './admin/AdminApp';

type CarFinderWindowEventMap = {
  'garage-updated': Event;
  'view-vehicle': CustomEvent<{ vehicleId: string }>;
  'navigate-compare': Event | CustomEvent<{ vehicleId?: string }>;
};

function addCarFinderEventListener<K extends keyof CarFinderWindowEventMap>(
  eventName: K,
  handler: (event: CarFinderWindowEventMap[K]) => void
) {
  window.addEventListener(eventName, handler as EventListener);
}

function removeCarFinderEventListener<K extends keyof CarFinderWindowEventMap>(
  eventName: K,
  handler: (event: CarFinderWindowEventMap[K]) => void
) {
  window.removeEventListener(eventName, handler as EventListener);
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState<'discovery' | 'vehicle' | 'compare' | 'garage'>('discovery');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [comparePrefillId, setComparePrefillId] = useState<string | null>(null);

  useEffect(() => {
    seedDatabase();

    const handleGarageUpdate = () => {
      setCurrentPage(currentPage);
    };

    const handleViewVehicle = (event: CustomEvent) => {
      setSelectedVehicleId(event.detail.vehicleId);
      setCurrentPage('vehicle');
    };

    const handleNavigateCompare = (event: CarFinderWindowEventMap['navigate-compare']) => {
      const vehicleId = event instanceof CustomEvent ? (event.detail?.vehicleId ?? null) : null;
      setComparePrefillId(vehicleId);
      setCurrentPage('compare');
      setSelectedVehicleId(null);
    };

    addCarFinderEventListener('garage-updated', handleGarageUpdate);
    addCarFinderEventListener('view-vehicle', handleViewVehicle);
    addCarFinderEventListener('navigate-compare', handleNavigateCompare);

    return () => {
      removeCarFinderEventListener('garage-updated', handleGarageUpdate);
      removeCarFinderEventListener('view-vehicle', handleViewVehicle);
      removeCarFinderEventListener('navigate-compare', handleNavigateCompare);
    };
  }, [currentPage]);

  const handleNavigate = (page: string) => {
    if (page === 'discovery' || page === 'garage' || page === 'compare') {
      setCurrentPage(page);
      setSelectedVehicleId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation onNavigate={handleNavigate} currentPage={currentPage} />

      {currentPage === 'discovery' && <Discovery />}
      {currentPage === 'vehicle' && selectedVehicleId && <VehicleDetailPage vehicleId={selectedVehicleId} onBack={() => setCurrentPage('discovery')} />}
      {currentPage === 'compare' && <Comparisons prefillVehicleId={comparePrefillId} />}
      {currentPage === 'garage' && <GaragePage />}
    </div>
  );
}

function App() {
  const [isAdmin, setIsAdmin] = useState(() => window.location.hash.startsWith('#/admin'));

  useEffect(() => {
    const handler = () => setIsAdmin(window.location.hash.startsWith('#/admin'));
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  if (isAdmin) {
    // Admin runs inside its own auth guard — no AuthProvider overlap needed
    return <AdminApp />;
  }

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

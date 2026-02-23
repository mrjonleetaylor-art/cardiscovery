import { useEffect, useState } from 'react';
import { AuthProvider } from './components/Auth/AuthContext';
import { Navigation } from './components/Navigation';
import Discovery from './components/Discovery';
import VehicleDetailPage from './components/VehicleDetailPage';
import Comparisons from './components/Comparisons';
import GaragePage from './components/GaragePage';
import { seedDatabase } from './lib/seedDatabase';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<'discovery' | 'vehicle' | 'compare' | 'garage'>('discovery');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  useEffect(() => {
    seedDatabase();

    const handleGarageUpdate = () => {
      setCurrentPage(currentPage);
    };

    const handleViewVehicle = (event: CustomEvent) => {
      setSelectedVehicleId(event.detail.vehicleId);
      setCurrentPage('vehicle');
    };

    const handleNavigateCompare = () => {
      setCurrentPage('compare');
      setSelectedVehicleId(null);
    };

    window.addEventListener('garage-updated', handleGarageUpdate);
    window.addEventListener('view-vehicle' as any, handleViewVehicle as any);
    window.addEventListener('navigate-compare', handleNavigateCompare);

    return () => {
      window.removeEventListener('garage-updated', handleGarageUpdate);
      window.removeEventListener('view-vehicle' as any, handleViewVehicle as any);
      window.removeEventListener('navigate-compare', handleNavigateCompare);
    };
  }, [currentPage]);

  const handleNavigate = (page: string) => {
    if (page === 'discovery' || page === 'garage' || page === 'compare') {
      setCurrentPage(page as any);
      setSelectedVehicleId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation onNavigate={handleNavigate} currentPage={currentPage} />

      {currentPage === 'discovery' && <Discovery />}
      {currentPage === 'vehicle' && selectedVehicleId && <VehicleDetailPage vehicleId={selectedVehicleId} onBack={() => setCurrentPage('discovery')} />}
      {currentPage === 'compare' && <Comparisons />}
      {currentPage === 'garage' && <GaragePage />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

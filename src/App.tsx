import { useEffect, useState } from 'react';
import { AuthProvider } from './components/Auth/AuthContext';
import { Navigation } from './components/Navigation';
import Discovery from './components/Discovery';
import VehicleDetailPage from './components/VehicleDetailPage';
import Comparisons from './components/Comparisons';
import GaragePage from './components/GaragePage';
import { seedDatabase } from './lib/seedDatabase';
import { AdminApp } from './admin/AdminApp';
import { StructuredVehicle } from './types/specs';
import { fetchLiveVehicles } from './lib/liveVehicles';
console.log("BUILD_COMMIT", import.meta.env.VITE_BUILD_COMMIT);

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
  const [compareV1Id, setCompareV1Id] = useState<string | null>(null);
  const [compareV2Id, setCompareV2Id] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<StructuredVehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);

  const decodeHashParam = (value: string): string => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  const parseCompareFromHash = (hash: string): { v1: string | null; v2: string | null } => {
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return { v1: null, v2: null };
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const v1 = params.get('v1');
    const v2 = params.get('v2');
    return {
      v1: v1 ? decodeHashParam(v1) : null,
      v2: v2 ? decodeHashParam(v2) : null,
    };
  };

  const setDiscoveryHashWithCompare = (v1: string | null, v2: string | null) => {
    const params = new URLSearchParams();
    if (v1) params.set('v1', v1);
    if (v2) params.set('v2', v2);
    const nextHash = params.toString() ? `#discovery?${params.toString()}` : '#discovery';
    const base = window.location.href.split('#')[0];
    window.history.replaceState(null, '', `${base}${nextHash}`);
  };

  const navigateToCompareHash = (v1: string | null, v2: string | null) => {
    const params = new URLSearchParams();
    if (v1) params.set('v1', v1);
    if (v2) params.set('v2', v2);
    window.location.hash = params.toString() ? `compare?${params.toString()}` : 'compare';
  };

  useEffect(() => {
    seedDatabase();
  }, []);

  useEffect(() => {
    const handleViewVehicle = (event: CustomEvent) => {
      setSelectedVehicleId(event.detail.vehicleId);
      setCurrentPage('vehicle');
    };

    const handleNavigateCompare = (event: CarFinderWindowEventMap['navigate-compare']) => {
      const vehicleId = event instanceof CustomEvent ? (event.detail?.vehicleId ?? null) : null;
      setCompareV1Id(vehicleId);
      setCompareV2Id(null);
      setSelectedVehicleId(null);
      navigateToCompareHash(vehicleId, null);
    };

    addCarFinderEventListener('view-vehicle', handleViewVehicle);
    addCarFinderEventListener('navigate-compare', handleNavigateCompare);

    return () => {
      removeCarFinderEventListener('view-vehicle', handleViewVehicle);
      removeCarFinderEventListener('navigate-compare', handleNavigateCompare);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLiveVehicles = async () => {
      setIsLoadingVehicles(true);
      try {
        const liveVehicles = await fetchLiveVehicles();
        if (!cancelled) setVehicles(liveVehicles);
      } catch (error) {
        console.error('Failed to load live vehicles from Supabase:', error);
        if (!cancelled) setVehicles([]);
      } finally {
        if (!cancelled) setIsLoadingVehicles(false);
      }
    };

    void loadLiveVehicles();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const syncPublicPage = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#view=')) {
        const encodedId = hash.slice('#view='.length);
        const vehicleId = decodeHashParam(encodedId);
        if (!vehicleId) return;
        setSelectedVehicleId(vehicleId);
        setCurrentPage('vehicle');
        return;
      }
      if (hash.startsWith('#compare')) {
        const { v1, v2 } = parseCompareFromHash(hash);
        setCompareV1Id(v1);
        setCompareV2Id(v2);
        setSelectedVehicleId(null);
        setCurrentPage('compare');
        return;
      }
      if (hash.startsWith('#discovery')) {
        const { v1, v2 } = parseCompareFromHash(hash);
        setCompareV1Id(v1);
        setCompareV2Id(v2);
        setSelectedVehicleId(null);
        setCurrentPage('discovery');
      }
    };

    syncPublicPage();
    window.addEventListener('hashchange', syncPublicPage);
    return () => window.removeEventListener('hashchange', syncPublicPage);
  }, []);

  const setCompareV1 = (vehicleId: string) => {
    setCompareV1Id(vehicleId);
    setCompareV2Id(null);
    setDiscoveryHashWithCompare(vehicleId, null);
  };

  const setCompareV2AndNavigate = (vehicleId: string) => {
    if (!compareV1Id || compareV1Id === vehicleId) return;
    setCompareV2Id(vehicleId);
    setSelectedVehicleId(null);
    navigateToCompareHash(compareV1Id, vehicleId);
  };

  const handleNavigate = (page: string) => {
    if (page === 'discovery' || page === 'garage' || page === 'compare') {
      setCurrentPage(page);
      setSelectedVehicleId(null);
      if (page === 'compare') {
        navigateToCompareHash(compareV1Id, compareV2Id);
      } else if (page === 'discovery') {
        setDiscoveryHashWithCompare(compareV1Id, compareV2Id);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation onNavigate={handleNavigate} currentPage={currentPage} />

      {isLoadingVehicles ? (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-20 pb-12 px-4">
          <div className="max-w-7xl mx-auto">
            <p className="text-slate-600">Loading vehicles...</p>
          </div>
        </div>
      ) : (
        <>
          {currentPage === 'discovery' && (
            <Discovery
              vehicles={vehicles}
              compareV1Id={compareV1Id}
              compareV2Id={compareV2Id}
              onSetCompareV1={setCompareV1}
              onSetCompareV2AndNavigate={setCompareV2AndNavigate}
            />
          )}
          {currentPage === 'vehicle' && selectedVehicleId && (
            <VehicleDetailPage
              vehicleId={selectedVehicleId}
              vehicles={vehicles}
              onBack={() => setCurrentPage('discovery')}
            />
          )}
          {currentPage === 'compare' && (
            <Comparisons
              vehicles={vehicles}
              prefillVehicleIdA={compareV1Id}
              prefillVehicleIdB={compareV2Id}
            />
          )}
          {currentPage === 'garage' && <GaragePage vehicles={vehicles} />}
        </>
      )}
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

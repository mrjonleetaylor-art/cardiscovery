import { useEffect, useState } from 'react';
import { ArrowRight, Sparkles, GitCompare } from 'lucide-react';
import { Vehicle } from '../types';
import { supabase } from '../lib/supabase';

interface HomeProps {
  onNavigate: (page: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const [recentVehicles, setRecentVehicles] = useState<Vehicle[]>([]);
  const [popularComparisons, setPopularComparisons] = useState<Array<{ vehicles: Vehicle[] }>>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6);

    if (vehicles) {
      setRecentVehicles(vehicles);

      const comparisons = [
        [vehicles[0], vehicles[1]],
        [vehicles[2], vehicles[3]],
        [vehicles[4], vehicles[5]],
      ].filter(pair => pair[0] && pair[1]);

      setPopularComparisons(comparisons.map(vehicles => ({ vehicles })));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjAuNSIgb3BhY2l0eT0iMC4xIi8+PC9nPjwvc3ZnPg==')] opacity-20"></div>

        <div className="max-w-7xl mx-auto px-4 py-24 md:py-32 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Discover Your Perfect Match</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Find the car that moves you
            </h1>

            <p className="text-xl md:text-2xl text-slate-300 mb-8 leading-relaxed">
              Start with guided discovery. Compare trims and packs. Connect with our trusted dealer partner.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => onNavigate('discovery')}
                className="group flex items-center justify-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-slate-100 transition-all shadow-lg hover:shadow-xl"
              >
                Start Discovery
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => onNavigate('compare')}
                className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/20 transition-all border border-white/20"
              >
                <GitCompare className="w-5 h-5" />
                Compare Cars
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16">
        {popularComparisons.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Popular Comparisons</h2>
                <p className="text-slate-600">See how these vehicles stack up</p>
              </div>
              <button
                onClick={() => onNavigate('compare')}
                className="text-slate-900 font-medium hover:underline"
              >
                View all →
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {popularComparisons.map((comparison, idx) => {
                const [v1, v2] = comparison.vehicles;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      localStorage.setItem('compare_list', JSON.stringify([v1.id, v2.id]));
                      onNavigate('compare');
                    }}
                    className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-center flex-1">
                        <p className="text-sm font-medium text-slate-600">{v1.make}</p>
                        <p className="font-bold text-slate-900">{v1.model}</p>
                      </div>
                      <div className="px-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                          <span className="text-slate-600 text-sm font-bold">vs</span>
                        </div>
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-sm font-medium text-slate-600">{v2.make}</p>
                        <p className="font-bold text-slate-900">{v2.model}</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <button className="text-sm text-slate-600 hover:text-slate-900 font-medium">
                        View Comparison →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {recentVehicles.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Recently Added</h2>
                <p className="text-slate-600">Fresh arrivals to explore</p>
              </div>
              <button
                onClick={() => onNavigate('discovery')}
                className="text-slate-900 font-medium hover:underline"
              >
                View all →
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {recentVehicles.slice(0, 3).map((vehicle) => {
                const price = vehicle.base_price || vehicle.price || 0;
                return (
                  <div
                    key={vehicle.id}
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('view-vehicle', { detail: { vehicleId: vehicle.id } }));
                    }}
                    className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                  >
                    <div className="aspect-[16/9] bg-slate-100 overflow-hidden">
                      {vehicle.image_url ? (
                        <img
                          src={vehicle.image_url}
                          alt={`${vehicle.make} ${vehicle.model}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="text-xl font-bold text-slate-900 mb-1">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      {vehicle.ai_summary && (
                        <p className="text-sm text-slate-600 mb-3 line-clamp-2">{vehicle.ai_summary}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-bold text-slate-900">
                          ${price.toLocaleString()}
                        </p>
                        <span className="text-sm text-slate-600 group-hover:text-slate-900 font-medium">
                          View Details →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

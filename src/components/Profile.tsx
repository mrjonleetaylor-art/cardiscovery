import React, { useState, useEffect } from 'react';
import { User as UserIcon, Heart, BarChart3 } from 'lucide-react';
import { useAuth } from './Auth/AuthContext';
import { supabase } from '../lib/supabase';

interface ProfileStats {
  garageCount: number;
  comparisonCount: number;
}

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProfileStats>({
    garageCount: 0,
    comparisonCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { count: garageCount, error: garageError } = await supabase
        .from('user_garage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: comparisonCount, error: comparisonError } = await supabase
        .from('vehicle_comparisons')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (!garageError && !comparisonError) {
        setStats({
          garageCount: garageCount || 0,
          comparisonCount: comparisonCount || 0,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-blue-100 p-4 rounded-full">
              <UserIcon className="text-blue-600" size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Account Profile</h1>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Activity</h2>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Heart className="text-red-500" size={24} />
                    <h3 className="text-lg font-semibold text-gray-900">Saved Vehicles</h3>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{stats.garageCount}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Vehicles in your garage
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="text-green-600" size={24} />
                    <h3 className="text-lg font-semibold text-gray-900">Comparisons</h3>
                  </div>
                  <p className="text-3xl font-bold text-green-600">{stats.comparisonCount}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Vehicle comparisons created
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">About CarLook</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            CarLook helps car buyers find and compare vehicles from multiple dealerships in one convenient platform.
            Create an account to save your favorite vehicles, compare specifications, and track your search progress.
          </p>
          <p className="text-gray-600 leading-relaxed">
            We're committed to providing the most comprehensive car shopping experience. Our database includes thousands
            of vehicles from trusted dealerships across the country.
          </p>
        </div>
      </div>
    </div>
  );
};

import React, { useRef, useState, useEffect } from 'react';
import { Car, LogOut, Menu, X, Warehouse } from 'lucide-react';
import { useAuth } from './Auth/AuthContext';
import { AuthModal } from './Auth/AuthModal';
import { getGarageItems } from '../lib/session';
import { AUSTRALIAN_STATES } from '../lib/statePrice';

interface NavigationProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  selectedState: string;
  onStateChange: (state: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ onNavigate, currentPage, selectedState, onStateChange }) => {
  const { user, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [garageCount, setGarageCount] = useState(0);
  const [stateOpen, setStateOpen] = useState(false);
  const [hasSelectedState, setHasSelectedState] = useState(() => !!localStorage.getItem('car_state'));
  const stateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (stateRef.current && !stateRef.current.contains(e.target as Node)) {
        setStateOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStateSelect = (state: string) => {
    onStateChange(state);
    setHasSelectedState(true);
    setStateOpen(false);
  };

  useEffect(() => {
    updateGarageCount();
    window.addEventListener('garage-updated', updateGarageCount);
    return () => window.removeEventListener('garage-updated', updateGarageCount);
  }, []);

  const updateGarageCount = () => {
    setGarageCount(getGarageItems().length);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onNavigate('discovery');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const navItems = [
    { id: 'discovery', label: 'Discovery' },
    { id: 'compare', label: 'Compare' },
  ];

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-slate-200 fixed top-0 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('discovery')}>
            <Car className="text-slate-900" size={32} />
            <span className="text-2xl font-bold text-slate-900">CarDiscovery</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`text-sm font-medium transition-colors ${
                  currentPage === item.id
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => onNavigate('garage')}
              className={`relative flex items-center gap-2 text-sm font-medium transition-colors ${
                currentPage === 'garage'
                  ? 'text-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Warehouse size={20} />
              <span>Garage</span>
              {garageCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-slate-900 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {garageCount}
                </span>
              )}
            </button>
          </div>

          <div ref={stateRef} className="hidden md:block relative">
            <button
              onClick={() => setStateOpen(o => !o)}
              className="px-3 py-1 text-sm font-medium border border-slate-300 rounded-full text-slate-700 hover:border-slate-900 transition-colors"
            >
              {hasSelectedState ? selectedState : 'Pick state'}
            </button>
            {stateOpen && (
              <div className="absolute right-0 top-8 z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[80px]">
                {AUSTRALIAN_STATES.map(s => (
                  <button
                    key={s}
                    onClick={() => handleStateSelect(s)}
                    className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 ${selectedState === s && hasSelectedState ? 'font-semibold text-slate-900' : 'text-slate-600'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <button
                  onClick={() => onNavigate('profile')}
                  className="text-sm text-gray-700 hover:text-blue-600 font-medium"
                >
                  {user.email}
                </button>
                <button
                  onClick={handleSignOut}
                  className="text-gray-700 hover:text-red-600 transition-colors"
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Sign In
              </button>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-gray-700"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-50 border-t border-slate-200">
            <div className="px-4 py-4 space-y-3">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`block w-full text-left px-4 py-2 rounded text-sm font-medium ${
                    currentPage === item.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => {
                  onNavigate('garage');
                  setMobileMenuOpen(false);
                }}
                className={`relative flex items-center gap-2 w-full text-left px-4 py-2 rounded text-sm font-medium ${
                  currentPage === 'garage'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Warehouse size={20} />
                <span>Garage</span>
                {garageCount > 0 && (
                  <span className="ml-auto w-5 h-5 bg-slate-900 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {garageCount}
                  </span>
                )}
              </button>
              <div className="border-t border-slate-200 pt-3">
                <p className="px-4 pb-1 text-xs text-slate-400 font-medium uppercase tracking-widest">State</p>
                <div className="flex flex-wrap gap-2 px-4 pb-2">
                  {AUSTRALIAN_STATES.map(s => (
                    <button
                      key={s}
                      onClick={() => { handleStateSelect(s); setMobileMenuOpen(false); }}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${selectedState === s && hasSelectedState ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300 text-slate-700 hover:border-slate-900'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {user ? (
                <>
                  <button
                    onClick={() => {
                      onNavigate('profile');
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 rounded text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    {user.email}
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 rounded text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setAuthModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};

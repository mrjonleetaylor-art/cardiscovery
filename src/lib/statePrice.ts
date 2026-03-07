import { useState, useEffect, useCallback } from 'react';
import { StructuredVehicle } from '../types/specs';

export const AUSTRALIAN_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;

const STORAGE_KEY = 'car_state';
const DEFAULT_STATE = 'NSW';
const STATE_CHANGE_EVENT = 'car-state-changed';

export function useStatePrice(): [string, (state: string) => void] {
  const [selectedState, setSelectedState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_STATE;
    } catch {
      return DEFAULT_STATE;
    }
  });

  useEffect(() => {
    const handler = (e: Event) => {
      setSelectedState((e as CustomEvent<string>).detail);
    };
    window.addEventListener(STATE_CHANGE_EVENT, handler);
    return () => window.removeEventListener(STATE_CHANGE_EVENT, handler);
  }, []);

  const setState = useCallback((state: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, state);
    } catch {
      // ignore
    }
    setSelectedState(state);
    window.dispatchEvent(new CustomEvent(STATE_CHANGE_EVENT, { detail: state }));
  }, []);

  return [selectedState, setState];
}

export function resolvePrice(vehicle: StructuredVehicle, state: string): number | null {
  return vehicle.statePrices?.[state] ?? vehicle.trims[0]?.basePrice ?? null;
}

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LegacyModeContextType {
  isLegacyMode: boolean;
  toggleLegacyMode: () => void;
  setLegacyMode: (value: boolean) => void;
}

const LegacyModeContext = createContext<LegacyModeContextType | undefined>(undefined);

const STORAGE_KEY = 'radionetwork-legacy-mode';

export function LegacyModeProvider({ children }: { children: ReactNode }) {
  const [isLegacyMode, setIsLegacyMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') {
      setIsLegacyMode(true);
    }
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, String(isLegacyMode));
    }
  }, [isLegacyMode, mounted]);

  const toggleLegacyMode = () => {
    setIsLegacyMode(prev => !prev);
  };

  const setLegacyMode = (value: boolean) => {
    setIsLegacyMode(value);
  };

  return (
    <LegacyModeContext.Provider value={{ isLegacyMode, toggleLegacyMode, setLegacyMode }}>
      {children}
    </LegacyModeContext.Provider>
  );
}

export function useLegacyMode() {
  const context = useContext(LegacyModeContext);
  if (context === undefined) {
    throw new Error('useLegacyMode must be used within a LegacyModeProvider');
  }
  return context;
}

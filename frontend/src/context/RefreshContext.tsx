'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface RefreshContextType {
  isRefreshing: boolean;
  lastUpdated: Date | null;
  setRefreshing: (refreshing: boolean) => void;
  updateTimestamp: () => void;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const setRefreshing = useCallback((refreshing: boolean) => {
    setIsRefreshing(refreshing);
  }, []);

  const updateTimestamp = useCallback(() => {
    setLastUpdated(new Date());
  }, []);

  return (
    <RefreshContext.Provider
      value={{
        isRefreshing,
        lastUpdated,
        setRefreshing,
        updateTimestamp,
      }}
    >
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
}

import { createContext, useContext, useState, ReactNode } from 'react';

interface TripUpdateContextType {
  lastUpdate: number;
  triggerUpdate: () => void;
}

interface TripUpdateProviderProps {
  children: ReactNode;
  onUpdate: () => Promise<void>;
}

const TripUpdateContext = createContext<TripUpdateContextType | undefined>(undefined);

export function TripUpdateProvider({ children, onUpdate }: TripUpdateProviderProps) {
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const triggerUpdate = async () => {
    setLastUpdate(Date.now());
    await onUpdate();
  };

  return (
    <TripUpdateContext.Provider value={{ lastUpdate, triggerUpdate }}>
      {children}
    </TripUpdateContext.Provider>
  );
}

export function useTripUpdate() {
  const context = useContext(TripUpdateContext);
  if (context === undefined) {
    throw new Error('useTripUpdate must be used within a TripUpdateProvider');
  }
  return context;
} 
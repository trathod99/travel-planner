'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useUserManagement } from '@/hooks/useUserManagement';

interface AuthContextType {
  user: {
    phoneNumber: string;
    displayName: string | null;
  } | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { userData, isLoading } = useUserManagement();

  const value = {
    user: userData ? {
      phoneNumber: userData.phoneNumber,
      displayName: userData.name,
    } : null,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 
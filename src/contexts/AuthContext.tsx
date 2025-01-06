'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ref, get, set } from 'firebase/database';
import { database, auth } from '@/lib/firebase/clientApp';
import { signOut } from 'firebase/auth';

interface UserData {
  phoneNumber: string;
  name: string | null;
}

interface AuthContextType {
  userData: UserData | null;
  isNewUser: boolean;
  isAuthLoading: boolean;
  createOrFetchUser: (phoneNumber: string) => Promise<UserData | null>;
  saveUserName: (name: string) => Promise<void>;
  initializeNewUser: (phoneNumber: string) => Promise<UserData>;
  handleLogout: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setUserData(null);
        setIsAuthLoading(false);
        return;
      }

      try {
        const userRef = ref(database, `users/${user.phoneNumber?.replace(/[^0-9]/g, '')}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          setUserData(snapshot.val());
        } else {
          setUserData(null);
        }
      } catch (error) {
        setUserData(null);
      }
      setIsAuthLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const createOrFetchUser = async (phoneNumber: string) => {
    const userRef = ref(database, `users/${phoneNumber.replace(/[^0-9]/g, '')}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      const existingUser = snapshot.val();
      setUserData(existingUser);
      setIsNewUser(false);
      return existingUser;
    } else {
      setIsNewUser(true);
      return null;
    }
  };

  const initializeNewUser = async (phoneNumber: string) => {
    const formattedPhone = phoneNumber.replace(/[^0-9]/g, '');
    const newUser = {
      phoneNumber: formattedPhone,
      name: null,
    };
    
    const userRef = ref(database, `users/${formattedPhone}`);
    await set(userRef, newUser);
    setUserData(newUser);
    return newUser;
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserData(null);
      setIsNewUser(false);
      window.location.href = '/';
      return true;
    } catch (error) {
      throw error;
    }
  };

  const saveUserName = async (name: string) => {
    if (!userData?.phoneNumber) return;
    
    const formattedPhone = userData.phoneNumber.replace(/[^0-9]/g, '');
    const userRef = ref(database, `users/${formattedPhone}`);
    const updatedUser = { ...userData, name };
    await set(userRef, updatedUser);
    setUserData(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        userData,
        isNewUser,
        isAuthLoading,
        createOrFetchUser,
        saveUserName,
        initializeNewUser,
        handleLogout,
      }}
    >
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
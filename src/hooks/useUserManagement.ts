import { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { database, auth } from '@/lib/firebase/clientApp';
import { signOut } from 'firebase/auth';
import Cookies from 'js-cookie';

interface UserData {
  phoneNumber: string;
  name: string | null;
}

export function useUserManagement() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  // Check for existing auth on mount
  useEffect(() => {
    const savedUserData = Cookies.get('userData');
    if (savedUserData) {
      setUserData(JSON.parse(savedUserData));
    }

    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        setUserData(null);
        Cookies.remove('userData');
      }
    });

    return () => unsubscribe();
  }, []);

  const createOrFetchUser = async (phoneNumber: string) => {
    const userRef = ref(database, `users/${phoneNumber.replace(/[^0-9]/g, '')}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      const existingUser = snapshot.val();
      setUserData(existingUser);
      Cookies.set('userData', JSON.stringify(existingUser), { expires: 7 });
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
    Cookies.set('userData', JSON.stringify(newUser), { expires: 7 });
    return newUser;
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserData(null);
      setIsNewUser(false);
      Cookies.remove('userData');
      return true;
    } catch (error) {
      console.error('Logout error:', error);
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
    Cookies.set('userData', JSON.stringify(updatedUser), { expires: 7 });
  };

  return {
    userData,
    isNewUser,
    createOrFetchUser,
    saveUserName,
    initializeNewUser,
    handleLogout,
  };
} 
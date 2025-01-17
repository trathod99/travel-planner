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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setUserData(null);
        Cookies.remove('userData');
        setIsLoading(false);
        return;
      }

      try {
        const userRef = ref(database, `users/${user.phoneNumber?.replace(/[^0-9]/g, '')}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const fetchedUserData = snapshot.val();
          setUserData(fetchedUserData);
          Cookies.set('userData', JSON.stringify(fetchedUserData));
        } else {
          setUserData(null);
          Cookies.remove('userData');
        }
      } catch (error) {
        setUserData(null);
        Cookies.remove('userData');
      }
      setIsLoading(false);
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
      Cookies.set('userData', JSON.stringify(existingUser));
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
    Cookies.set('userData', JSON.stringify(newUser));
    return newUser;
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserData(null);
      setIsNewUser(false);
      Cookies.remove('userData');
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
    Cookies.set('userData', JSON.stringify(updatedUser));
  };

  return {
    userData,
    isNewUser,
    isLoading,
    createOrFetchUser,
    saveUserName,
    initializeNewUser,
    handleLogout,
  };
} 
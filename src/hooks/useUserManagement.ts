import { useState, useEffect } from 'react';
import { ref, get, set, Database } from 'firebase/database';
import { database, auth } from '@/lib/firebase/clientApp';
import { signOut } from 'firebase/auth';

interface UserData {
  phoneNumber: string;
  name: string | null;
}

export function useUserManagement() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserData(null);
      setIsNewUser(false);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

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

  const saveUserName = async (name: string) => {
    if (!userData?.phoneNumber) return;
    
    const formattedPhone = userData.phoneNumber.replace(/[^0-9]/g, '');
    const userRef = ref(database, `users/${formattedPhone}`);
    const updatedUser = { ...userData, name };
    await set(userRef, updatedUser);
    setUserData(updatedUser);
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
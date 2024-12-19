import { nanoid } from 'nanoid';
import { slugify } from './slugify';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase/clientApp';

export async function generateShareCode(tripName: string) {
  // First try with a slugified version of the trip name
  const baseSlug = slugify(tripName);
  const shortCode = nanoid(4); // Generate a 4-character unique code
  const shareCode = `${baseSlug}-${shortCode}`;

  // Check if this code already exists in the database
  const tripRef = ref(database, `trips/${shareCode}`);
  const snapshot = await get(tripRef);

  if (snapshot.exists()) {
    // If exists, generate a completely random code
    return `trip-${nanoid(8)}`;
  }

  return shareCode;
} 
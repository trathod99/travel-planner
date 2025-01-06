import { database } from './clientApp';
import { ref, push, update } from 'firebase/database';
import { Activity, ActivityType } from '@/types/activity';
import { v4 as uuidv4 } from 'uuid';

interface RecordActivityParams {
  tripId: string;
  type: ActivityType;
  userId: string;
  userName: string | null;
  details: Activity['details'];
}

export async function recordActivity({
  tripId,
  type,
  userId,
  userName,
  details
}: RecordActivityParams): Promise<void> {
  const activityId = uuidv4();
  const activity: Activity = {
    id: activityId,
    type,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    details
  };

  const updates: Record<string, any> = {};
  updates[`trips/${tripId}/activities/${activityId}`] = activity;

  try {
    await update(ref(database), updates);
  } catch (error) {
    console.error('Error recording activity:', error);
    throw error;
  }
} 
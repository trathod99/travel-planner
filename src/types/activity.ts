export type ActivityType = 
  | 'ITINERARY_ADD'
  | 'RSVP_CHANGE'
  | 'ITINERARY_VOTE'
  | 'TRIP_UPDATE'
  | 'TASK_CREATE'
  | 'TASK_COMPLETE';

export interface Activity {
  id: string;
  type: ActivityType;
  timestamp: string; // ISO string
  userId: string;
  userName: string | null;
  details: {
    // For ITINERARY_ADD
    itemName?: string;
    itemDate?: string;
    // For RSVP_CHANGE
    oldStatus?: 'going' | 'maybe' | 'not_going';
    newStatus?: 'going' | 'maybe' | 'not_going';
    // For ITINERARY_VOTE
    itemId?: string;
    voted?: boolean;
    // For TRIP_UPDATE
    field?: 'name' | 'location' | 'startDate' | 'endDate';
    oldValue?: string;
    newValue?: string;
    // For TASK_CREATE and TASK_COMPLETE
    taskName?: string;
    completed?: boolean;
  };
} 
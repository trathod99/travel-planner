export interface ItineraryItem {
  id: string;
  name: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  description?: string;
  order: number;
  createdBy: {
    phoneNumber: string;
    name: string | null;
  };
  category: 'None' | 'Travel' | 'Food' | 'Accommodation' | 'Activity';
  attachments?: {
    name: string;
    url: string;
    type: string;
    size: number;
    path: string;
  }[] | null;
  votes?: Record<string, boolean>; // phoneNumber -> hasVoted
}

export interface Trip {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  description?: string;
  createdAt: string;
  shareCode: string;
  itinerary?: Record<string, Record<string, ItineraryItem>>; // dateString -> Record of items
  rsvps?: Record<string, {
    name: string | null;
    status: 'going' | 'maybe' | 'not_going';
  }>; // phoneNumber -> RSVP data
} 
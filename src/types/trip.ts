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
  location: string | null;
  startDate: string | null; // ISO string
  endDate: string | null; // ISO string
  description?: string;
  createdAt: string;
  shareCode: string;
  createdBy: {
    phoneNumber: string;
    name: string | null;
  };
  admins: Record<string, {
    name: string | null;
    addedAt: string;
    addedBy: {
      phoneNumber: string;
      name: string | null;
    };
  }>; // phoneNumber -> admin data
  itinerary?: Record<string, Record<string, ItineraryItem>>; // dateString -> Record of items
  rsvps?: Record<string, {
    name: string | null;
    status: 'going' | 'maybe' | 'not_going';
  }>; // phoneNumber -> RSVP data
  image?: {
    url: string;
    path: string; // Storage path for deletion
    uploadedBy: {
      phoneNumber: string;
      name: string | null;
    };
    uploadedAt: string; // ISO string
    credit?: {
      name: string;
      link: string;
    };
  };
} 
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
  category: 'Travel' | 'Food' | 'Accommodation' | 'Activity';
  attachments?: {
    name: string;
    url: string;
    type: string;
    size: number;
    path: string;
  }[] | null;
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
} 
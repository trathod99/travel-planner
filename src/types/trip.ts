export interface ItineraryItem {
  id: string;
  name: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  description?: string;
  order: number;
  attachments?: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
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
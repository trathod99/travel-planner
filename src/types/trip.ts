import { ItineraryItem } from './ItineraryItem';

export interface Trip {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  createdBy: {
    phoneNumber: string;
    name: string;
  };
  shareCode: string;
  admins: {
    [phoneNumber: string]: {
      name: string;
      addedAt: string;
      addedBy: {
        phoneNumber: string;
        name: string;
      };
    };
  };
  itinerary?: {
    [date: string]: {
      [id: string]: ItineraryItem;
    };
  };
  image?: {
    url: string;
    path: string;
    uploadedBy: {
      phoneNumber: string;
      name: string | null;
    };
    uploadedAt: string;
    credit?: {
      name: string;
      link: string;
    };
  };
} 
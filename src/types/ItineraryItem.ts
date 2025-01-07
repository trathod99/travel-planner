export interface ItineraryItem {
  id: string;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  order: number;
  createdBy: {
    phoneNumber: string;
    name: string;
  };
  category: 'None' | 'Food' | 'Activity' | 'Transportation' | 'Accommodation';
  attachments: null | {
    url: string;
    type: string;
    name: string;
  }[];
} 
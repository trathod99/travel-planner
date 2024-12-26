import { Trip } from './trip';

export interface Task {
  id: string;
  title: string;
  dueDate?: string; // ISO string
  assignee?: {
    phoneNumber: string;
    name: string | null;
  };
  completed: boolean;
  createdAt: string;
  createdBy: {
    phoneNumber: string;
    name: string | null;
  };
}

export interface TripWithTasks extends Trip {
  tasks?: Record<string, Task>; // taskId -> Task
} 
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ref, onValue, update } from 'firebase/database';
import { database } from '@/lib/firebase/clientApp';
import { Task, TripWithTasks } from '@/types/task';
import AddTask from '@/components/tasks/AddTask';
import TaskList from '@/components/tasks/TaskList';
import { useAuth } from '@/contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

type Params = {
  tripId: string;
};

export default function TasksPage() {
  const { tripId } = useParams<Params>();
  const { user } = useAuth();
  const [trip, setTrip] = useState<TripWithTasks | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!tripId) return;

    const tripRef = ref(database, `trips/${tripId}`);
    const unsubscribe = onValue(tripRef, (snapshot) => {
      if (snapshot.exists()) {
        const tripData = snapshot.val() as TripWithTasks;
        console.log('Trip data:', tripData);
        console.log('RSVPs:', tripData.rsvps);
        setTrip(tripData);
        setTasks(tripData.tasks ? Object.values(tripData.tasks) : []);
      }
    });

    return () => unsubscribe();
  }, [tripId]);

  const handleAddTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'createdBy'>) => {
    console.log('Adding task with data:', taskData);
    if (!trip || !user || !tripId) {
      console.error('Missing required data:', { trip: !!trip, user: !!user, tripId });
      return;
    }

    const newTask: Task = {
      id: uuidv4(),
      title: taskData.title,
      completed: false,
      createdAt: new Date().toISOString(),
      createdBy: {
        phoneNumber: user.phoneNumber!,
        name: user.displayName,
      },
    };

    if (taskData.dueDate) {
      newTask.dueDate = taskData.dueDate;
    }
    if (taskData.assignee) {
      newTask.assignee = taskData.assignee;
    }

    console.log('Created new task object:', newTask);

    try {
      const taskPath = `trips/${tripId}/tasks/${newTask.id}`;
      console.log('Update path:', taskPath);
      
      const updates = {
        [taskPath]: newTask
      };

      console.log('Sending update to Firebase:', updates);
      await update(ref(database), updates);
      console.log('Task added successfully');
    } catch (error) {
      console.error('Error adding task:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
    }
  };

  const handleToggleComplete = async (taskId: string) => {
    if (!trip || !tripId) return;

    const task = trip.tasks?.[taskId];
    if (!task) return;

    try {
      const updates = {
        [`trips/${tripId}/tasks/${taskId}/completed`]: !task.completed,
      };

      await update(ref(database), updates);
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  };

  if (!trip || !user) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center text-muted-foreground">
          <div className="mb-2 text-lg">Loading...</div>
          <div className="text-sm">Please wait while we fetch your trip details</div>
        </div>
      </div>
    );
  }

  // Get list of trip participants from RSVPs
  const tripParticipants = Object.entries(trip.rsvps || {})
    .map(([phoneNumber, data]) => ({
      phoneNumber,
      name: data.name || null,
      status: data.status,
    }));

  console.log('Processed trip participants:', tripParticipants);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Tasks</h1>
      
      <AddTask
        onAddTask={handleAddTask}
        tripParticipants={tripParticipants}
        currentUser={{
          phoneNumber: user.phoneNumber!,
          name: user.displayName,
        }}
      />

      {tasks.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-lg text-gray-600">No tasks yet</p>
          <p className="text-sm text-gray-500">Add your first task using the form above</p>
        </div>
      ) : (
        <TaskList
          tasks={tasks}
          currentUser={{
            phoneNumber: user.phoneNumber!,
            name: user.displayName,
          }}
          onToggleComplete={handleToggleComplete}
        />
      )}
    </div>
  );
} 
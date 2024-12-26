'use client';

import { useState, useEffect } from 'react';
import { Task, TripWithTasks } from '@/types/task';
import AddTask from '@/components/tasks/AddTask';
import TaskList from '@/components/tasks/TaskList';
import { useUserManagement } from '@/hooks/useUserManagement';
import { ref, onValue, update } from 'firebase/database';
import { database } from '@/lib/firebase/clientApp';
import { v4 as uuidv4 } from 'uuid';

interface TasksProps {
  trip: TripWithTasks;
}

export function Tasks({ trip }: TasksProps) {
  const { userData } = useUserManagement();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!trip.shareCode) return;

    const tripRef = ref(database, `trips/${trip.shareCode}`);
    const unsubscribe = onValue(tripRef, (snapshot) => {
      if (snapshot.exists()) {
        const tripData = snapshot.val() as TripWithTasks;
        setTasks(tripData.tasks ? Object.values(tripData.tasks) : []);
      }
    });

    return () => unsubscribe();
  }, [trip.shareCode]);

  const handleAddTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'createdBy'>) => {
    if (!trip || !userData) return;

    const newTask: Task = {
      id: uuidv4(),
      ...taskData,
      createdAt: new Date().toISOString(),
      createdBy: {
        phoneNumber: userData.phoneNumber,
        name: userData.name,
      },
    };

    const updates: Record<string, any> = {};
    updates[`trips/${trip.shareCode}/tasks/${newTask.id}`] = newTask;
    await update(ref(database), updates);
  };

  const handleToggleComplete = async (taskId: string) => {
    if (!trip) return;

    const task = trip.tasks?.[taskId];
    if (!task) return;

    const updates: Record<string, any> = {};
    updates[`trips/${trip.shareCode}/tasks/${taskId}/completed`] = !task.completed;
    await update(ref(database), updates);
  };

  if (!userData) {
    return <div>Loading...</div>;
  }

  // Get list of trip participants from RSVPs
  const tripParticipants = Object.entries(trip.rsvps || {})
    .map(([phoneNumber, data]) => ({
      phoneNumber,
      name: data.name || null,
      status: data.status,
    }));

  return (
    <div className="space-y-6">
      <AddTask
        onAddTask={handleAddTask}
        tripParticipants={tripParticipants}
        currentUser={{
          phoneNumber: userData.phoneNumber,
          name: userData.name,
        }}
      />

      <TaskList
        tasks={tasks}
        currentUser={{
          phoneNumber: userData.phoneNumber,
          name: userData.name,
        }}
        onToggleComplete={handleToggleComplete}
      />
    </div>
  );
} 
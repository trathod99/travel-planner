'use client';

import { useState, useEffect } from 'react';
import { Task, TripWithTasks } from '@/types/task';
import AddTask from '@/components/tasks/AddTask';
import TaskList from '@/components/tasks/TaskList';
import { useUserManagement } from '@/hooks/useUserManagement';
import { ref, onValue, update } from 'firebase/database';
import { database } from '@/lib/firebase/clientApp';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { recordActivity } from '@/lib/firebase/recordActivity';

interface TasksProps {
  trip: TripWithTasks;
}

export function Tasks({ trip }: TasksProps) {
  const { userData } = useUserManagement();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tripData, setTripData] = useState<TripWithTasks>(trip);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = !!(userData?.phoneNumber && tripData.admins?.[userData.phoneNumber]);

  useEffect(() => {
    if (!trip.shareCode) return;

    const tripRef = ref(database, `trips/${trip.shareCode}`);
    const unsubscribe = onValue(tripRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setTripData(data);
        setTasks(data.tasks ? Object.values(data.tasks) : []);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [trip.shareCode]);

  const handleAddTask = async (task: Omit<Task, 'id' | 'createdAt' | 'createdBy'>) => {
    if (!trip.shareCode || !userData?.phoneNumber) return;

    const taskId = uuidv4();
    const newTask: Task = {
      id: taskId,
      ...task,
      createdAt: new Date().toISOString(),
      createdBy: {
        phoneNumber: userData.phoneNumber,
        name: userData.name || null,
      },
    };

    try {
      const updates: Record<string, any> = {};
      updates[`trips/${trip.shareCode}/tasks/${taskId}`] = newTask;
      await update(ref(database), updates);

      // Record the activity
      await recordActivity({
        tripId: trip.shareCode,
        type: 'TASK_CREATE',
        userId: userData.phoneNumber,
        userName: userData.name,
        details: {
          taskName: newTask.title
        }
      });

      toast({
        title: "Task Added",
        description: "The task has been added successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleComplete = async (taskId: string) => {
    if (!trip.shareCode || !userData?.phoneNumber) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Only allow task completion by assignee or admin
    if (!isAdmin && task.assignee?.phoneNumber !== userData.phoneNumber) {
      toast({
        title: "Permission Denied",
        description: "Only the assigned person or an admin can mark this task as complete.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newCompletedState = !task.completed;
      const updates: Record<string, any> = {};
      updates[`trips/${trip.shareCode}/tasks/${taskId}/completed`] = newCompletedState;
      await update(ref(database), updates);

      // Record the activity
      await recordActivity({
        tripId: trip.shareCode,
        type: 'TASK_COMPLETE',
        userId: userData.phoneNumber,
        userName: userData.name,
        details: {
          taskName: task.title,
          completed: newCompletedState
        }
      });

      toast({
        title: task.completed ? "Task Uncompleted" : "Task Completed",
        description: `The task has been marked as ${task.completed ? 'incomplete' : 'complete'}.`,
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!trip.shareCode || !userData?.phoneNumber || !isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only trip admins can delete tasks.",
        variant: "destructive",
      });
      return;
    }

    try {
      const updates: Record<string, any> = {};
      updates[`trips/${trip.shareCode}/tasks/${taskId}`] = null;
      await update(ref(database), updates);

      toast({
        title: "Task Deleted",
        description: "The task has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <AddTask
        onAddTask={handleAddTask}
        participants={Object.entries(tripData.rsvps || {}).map(([phoneNumber, data]) => ({
          phoneNumber,
          name: (data as { name: string | null }).name || null,
        }))}
      />

      <TaskList
        tasks={tasks}
        onToggleComplete={handleToggleComplete}
        onDeleteTask={handleDeleteTask}
        currentUser={{
          phoneNumber: userData?.phoneNumber || '',
          name: userData?.name || null,
        }}
        isAdmin={isAdmin}
      />
    </div>
  );
} 
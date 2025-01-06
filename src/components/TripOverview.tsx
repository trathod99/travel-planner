'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { database } from '@/lib/firebase/clientApp';
import { ref, update, remove, onValue } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { useUserManagement } from '@/hooks/useUserManagement';
import { format, parseISO } from 'date-fns';
import { Loader2, Calendar, MapPin, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SimpleDatePicker } from '@/components/ui/simple-date-picker';
import { TripRSVP } from './TripRSVP';
import TaskList from './tasks/TaskList';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Task } from '@/types/task';
import { CopyLink } from '@/components/CopyLink';
import { Label } from '@/components/ui/label';
import { recordActivity } from '@/lib/firebase/recordActivity';

interface TripOverviewProps {
  trip: {
    id: string;
    name: string;
    location: string | null;
    startDate: string | null;
    endDate: string | null;
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
    }>;
  };
}

export function TripOverview({ trip }: TripOverviewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { userData } = useUserManagement();
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editedLocation, setEditedLocation] = useState(trip.location || '');
  const [editedStartDate, setEditedStartDate] = useState<Date | undefined>(
    trip.startDate ? parseISO(trip.startDate) : undefined
  );
  const [editedEndDate, setEditedEndDate] = useState<Date | undefined>(
    trip.endDate ? parseISO(trip.endDate) : undefined
  );
  const [tasks, setTasks] = useState<Task[]>([]);

  const isAdmin = !!(userData?.phoneNumber && trip.admins?.[userData.phoneNumber]);

  useEffect(() => {
    if (!trip.id) return;

    const tripRef = ref(database, `trips/${trip.id}`);
    const unsubscribe = onValue(tripRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setTasks(data.tasks ? Object.values(data.tasks) : []);
      }
    });

    return () => unsubscribe();
  }, [trip.id]);

  const handleSaveChanges = async () => {
    if (!isAdmin || !userData) return;

    setIsUpdating(true);
    try {
      const updates: Record<string, any> = {};
      const activities = [];

      // Check for location change
      if (trip.location !== editedLocation) {
        updates[`trips/${trip.id}/location`] = editedLocation || null;
        activities.push({
          type: 'TRIP_UPDATE' as const,
          details: {
            field: 'location' as const,
            oldValue: trip.location || '',
            newValue: editedLocation || ''
          }
        });
      }

      // Check for start date change
      const oldStartDate = trip.startDate;
      const newStartDate = editedStartDate?.toISOString() || null;
      if (oldStartDate !== newStartDate) {
        updates[`trips/${trip.id}/startDate`] = newStartDate;
        activities.push({
          type: 'TRIP_UPDATE' as const,
          details: {
            field: 'startDate' as const,
            oldValue: oldStartDate || '',
            newValue: newStartDate || ''
          }
        });
      }

      // Check for end date change
      const oldEndDate = trip.endDate;
      const newEndDate = editedEndDate?.toISOString() || null;
      if (oldEndDate !== newEndDate) {
        updates[`trips/${trip.id}/endDate`] = newEndDate;
        activities.push({
          type: 'TRIP_UPDATE' as const,
          details: {
            field: 'endDate' as const,
            oldValue: oldEndDate || '',
            newValue: newEndDate || ''
          }
        });
      }

      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);

        // Record activities
        await Promise.all(activities.map(activity =>
          recordActivity({
            tripId: trip.id,
            type: activity.type,
            userId: userData.phoneNumber,
            userName: userData.name,
            details: activity.details
          })
        ));

        setIsEditing(false);
        
        toast({
          title: "Trip Updated",
          description: "Trip details have been updated successfully.",
        });
      } else {
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating trip:', error);
      toast({
        title: "Error",
        description: "Failed to update trip details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTrip = async () => {
    if (!isAdmin) return;

    setIsUpdating(true);
    try {
      await remove(ref(database, `trips/${trip.id}`));
      
      toast({
        title: "Trip Deleted",
        description: "The trip has been deleted successfully.",
      });

      router.push('/');
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast({
        title: "Error",
        description: "Failed to delete trip. Please try again.",
        variant: "destructive",
      });
      setIsUpdating(false);
    }
  };

  const handleToggleComplete = async (taskId: string) => {
    if (!trip.id || !userData?.phoneNumber) return;

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
      const updates: Record<string, any> = {};
      updates[`trips/${trip.id}/tasks/${taskId}/completed`] = !task.completed;
      await update(ref(database), updates);

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
    if (!trip.id || !userData?.phoneNumber || !isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only trip admins can delete tasks.",
        variant: "destructive",
      });
      return;
    }

    try {
      const updates: Record<string, any> = {};
      updates[`trips/${trip.id}/tasks/${taskId}`] = null;
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6">
      {isEditing ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="location" className="text-sm font-medium">
              Location
            </label>
            <Input
              id="location"
              value={editedLocation}
              onChange={(e) => setEditedLocation(e.target.value)}
              placeholder="Enter location"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <SimpleDatePicker
                date={editedStartDate}
                setDate={setEditedStartDate}
                placeholder="Start date"
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <SimpleDatePicker
                date={editedEndDate}
                setDate={setEditedEndDate}
                placeholder="End date"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
            <Button onClick={handleSaveChanges} disabled={isUpdating}>
              Save Changes
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setEditedLocation(trip.location || '');
                setEditedStartDate(trip.startDate ? new Date(trip.startDate) : undefined);
                setEditedEndDate(trip.endDate ? new Date(trip.endDate) : undefined);
                setIsEditing(false);
              }}
              disabled={isUpdating}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <h1 className="text-2xl font-bold mb-4">{trip.name}</h1>
          {(trip.location || isAdmin) && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {trip.location || 'No location set'}
              </span>
            </div>
          )}
          {(trip.startDate || trip.endDate || isAdmin) && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {formatDate(trip.startDate) || 'Start date'} 
                {trip.endDate && ' - '} 
                {formatDate(trip.endDate)}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 mt-4">
            <CopyLink shareCode={trip.id} />
            {isAdmin && (
              <>
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                  Edit Details
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Trip
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {userData?.phoneNumber && (
        <TripRSVP tripId={trip.id} userPhone={userData.phoneNumber} />
      )}

      {userData?.phoneNumber && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">My Tasks</h2>
          <TaskList
            tasks={tasks}
            currentUser={{
              phoneNumber: userData.phoneNumber,
              name: userData.name || null,
            }}
            onToggleComplete={handleToggleComplete}
            onDeleteTask={handleDeleteTask}
            isAdmin={isAdmin}
            showOnlyUserTasks={true}
          />
        </div>
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trip</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this trip? This action cannot be undone.
              All trip details, RSVPs, tasks, and itinerary items will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTrip}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isUpdating}
            >
              {isUpdating ? 'Deleting...' : 'Delete Trip'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 
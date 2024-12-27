import { Trip } from '@/types/trip';
import { Card, CardContent } from '@/components/ui/card';
import { TripRSVP } from '@/components/TripRSVP';
import { InlineEdit } from './InlineEdit';
import { database } from '@/lib/firebase/clientApp';
import { ref, update, onValue } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { useTripUpdate } from '@/contexts/TripUpdateContext';
import { CopyLink } from './CopyLink';
import { MapPin } from 'lucide-react';
import { MyTasks } from './tasks/MyTasks';
import { useState, useEffect } from 'react';
import { Task } from '@/types/task';

interface TripOverviewProps {
  trip: Trip;
  userPhone: string;
}

export function TripOverview({ trip, userPhone }: TripOverviewProps) {
  const { toast } = useToast();
  const { triggerUpdate } = useTripUpdate();
  const [tasks, setTasks] = useState<Task[]>([]);

  // Fetch tasks
  useEffect(() => {
    if (!trip.shareCode) return;

    const tripRef = ref(database, `trips/${trip.shareCode}`);
    const unsubscribe = onValue(tripRef, (snapshot) => {
      if (snapshot.exists()) {
        const tripData = snapshot.val();
        setTasks(tripData.tasks ? Object.values(tripData.tasks) : []);
      }
    });

    return () => unsubscribe();
  }, [trip.shareCode]);

  const handleSave = async (field: keyof Trip, value: string) => {
    try {
      // For dates, store the date string with a fixed time
      let updatedValue = value;
      if ((field === 'startDate' || field === 'endDate') && value) {
        updatedValue = `${value}T12:00:00.000Z`;
      }

      // Update database
      const tripRef = ref(database, `trips/${trip.shareCode}`);
      await update(tripRef, { [field]: updatedValue });

      // Trigger update to refresh parent state
      await triggerUpdate();
      
      toast({
        title: "Changes saved",
        description: "Trip details have been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating trip:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleToggleComplete = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updates: Record<string, any> = {};
    updates[`trips/${trip.shareCode}/tasks/${taskId}/completed`] = !task.completed;
    await update(ref(database), updates);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    try {
      return format(parseISO(dateString), 'yyyy-MM-dd');
    } catch (error) {
      console.warn('Invalid date:', dateString);
      return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Hero Section */}
        <div className="space-y-4">
          {/* Title and Copy Link Row */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              <InlineEdit
                value={trip.name}
                onSave={(value) => handleSave('name', value)}
                className="text-2xl font-bold"
              />
            </h1>
            <CopyLink shareCode={trip.shareCode} />
          </div>

          {/* Location and Dates on same line */}
          <div className="flex flex-col sm:flex-row items-start gap-4 text-muted-foreground">
            <div className="flex items-center gap-2 min-w-fit">
              <MapPin className="h-4 w-4" />
              <InlineEdit
                value={trip.location}
                onSave={(value) => handleSave('location', value)}
                className="text-lg"
              />
            </div>
            <div className="hidden sm:block text-gray-400">•</div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <InlineEdit
                value={formatDate(trip.startDate)}
                displayValue={formatDate(trip.startDate) || "Set start date"}
                type="date"
                onSave={(value) => handleSave('startDate', value)}
              />
              <span className="text-gray-400">→</span>
              <InlineEdit
                value={formatDate(trip.endDate)}
                displayValue={formatDate(trip.endDate) || "Set end date"}
                type="date"
                onSave={(value) => handleSave('endDate', value)}
              />
            </div>
          </div>

          {trip.description && (
            <p className="text-muted-foreground mt-2">{trip.description}</p>
          )}
        </div>
      </div>

      {/* My Tasks Section */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">My Tasks</h2>
        <MyTasks
          tasks={tasks}
          currentUser={{
            phoneNumber: userPhone,
            name: null,
          }}
          onToggleComplete={handleToggleComplete}
        />
      </div>

      {/* RSVP Section */}
      <Card>
        <CardContent className="p-6">
          <TripRSVP 
            tripId={trip.shareCode} 
            userPhone={userPhone}
          />
        </CardContent>
      </Card>
    </div>
  );
} 
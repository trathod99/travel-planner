import { Trip } from '@/types/trip';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CopyShareLink } from '@/components/CopyShareLink';
import { TripRSVP } from '@/components/TripRSVP';
import { InlineEdit } from './InlineEdit';
import { database } from '@/lib/firebase/clientApp';
import { ref, update } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { useTripUpdate } from '@/contexts/TripUpdateContext';

interface TripOverviewProps {
  trip: Trip;
  userPhone: string;
}

export function TripOverview({ trip, userPhone }: TripOverviewProps) {
  const { toast } = useToast();
  const { triggerUpdate } = useTripUpdate();

  const handleSave = async (field: keyof Trip, value: string) => {
    try {
      // For dates, store the date string with a fixed time
      let updatedValue = value;
      if (field === 'startDate' || field === 'endDate') {
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CopyShareLink shareCode={trip.shareCode} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-gray-500">Location</h2>
            <InlineEdit
              value={trip.location}
              onSave={(value) => handleSave('location', value)}
            />
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-medium text-gray-500">Dates</h2>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <div className="flex-1">
                <InlineEdit
                  value={format(parseISO(trip.startDate), 'yyyy-MM-dd')}
                  type="date"
                  onSave={(value) => handleSave('startDate', value)}
                />
              </div>
              <div className="flex items-center text-gray-400">→</div>
              <div className="flex-1">
                <InlineEdit
                  value={format(parseISO(trip.endDate), 'yyyy-MM-dd')}
                  type="date"
                  onSave={(value) => handleSave('endDate', value)}
                />
              </div>
            </div>
          </div>

          {trip.description && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-gray-500">Description</h2>
              <p className="text-gray-600">{trip.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <TripRSVP 
        tripId={trip.shareCode} 
        userPhone={userPhone}
      />
    </div>
  );
} 
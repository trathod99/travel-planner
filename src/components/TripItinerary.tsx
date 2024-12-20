import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TripDateSelector } from './TripDateSelector';
import { Trip } from '@/types/trip';
import { database } from '@/lib/firebase/clientApp';
import { ref, get } from 'firebase/database';

interface TripItineraryProps {
  trip: Trip;
}

export function TripItinerary({ trip: initialTrip }: TripItineraryProps) {
  const [trip, setTrip] = useState<Trip>(initialTrip);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(initialTrip.startDate));

  // Fetch latest trip data when component mounts or when switching to the tab
  useEffect(() => {
    async function fetchLatestTripData() {
      const tripRef = ref(database, `trips/${initialTrip.shareCode}`);
      const snapshot = await get(tripRef);
      
      if (snapshot.exists()) {
        const latestTrip = snapshot.val();
        setTrip(latestTrip);
        
        // Update selected date if trip dates have changed
        const startDate = new Date(latestTrip.startDate);
        const endDate = new Date(latestTrip.endDate);
        const currentSelected = selectedDate;

        if (currentSelected < startDate || currentSelected > endDate) {
          setSelectedDate(startDate);
        }
      }
    }

    fetchLatestTripData();
  }, [initialTrip.shareCode]); // Re-run when shareCode changes

  return (
    <div className="space-y-6">
      <TripDateSelector
        startDate={new Date(trip.startDate)}
        endDate={new Date(trip.endDate)}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-700">Morning</h2>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No activities planned yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-700">Daytime</h2>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No activities planned yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-700">Night</h2>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No activities planned yet</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
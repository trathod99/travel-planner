import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TripDateSelector } from './TripDateSelector';
import { Trip } from '@/types/trip';

interface TripItineraryProps {
  trip: Trip;
}

export function TripItinerary({ trip }: TripItineraryProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(trip.startDate));

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
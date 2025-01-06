import { Calendar, MapPin, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface TripPreviewProps {
  trip: {
    name: string;
    location: string | null;
    startDate: string | null;
    endDate: string | null;
    admins: Record<string, {
      name: string | null;
      addedAt: string;
      addedBy: {
        phoneNumber: string;
        name: string | null;
      };
    }>;
  };
  onSignInClick: () => void;
}

export function TripPreview({ trip, onSignInClick }: TripPreviewProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return null;
    }
  };

  const adminNames = Object.values(trip.admins || {})
    .map(admin => admin.name || 'Unnamed Admin')
    .join(', ');

  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">{trip.name}</h1>
          
          {trip.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{trip.location}</span>
            </div>
          )}
          
          {(trip.startDate || trip.endDate) && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {formatDate(trip.startDate)} 
                {trip.endDate && ' - '} 
                {formatDate(trip.endDate)}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Organized by {adminNames}
            </span>
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button onClick={onSignInClick} className="w-full">
            Sign in to RSVP
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { database } from '@/lib/firebase/clientApp';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import { useUserManagement } from '@/hooks/useUserManagement';
import { Trip } from '@/types/trip';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface TripWithRSVP extends Trip {
  rsvpStatus: 'going' | 'maybe' | 'not_going';
}

// Helper function to map old status values to new ones
function mapRSVPStatus(status: string): 'going' | 'maybe' | 'not_going' {
  switch (status) {
    case 'accepted':
      return 'going';
    case 'pending':
      return 'maybe';
    case 'declined':
      return 'not_going';
    case 'going':
      return 'going';
    case 'maybe':
      return 'maybe';
    case 'not_going':
      return 'not_going';
    default:
      console.warn(`Unknown RSVP status: ${status}, defaulting to maybe`);
      return 'maybe';
  }
}

export default function Page() {
  const router = useRouter();
  const { userData, isLoading: isAuthLoading } = useUserManagement();
  const { toast } = useToast();
  const [trips, setTrips] = useState<{
    going: TripWithRSVP[];
    maybe: TripWithRSVP[];
    not_going: TripWithRSVP[];
  }>({
    going: [],
    maybe: [],
    not_going: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!userData) {
      router.push('/');
      return;
    }
    const phoneNumber = userData.phoneNumber;
    if (!phoneNumber) return;

    async function fetchTrips() {
      try {
        // Fetch all trips
        const tripsRef = ref(database, 'trips');
        const tripsSnapshot = await get(tripsRef);
        
        const sortedTrips = {
          going: [] as TripWithRSVP[],
          maybe: [] as TripWithRSVP[],
          not_going: [] as TripWithRSVP[],
        };

        if (tripsSnapshot.exists()) {
          const allTrips = tripsSnapshot.val() as Record<string, Trip>;
          
          // Filter trips where user has an RSVP
          Object.entries(allTrips).forEach(([tripId, trip]) => {
            const userRSVP = trip.rsvps?.[phoneNumber];
            if (userRSVP) {
              const mappedStatus = mapRSVPStatus(userRSVP.status);
              sortedTrips[mappedStatus].push({
                ...trip,
                rsvpStatus: mappedStatus,
              });
            }
          });

          // Sort trips by creation date (newest first)
          Object.keys(sortedTrips).forEach((status) => {
            sortedTrips[status as keyof typeof sortedTrips].sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          });
        }

        setTrips(sortedTrips);
      } catch (error) {
        console.error('Error fetching trips:', error);
        toast({
          title: "Error",
          description: "Failed to load trips. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrips();
  }, [userData, isAuthLoading, router, toast]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">
          Loading your trips...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">My Trips</h1>
        <Link
          href="/"
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
        >
          Create Trip
        </Link>
      </div>

      <div className="space-y-8">
        {/* Going */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Going</h2>
          {trips.going.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No trips you're going to yet
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trips.going.map((trip) => (
                <Link key={trip.shareCode} href={`/trip/${trip.shareCode}`}>
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-6">
                      <h3 className="font-medium mb-2">{trip.name}</h3>
                      <p className="text-sm text-muted-foreground">{trip.location}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Maybe */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Maybe</h2>
          {trips.maybe.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No trips you're considering
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trips.maybe.map((trip) => (
                <Link key={trip.shareCode} href={`/trip/${trip.shareCode}`}>
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-6">
                      <h3 className="font-medium mb-2">{trip.name}</h3>
                      <p className="text-sm text-muted-foreground">{trip.location}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Not Going */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Not Going</h2>
          {trips.not_going.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No trips you've declined
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trips.not_going.map((trip) => (
                <Link key={trip.shareCode} href={`/trip/${trip.shareCode}`}>
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-6">
                      <h3 className="font-medium mb-2">{trip.name}</h3>
                      <p className="text-sm text-muted-foreground">{trip.location}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
} 
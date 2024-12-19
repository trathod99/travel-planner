'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { database } from '@/lib/firebase/clientApp';
import { ref, get } from 'firebase/database';
import { useUserManagement } from '@/hooks/useUserManagement';
import { Trip } from '@/types/trip';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface TripWithRSVP extends Trip {
  rsvpStatus: 'going' | 'maybe' | 'not_going';
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
    // Only redirect if we're sure the user is not authenticated
    if (!isAuthLoading && !userData) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to view your trips.",
        variant: "destructive",
      });
      router.push('/');
      return;
    }

    // Don't fetch trips if we're still loading auth state or if there's no user
    if (isAuthLoading || !userData) {
      return;
    }

    async function fetchTrips() {
      try {
        // First, get all RSVPs for the user
        const userRSVPsRef = ref(database, 'trip-rsvps');
        const rsvpsSnapshot = await get(userRSVPsRef);
        const userRSVPs: Record<string, { status: 'going' | 'maybe' | 'not_going' }> = {};
        
        if (rsvpsSnapshot.exists()) {
          // Loop through each trip's RSVPs
          Object.entries(rsvpsSnapshot.val()).forEach(([tripId, tripRSVPs]: [string, any]) => {
            // Find user's RSVP in this trip
            const userRSVP = Object.values(tripRSVPs).find(
              (rsvp: any) => rsvp.phoneNumber === userData.phoneNumber
            );
            if (userRSVP) {
              userRSVPs[tripId] = { status: userRSVP.status };
            }
          });
        }

        // Then, fetch the details of each trip
        const tripsRef = ref(database, 'trips');
        const tripsSnapshot = await get(tripsRef);
        
        const sortedTrips = {
          going: [] as TripWithRSVP[],
          maybe: [] as TripWithRSVP[],
          not_going: [] as TripWithRSVP[],
        };

        if (tripsSnapshot.exists()) {
          const allTrips = tripsSnapshot.val();
          Object.entries(userRSVPs).forEach(([tripId, rsvp]) => {
            const trip = allTrips[tripId];
            if (trip) {
              sortedTrips[rsvp.status].push({
                ...trip,
                rsvpStatus: rsvp.status,
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
          description: "Failed to load your trips. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrips();
  }, [userData, router, isAuthLoading, toast]);

  // Show loading state while checking auth
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    );
  }

  // Don't show anything while redirecting
  if (!userData) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-lg text-gray-600">Loading your trips...</p>
      </div>
    );
  }

  const TripCard = ({ trip }: { trip: TripWithRSVP }) => (
    <Link href={`/trip/${trip.shareCode}`} className="block">
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-lg mb-2">{trip.name}</h3>
          <p className="text-gray-600 mb-2">{trip.location}</p>
          {trip.startDate && (
            <p className="text-sm text-gray-500">
              {new Date(trip.startDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              {trip.endDate && ' → '}
              {trip.endDate && new Date(trip.endDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );

  const renderSection = (title: string, trips: TripWithRSVP[]) => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {trips.length === 0 ? (
        <p className="text-gray-500">No trips in this category</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Trips</h1>
      <div className="space-y-8">
        {renderSection('Going', trips.going)}
        {renderSection('Maybe', trips.maybe)}
        {renderSection('Not Going', trips.not_going)}
      </div>
    </main>
  );
} 
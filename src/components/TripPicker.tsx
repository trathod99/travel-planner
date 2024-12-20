import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { database } from '@/lib/firebase/clientApp';
import { ref, get } from 'firebase/database';
import { Trip } from '@/types/trip';
import { useUserManagement } from '@/hooks/useUserManagement';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import Link from 'next/link';

interface TripWithRSVP extends Trip {
  rsvpStatus: 'going' | 'maybe' | 'not_going';
}

interface TripRSVP {
  phoneNumber: string;
  status: 'going' | 'maybe' | 'not_going';
}

export function TripPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const { userData } = useUserManagement();
  const [trips, setTrips] = useState<TripWithRSVP[]>([]);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);

  // Fetch user's trips
  useEffect(() => {
    if (!userData?.phoneNumber) return;
    const phoneNumber = userData.phoneNumber;

    async function fetchTrips() {
      try {
        // First, get all RSVPs for the user
        const userRSVPsRef = ref(database, 'trip-rsvps');
        const rsvpsSnapshot = await get(userRSVPsRef);
        const userRSVPs: Record<string, { status: 'going' | 'maybe' | 'not_going' }> = {};
        
        if (rsvpsSnapshot.exists()) {
          // Loop through each trip's RSVPs
          const rsvpsData = rsvpsSnapshot.val() as Record<string, Record<string, TripRSVP>>;
          Object.entries(rsvpsData).forEach(([tripId, tripRSVPs]) => {
            // Find user's RSVP in this trip
            const userRSVP = Object.values(tripRSVPs).find(
              (rsvp) => rsvp.phoneNumber === phoneNumber
            );
            if (userRSVP) {
              userRSVPs[tripId] = { status: userRSVP.status };
            }
          });
        }

        // Then, fetch the details of each trip
        const tripsRef = ref(database, 'trips');
        const tripsSnapshot = await get(tripsRef);
        
        const userTrips: TripWithRSVP[] = [];

        if (tripsSnapshot.exists()) {
          const allTrips = tripsSnapshot.val() as Record<string, Trip>;
          Object.entries(userRSVPs).forEach(([tripId, rsvp]) => {
            const trip = allTrips[tripId];
            if (trip) {
              userTrips.push({
                ...trip,
                rsvpStatus: rsvp.status,
              });
            }
          });

          // Sort trips by creation date (newest first)
          userTrips.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }

        setTrips(userTrips);
      } catch (error) {
        console.error('Error fetching trips:', error);
      }
    }

    fetchTrips();
  }, [userData]);

  // Set current trip based on URL
  useEffect(() => {
    if (!pathname.startsWith('/trip/')) {
      setCurrentTrip(null);
      return;
    }

    const shareCode = pathname.split('/')[2];
    const trip = trips.find(t => t.shareCode === shareCode);
    setCurrentTrip(trip || null);
  }, [pathname, trips]);

  if (!userData || trips.length === 0) {
    return (
      <Link 
        href="/" 
        className="text-lg font-semibold hover:text-gray-600 transition-colors"
      >
        Home
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 text-lg font-semibold hover:text-gray-600">
        {currentTrip ? currentTrip.name : 'Select Trip'}
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuItem asChild>
          <Link href="/" className="w-full">
            Create New Trip
          </Link>
        </DropdownMenuItem>
        {trips.map((trip) => (
          <DropdownMenuItem
            key={trip.shareCode}
            asChild
          >
            <Link href={`/trip/${trip.shareCode}`} className="w-full">
              {trip.name}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 
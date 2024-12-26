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

export function TripPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const { userData } = useUserManagement();
  const [trips, setTrips] = useState<TripWithRSVP[]>([]);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);

  // Fetch user's trips
  useEffect(() => {
    if (!userData) return;
    const phoneNumber = userData.phoneNumber;
    if (!phoneNumber) return;

    async function fetchTrips() {
      try {
        // Fetch all trips
        const tripsRef = ref(database, 'trips');
        const tripsSnapshot = await get(tripsRef);
        
        const userTrips: TripWithRSVP[] = [];

        if (tripsSnapshot.exists()) {
          const allTrips = tripsSnapshot.val() as Record<string, Trip>;
          
          // Filter trips where user has an RSVP
          Object.values(allTrips).forEach((trip) => {
            const userRSVP = trip.rsvps?.[phoneNumber];
            if (userRSVP) {
              userTrips.push({
                ...trip,
                rsvpStatus: userRSVP.status,
              });
            }
          });

          // Sort trips by creation date (newest first)
          userTrips.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }

        setTrips(userTrips);

        // Set current trip if we're on a trip page
        if (pathname.startsWith('/trip/')) {
          const shareCode = pathname.split('/')[2];
          const currentTrip = userTrips.find(t => t.shareCode === shareCode);
          setCurrentTrip(currentTrip || null);
        }
      } catch (error) {
        console.error('Error fetching trips:', error);
      }
    }

    fetchTrips();
  }, [userData, pathname]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 text-sm">
        {currentTrip?.name || 'Select Trip'} <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {trips.map((trip) => (
          <DropdownMenuItem key={trip.shareCode} asChild>
            <Link href={`/trip/${trip.shareCode}`}>
              {trip.name}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem asChild>
          <Link href="/my-trips" className="text-muted-foreground">
            View All Trips
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 
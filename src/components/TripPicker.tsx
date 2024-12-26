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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus } from "lucide-react";
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
        } else {
          setCurrentTrip(null);
        }
      } catch (error) {
        console.error('Error fetching trips:', error);
      }
    }

    fetchTrips();
  }, [userData, pathname]);

  // Update current trip when pathname changes
  useEffect(() => {
    if (pathname.startsWith('/trip/')) {
      const shareCode = pathname.split('/')[2];
      const currentTrip = trips.find(t => t.shareCode === shareCode);
      setCurrentTrip(currentTrip || null);
    } else {
      setCurrentTrip(null);
    }
  }, [pathname, trips]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 text-sm">
        {currentTrip ? (
          <span className="max-w-[200px] truncate">{currentTrip.name}</span>
        ) : (
          <span>Select Trip</span>
        )}
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuItem asChild>
          <Link href="/" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Trip
          </Link>
        </DropdownMenuItem>
        
        {trips.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {trips.map((trip) => (
              <DropdownMenuItem key={trip.shareCode} asChild>
                <Link 
                  href={`/trip/${trip.shareCode}`}
                  className="flex items-center justify-between"
                >
                  <span className="truncate">{trip.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {trip.rsvpStatus === 'going' ? '(Going)' :
                     trip.rsvpStatus === 'maybe' ? '(Maybe)' :
                     '(Not Going)'}
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 
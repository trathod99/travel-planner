import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { database } from '@/lib/firebase/clientApp';
import { ref, onValue } from 'firebase/database';
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

  // Get current trip's shareCode from pathname
  const currentShareCode = pathname.startsWith('/trip/') ? pathname.split('/')[2] : null;

  // Listen for changes to the current trip
  useEffect(() => {
    if (!currentShareCode) return;

    const tripRef = ref(database, `trips/${currentShareCode}`);
    const unsubscribe = onValue(tripRef, (snapshot) => {
      if (snapshot.exists()) {
        const tripData = snapshot.val() as Trip;
        setCurrentTrip(tripData);
        
        // Also update this trip in the trips list
        setTrips(prevTrips => {
          const updatedTrips = [...prevTrips];
          const index = updatedTrips.findIndex(t => t.shareCode === currentShareCode);
          if (index !== -1) {
            updatedTrips[index] = {
              ...tripData,
              rsvpStatus: updatedTrips[index].rsvpStatus,
            };
          }
          return updatedTrips;
        });
      }
    });

    return () => unsubscribe();
  }, [currentShareCode]);

  // Fetch all user's trips
  useEffect(() => {
    if (!userData) return;
    const phoneNumber = userData.phoneNumber;
    if (!phoneNumber) return;

    const tripsRef = ref(database, 'trips');
    const unsubscribe = onValue(tripsRef, (snapshot) => {
      try {
        const userTrips: TripWithRSVP[] = [];

        if (snapshot.exists()) {
          const allTrips = snapshot.val() as Record<string, Trip>;
          
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

        // Set current trip if we're on a trip page and don't have it yet
        if (currentShareCode && !currentTrip) {
          const currentTrip = userTrips.find(t => t.shareCode === currentShareCode);
          setCurrentTrip(currentTrip || null);
        }
      } catch (error) {
        console.error('Error processing trips:', error);
      }
    });

    return () => unsubscribe();
  }, [userData, currentShareCode, currentTrip]);

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
          <div key="trips-section">
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
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 
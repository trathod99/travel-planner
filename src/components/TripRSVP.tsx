'use client';

import { useState, useEffect } from 'react';
import { database } from '@/lib/firebase/clientApp';
import { ref, update, onValue } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserManagement } from '@/hooks/useUserManagement';

interface TripRSVPProps {
  tripId: string;
  userPhone: string;
}

export function TripRSVP({ tripId, userPhone }: TripRSVPProps) {
  const { toast } = useToast();
  const { userData } = useUserManagement();
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(null);
  const [allRSVPs, setAllRSVPs] = useState<Array<{
    phoneNumber: string;
    name: string | null;
    status: 'going' | 'maybe' | 'not_going';
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;

    const tripRef = ref(database, `trips/${tripId}`);
    const unsubscribe = onValue(tripRef, (snapshot) => {
      if (snapshot.exists()) {
        const tripData = snapshot.val();
        const rsvps = tripData.rsvps || {};

        // Convert RSVPs to array format
        const rsvpArray = Object.entries(rsvps).map(([phoneNumber, data]) => ({
          phoneNumber,
          name: (data as { name: string | null }).name || null,
          status: (data as { status: 'going' | 'maybe' | 'not_going' }).status,
        }));

        setAllRSVPs(rsvpArray);
        
        // Set user's RSVP status if found
        const userRSVP = rsvps[userPhone] as { status: string } | undefined;
        setRsvpStatus(userRSVP?.status || null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [tripId, userPhone]);

  const handleRSVPChange = async (newStatus: string) => {
    try {
      const updates: Record<string, any> = {
        [`trips/${tripId}/rsvps/${userPhone}`]: {
          name: userData?.name || null,
          status: newStatus,
        },
      };

      await update(ref(database), updates);
      setRsvpStatus(newStatus);
      
      toast({
        title: "RSVP Updated",
        description: "Your RSVP has been saved successfully.",
      });
    } catch (error) {
      console.error('Error updating RSVP:', error);
      toast({
        title: "Error",
        description: "Failed to update RSVP. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Your RSVP</h2>
        <Select 
          value={rsvpStatus || ''} 
          onValueChange={handleRSVPChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={isLoading ? "Loading..." : "Select your status"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="going">Going</SelectItem>
            <SelectItem value="maybe">Maybe</SelectItem>
            <SelectItem value="not_going">Not Going</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Who's Going</h2>
        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading RSVPs...</p>
          ) : allRSVPs.length === 0 ? (
            <p className="text-sm text-gray-500">No RSVPs yet</p>
          ) : (
            allRSVPs.map((rsvp) => (
              <div 
                key={rsvp.phoneNumber}
                className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded-md"
              >
                <span className="text-sm">
                  {rsvp.phoneNumber === userPhone ? 
                    'You' : 
                    (rsvp.name || 'Guest')}
                </span>
                <span className={`text-sm font-medium ${
                  rsvp.status === 'going' ? 'text-green-600' :
                  rsvp.status === 'maybe' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {rsvp.status === 'going' ? 'Going' :
                   rsvp.status === 'maybe' ? 'Maybe' :
                   'Not Going'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 
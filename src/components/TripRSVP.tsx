'use client';

import { useState, useEffect } from 'react';
import { database } from '@/lib/firebase/clientApp';
import { ref, set, onValue, get } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserManagement } from '@/hooks/useUserManagement';

interface RSVPData {
  phoneNumber: string;
  name?: string | null;
  status: 'going' | 'maybe' | 'not_going';
  updatedAt: string;
}

interface TripRSVPProps {
  tripId: string;
  userPhone: string;
}

interface UserDetails {
  phoneNumber: string;
  name: string | null;
}

export function TripRSVP({ tripId, userPhone }: TripRSVPProps) {
  const { toast } = useToast();
  const { userData } = useUserManagement();
  const [rsvpStatus, setRsvpStatus] = useState<string>('');
  const [allRSVPs, setAllRSVPs] = useState<RSVPData[]>([]);
  const [userDetails, setUserDetails] = useState<Record<string, UserDetails>>({});

  useEffect(() => {
    const rsvpsRef = ref(database, `trip-rsvps/${tripId}`);
    const unsubscribe = onValue(rsvpsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const rsvps = Object.values(snapshot.val()) as RSVPData[];
        setAllRSVPs(rsvps);
        
        // Fetch user details for all RSVPs
        const userDetailsMap: Record<string, UserDetails> = {};
        await Promise.all(
          rsvps.map(async (rsvp) => {
            const userRef = ref(database, `users/${rsvp.phoneNumber.replace(/[^0-9]/g, '')}`);
            const userSnapshot = await get(userRef);
            if (userSnapshot.exists()) {
              userDetailsMap[rsvp.phoneNumber] = userSnapshot.val();
            }
          })
        );
        setUserDetails(userDetailsMap);
        
        // Find user's RSVP
        const userRSVP = rsvps.find(rsvp => rsvp.phoneNumber === userPhone);
        if (userRSVP) {
          setRsvpStatus(userRSVP.status);
        }
      }
    });

    return () => unsubscribe();
  }, [tripId, userPhone]);

  const handleRSVPChange = async (newStatus: string) => {
    try {
      const rsvpData: RSVPData = {
        phoneNumber: userPhone,
        name: userData?.name,
        status: newStatus as RSVPData['status'],
        updatedAt: new Date().toISOString(),
      };

      await set(ref(database, `trip-rsvps/${tripId}/${userPhone.replace(/[^0-9]/g, '')}`), rsvpData);
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
        <Select value={rsvpStatus} onValueChange={handleRSVPChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select your status" />
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
          {allRSVPs.length === 0 ? (
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
                    (userDetails[rsvp.phoneNumber]?.name || 'Guest')}
                </span>
                <span className={`text-sm font-medium ${
                  rsvp.status === 'going' ? 'text-green-600' :
                  rsvp.status === 'maybe' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {rsvp.status.replace('_', ' ')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 
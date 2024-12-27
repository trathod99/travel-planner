'use client';

import { useState, useEffect } from 'react';
import { database } from '@/lib/firebase/clientApp';
import { ref, update, onValue } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { useUserManagement } from '@/hooks/useUserManagement';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TripRSVPProps {
  tripId: string;
  userPhone: string;
}

type RSVPStatus = 'going' | 'maybe' | 'not_going';

interface RSVPUser {
  phoneNumber: string;
  name: string | null;
  status: RSVPStatus;
}

export function TripRSVP({ tripId, userPhone }: TripRSVPProps) {
  const { toast } = useToast();
  const { userData } = useUserManagement();
  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus | null>(null);
  const [allRSVPs, setAllRSVPs] = useState<RSVPUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

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
          status: (data as { status: RSVPStatus }).status,
        }));

        setAllRSVPs(rsvpArray);
        
        // Set user's RSVP status if found
        const userRSVP = rsvps[userPhone] as { status: RSVPStatus } | undefined;
        setRsvpStatus(userRSVP?.status || null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [tripId, userPhone]);

  const handleRSVPChange = async (newStatus: RSVPStatus) => {
    setIsUpdating(true);
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
    } finally {
      setIsUpdating(false);
    }
  };

  // Sort RSVPs to keep current user at top and group by status
  const sortedRSVPs = [...allRSVPs].sort((a, b) => {
    // Current user always first
    if (a.phoneNumber === userPhone) return -1;
    if (b.phoneNumber === userPhone) return 1;
    
    // Then sort by status: going > maybe > not_going
    const statusOrder = { going: 0, maybe: 1, not_going: 2 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  const getStatusColor = (status: RSVPStatus) => {
    switch (status) {
      case 'going': return 'text-green-600';
      case 'maybe': return 'text-yellow-600';
      case 'not_going': return 'text-red-600';
      default: return '';
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Who's Going</h2>
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading RSVPs...</p>
        ) : sortedRSVPs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No RSVPs yet</p>
        ) : (
          sortedRSVPs.map((rsvp) => (
            <div 
              key={rsvp.phoneNumber}
              className="flex justify-between items-center py-3 px-4 bg-muted/50 rounded-lg"
            >
              <span className="text-sm font-medium">
                {rsvp.phoneNumber === userPhone ? 
                  'You' : 
                  (rsvp.name || 'Guest')}
              </span>
              {rsvp.phoneNumber === userPhone ? (
                <div className="flex items-center gap-2">
                  {isUpdating && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <Select
                    value={rsvpStatus || ''}
                    onValueChange={(value) => handleRSVPChange(value as RSVPStatus)}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className={`w-[110px] ${rsvpStatus ? getStatusColor(rsvpStatus) : ''}`}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="going" className="text-green-600">Going</SelectItem>
                      <SelectItem value="maybe" className="text-yellow-600">Maybe</SelectItem>
                      <SelectItem value="not_going" className="text-red-600">Not Going</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <span className={`text-sm font-medium ${getStatusColor(rsvp.status)}`}>
                  {rsvp.status === 'going' ? 'Going' :
                   rsvp.status === 'maybe' ? 'Maybe' :
                   'Not Going'}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
} 
import { Card, CardContent } from '@/components/ui/card';
import { ItineraryItem } from '@/types/trip';
import { Paperclip, ThumbsUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserManagement } from '@/hooks/useUserManagement';
import { database } from '@/lib/firebase/clientApp';
import { ref, update, get } from 'firebase/database';
import { useTripUpdate } from '@/contexts/TripUpdateContext';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState, useEffect } from 'react';

interface ItineraryItemCardProps {
  item: ItineraryItem;
  onEdit: (item: ItineraryItem) => void;
  tripId: string;
  dateString: string;
}

interface VoterInfo {
  phoneNumber: string;
  name: string | null;
}

export function ItineraryItemCard({ item, onEdit, tripId, dateString }: ItineraryItemCardProps) {
  const { userData } = useUserManagement();
  const { triggerUpdate } = useTripUpdate();
  const userPhone = userData?.phoneNumber;
  const [voters, setVoters] = useState<VoterInfo[]>([]);
  
  // Calculate total votes
  const totalVotes = item.votes ? Object.values(item.votes).filter(Boolean).length : 0;
  
  // Check if current user has voted
  const hasVoted = userPhone ? (item.votes?.[userPhone] || false) : false;

  // Fetch voter information when votes change
  useEffect(() => {
    const fetchVoters = async () => {
      if (!item.votes) return;
      
      const voterPhones = Object.entries(item.votes)
        .filter(([_, hasVoted]) => hasVoted)
        .map(([phone]) => phone);

      const voterInfos: VoterInfo[] = [];
      
      for (const phone of voterPhones) {
        const userRef = ref(database, `users/${phone}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const userData = snapshot.val();
          voterInfos.push({
            phoneNumber: phone,
            name: userData.name || null
          });
        }
      }
      
      setVoters(voterInfos);
    };

    fetchVoters();
  }, [item.votes]);

  const handleVote = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening edit dialog
    if (!userPhone) return;

    try {
      const votes = { ...(item.votes || {}) };
      if (votes[userPhone]) {
        delete votes[userPhone];
      } else {
        votes[userPhone] = true;
      }

      const updates: Record<string, any> = {};
      updates[`trips/${tripId}/itinerary/${dateString}/${item.id}/votes`] = votes;
      await update(ref(database), updates);
      await triggerUpdate();
    } catch (error) {
      console.error('Error updating votes:', error);
    }
  };

  // Format time from ISO string (HH:mm)
  const formatTime = (isoString: string) => {
    const time = isoString.split('T')[1].substring(0, 5);
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const attachmentCount = item.attachments?.length || 0;

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col"
      onClick={() => onEdit(item)}
    >
      <CardContent className="p-3 flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-hidden">
          <h3 className="font-medium text-sm">
            {item.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {formatTime(item.startTime)} - {formatTime(item.endTime)}
          </p>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>
      </CardContent>
      
      {/* Bottom bar with pills */}
      <div className="p-3 border-t bg-muted/30">
        {/* Container for pills and voting buttons */}
        <div className="relative">
          {/* Left side: pills that can wrap */}
          <div className="flex flex-wrap gap-2 items-start pr-20">
            {/* Group category and attachment pills */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {item.category !== 'None' && (
                <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 mb-1">
                  {item.category}
                </span>
              )}
              {attachmentCount > 0 && (
                <div className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5 text-xs mb-1">
                  <Paperclip className="h-3 w-3" />
                  <span>{attachmentCount}</span>
                </div>
              )}
            </div>
            
            {/* Created by pill in its own group */}
            {item.createdBy && (
              <div className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5 text-xs mb-1">
                {item.createdBy.name || 'Anonymous'}
              </div>
            )}
          </div>

          {/* Right side: voting buttons fixed to the right */}
          <div className="absolute right-0 top-0 flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 px-2 flex items-center gap-1 text-xs",
                hasVoted ? "text-green-600 hover:text-green-500" : "text-muted-foreground hover:text-muted-foreground/80"
              )}
              onClick={handleVote}
            >
              <ThumbsUp className={cn(
                "h-3 w-3",
                hasVoted ? "text-green-600" : "text-muted-foreground"
              )} />
              <span>{totalVotes}</span>
            </Button>
            {totalVotes > 0 && (
              <Popover>
                <PopoverTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-transparent"
                  >
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-48 p-2" 
                  align="end"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <h4 className="text-sm font-medium mb-2">Voted for by:</h4>
                  <div className="space-y-1">
                    {voters.map((voter) => (
                      <div key={voter.phoneNumber} className="text-xs text-muted-foreground">
                        {voter.name || 'Anonymous'}
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
} 
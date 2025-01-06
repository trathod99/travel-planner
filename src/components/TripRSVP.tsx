'use client';

import { useState, useEffect } from 'react';
import { database } from '@/lib/firebase/clientApp';
import { ref, update, onValue } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { useUserManagement } from '@/hooks/useUserManagement';
import { recordActivity } from '@/lib/firebase/recordActivity';
import { Loader2, Shield, MoreVertical, UserMinus, ShieldCheck, ShieldX } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';

interface TripRSVPProps {
  tripId: string;
  userPhone: string;
}

type RSVPStatus = 'going' | 'maybe' | 'not_going';

interface RSVPUser {
  phoneNumber: string;
  name: string | null;
  status: RSVPStatus;
  isAdmin?: boolean;
}

export function TripRSVP({ tripId, userPhone }: TripRSVPProps) {
  const { toast } = useToast();
  const { userData } = useUserManagement();
  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus | null>(null);
  const [allRSVPs, setAllRSVPs] = useState<RSVPUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);
  const [showAdminConfirm, setShowAdminConfirm] = useState<{phoneNumber: string, action: 'add' | 'remove'} | null>(null);

  useEffect(() => {
    if (!tripId) return;

    const tripRef = ref(database, `trips/${tripId}`);
    const unsubscribe = onValue(tripRef, (snapshot) => {
      if (snapshot.exists()) {
        const tripData = snapshot.val();
        const rsvps = tripData.rsvps || {};
        const admins = tripData.admins || {};

        // Convert RSVPs to array format with admin status
        const rsvpArray = Object.entries(rsvps).map(([phoneNumber, data]) => ({
          phoneNumber,
          name: (data as { name: string | null }).name || null,
          status: (data as { status: RSVPStatus }).status,
          isAdmin: !!admins[phoneNumber],
        }));

        setAllRSVPs(rsvpArray);
        setIsCurrentUserAdmin(!!admins[userPhone]);
        setIsCreator(tripData.createdBy?.phoneNumber === userPhone);
        
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
      const oldStatus = rsvpStatus;
      const updates: Record<string, any> = {
        [`trips/${tripId}/rsvps/${userPhone}`]: {
          name: userData?.name || null,
          status: newStatus,
        },
      };

      await update(ref(database), updates);
      
      // Record the activity
      if (userData) {
        await recordActivity({
          tripId,
          type: 'RSVP_CHANGE',
          userId: userPhone,
          userName: userData.name,
          details: {
            oldStatus: oldStatus || undefined,
            newStatus,
          }
        });
      }

      setRsvpStatus(newStatus);
      
      toast({
        title: "RSVP Updated",
        description: "Your RSVP has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update RSVP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveParticipant = async (phoneNumber: string) => {
    try {
      const updates: Record<string, any> = {
        [`trips/${tripId}/rsvps/${phoneNumber}`]: null,
      };

      await update(ref(database), updates);
      setShowRemoveConfirm(null);
      
      toast({
        title: "Participant Removed",
        description: "The participant has been removed from the trip.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove participant. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAdminAction = async (phoneNumber: string, action: 'add' | 'remove') => {
    try {
      const updates: Record<string, any> = {};
      
      if (action === 'add') {
        const participant = allRSVPs.find(r => r.phoneNumber === phoneNumber);
        updates[`trips/${tripId}/admins/${phoneNumber}`] = {
          name: participant?.name || null,
          addedAt: new Date().toISOString(),
          addedBy: {
            phoneNumber: userPhone,
            name: userData?.name || null,
          },
        };
      } else {
        // Check if this would remove the last admin
        const currentAdmins = allRSVPs.filter(r => r.isAdmin);
        if (currentAdmins.length <= 1) {
          toast({
            title: "Error",
            description: "Cannot remove the last admin from the trip.",
            variant: "destructive",
          });
          return;
        }
        
        updates[`trips/${tripId}/admins/${phoneNumber}`] = null;
      }

      await update(ref(database), updates);
      setShowAdminConfirm(null);
      
      toast({
        title: `Admin ${action === 'add' ? 'Added' : 'Removed'}`,
        description: `Successfully ${action === 'add' ? 'added' : 'removed'} admin role.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update admin status. Please try again.",
        variant: "destructive",
      });
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
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">No RSVPs yet</p>
            <Select
              value={rsvpStatus || ''}
              onValueChange={(value) => handleRSVPChange(value as RSVPStatus)}
              disabled={isUpdating}
            >
              <SelectTrigger className={`w-[110px] ${rsvpStatus ? getStatusColor(rsvpStatus) : ''}`}>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="going" value="going" className="text-green-600">Going</SelectItem>
                <SelectItem key="maybe" value="maybe" className="text-yellow-600">Maybe</SelectItem>
                <SelectItem key="not_going" value="not_going" className="text-red-600">Not Going</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          sortedRSVPs.map((rsvp) => (
            <div 
              key={rsvp.phoneNumber}
              className="flex justify-between items-center py-3 px-4 bg-muted/50 rounded-lg"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {rsvp.phoneNumber === userPhone ? 
                    'You' : 
                    (rsvp.name || 'Guest')}
                </span>
                {rsvp.isAdmin && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    Admin
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isUpdating && rsvp.phoneNumber === userPhone && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {rsvp.phoneNumber === userPhone ? (
                  <Select
                    value={rsvpStatus || ''}
                    onValueChange={(value) => handleRSVPChange(value as RSVPStatus)}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className={`w-[110px] ${rsvpStatus ? getStatusColor(rsvpStatus) : ''}`}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem key="going" value="going" className="text-green-600">Going</SelectItem>
                      <SelectItem key="maybe" value="maybe" className="text-yellow-600">Maybe</SelectItem>
                      <SelectItem key="not_going" value="not_going" className="text-red-600">Not Going</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <span className={`text-sm font-medium ${getStatusColor(rsvp.status)}`}>
                      {rsvp.status === 'going' ? 'Going' :
                       rsvp.status === 'maybe' ? 'Maybe' :
                       'Not Going'}
                    </span>
                    {isCurrentUserAdmin && rsvp.phoneNumber !== userPhone && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(!rsvp.isAdmin || (rsvp.isAdmin && !isCreator)) && (
                            <DropdownMenuItem
                              onClick={() => setShowAdminConfirm({ 
                                phoneNumber: rsvp.phoneNumber, 
                                action: rsvp.isAdmin ? 'remove' : 'add' 
                              })}
                              className="gap-2"
                            >
                              {rsvp.isAdmin ? (
                                <>
                                  <ShieldX className="h-4 w-4" />
                                  Remove Admin
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="h-4 w-4" />
                                  Make Admin
                                </>
                              )}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setShowRemoveConfirm(rsvp.phoneNumber)}
                            className="gap-2 text-destructive"
                          >
                            <UserMinus className="h-4 w-4" />
                            Remove from Trip
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
        {!isLoading && sortedRSVPs.length > 0 && !sortedRSVPs.some(rsvp => rsvp.phoneNumber === userPhone) && (
          <div className="mt-4">
            <Select
              value={rsvpStatus || ''}
              onValueChange={(value) => handleRSVPChange(value as RSVPStatus)}
              disabled={isUpdating}
            >
              <SelectTrigger className={`w-[110px] ${rsvpStatus ? getStatusColor(rsvpStatus) : ''}`}>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="going" value="going" className="text-green-600">Going</SelectItem>
                <SelectItem key="maybe" value="maybe" className="text-yellow-600">Maybe</SelectItem>
                <SelectItem key="not_going" value="not_going" className="text-red-600">Not Going</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Remove Participant Confirmation */}
      <AlertDialog open={!!showRemoveConfirm} onOpenChange={() => setShowRemoveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Participant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this participant from the trip? They will need to RSVP again to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showRemoveConfirm && handleRemoveParticipant(showRemoveConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin Action Confirmation */}
      <AlertDialog open={!!showAdminConfirm} onOpenChange={() => setShowAdminConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {showAdminConfirm?.action === 'add' ? 'Add Admin' : 'Remove Admin'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {showAdminConfirm?.action === 'add'
                ? "Are you sure you want to make this participant an admin? They will have full access to manage the trip."
                : "Are you sure you want to remove this participant's admin role?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showAdminConfirm && handleAdminAction(showAdminConfirm.phoneNumber, showAdminConfirm.action)}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 
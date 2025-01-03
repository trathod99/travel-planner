'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { database } from '@/lib/firebase/clientApp';
import { ref, push, set } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { useUserManagement } from '@/hooks/useUserManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleDatePicker } from '@/components/ui/simple-date-picker';

export function CreateTripForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { userData } = useUserManagement();
  const [isLoading, setIsLoading] = useState(false);
  const [tripName, setTripName] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.phoneNumber) {
      toast({
        title: "Error",
        description: "You must be logged in to create a trip.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const tripsRef = ref(database, 'trips');
      const newTripRef = push(tripsRef);
      const shareCode = newTripRef.key;

      if (!shareCode) {
        throw new Error('Failed to generate trip ID');
      }

      const tripData = {
        id: shareCode,
        name: tripName,
        location: location || null,
        startDate: startDate?.toISOString() || null,
        endDate: endDate?.toISOString() || null,
        createdAt: new Date().toISOString(),
        createdBy: {
          phoneNumber: userData.phoneNumber,
          name: userData.name || null,
        },
        rsvps: {
          [userData.phoneNumber]: {
            status: 'going',
            updatedAt: new Date().toISOString(),
            name: userData.name || null,
          }
        },
        admins: {
          [userData.phoneNumber]: {
            name: userData.name || null,
            addedAt: new Date().toISOString(),
            addedBy: {
              phoneNumber: userData.phoneNumber,
              name: userData.name || null,
            }
          }
        }
      };

      await set(newTripRef, tripData);
      
      toast({
        title: "Trip Created",
        description: "Your trip has been created successfully.",
      });

      router.push(`/trip/${shareCode}`);
    } catch (error) {
      console.error('Error creating trip:', error);
      toast({
        title: "Error",
        description: "Failed to create trip. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a New Trip</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tripName">Trip Name</Label>
            <Input
              id="tripName"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <SimpleDatePicker
                date={startDate}
                setDate={setStartDate}
                placeholder="Start date"
                data-testid="start-date"
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <SimpleDatePicker
                date={endDate}
                setDate={setEndDate}
                placeholder="End date"
                data-testid="end-date"
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Trip'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 
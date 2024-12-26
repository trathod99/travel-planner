'use client';

import { useState, useEffect } from 'react';
import { database } from '@/lib/firebase/clientApp';
import { ref, get } from 'firebase/database';
import { notFound, useParams } from 'next/navigation';
import { Trip } from '@/types/trip';
import { TripWithTasks } from '@/types/task';
import { PhoneAuth } from '@/components/PhoneAuth';
import { useUserManagement } from '@/hooks/useUserManagement';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TripOverview } from '@/components/TripOverview';
import { TripItinerary } from '@/components/TripItinerary';
import { Tasks } from '@/components/Tasks';
import { TripUpdateProvider } from '@/contexts/TripUpdateContext';

export default function TripPage() {
  const params = useParams();
  const shareCode = params?.shareCode as string;
  const [trip, setTrip] = useState<TripWithTasks | null>(null);
  const [showPhoneAuth, setShowPhoneAuth] = useState(false);
  const { userData, isLoading } = useUserManagement();

  const fetchLatestTrip = async () => {
    if (!shareCode) return;
    
    const tripRef = ref(database, `trips/${shareCode}`);
    const snapshot = await get(tripRef);
    
    if (!snapshot.exists()) {
      notFound();
    }

    setTrip(snapshot.val());
  };

  useEffect(() => {
    if (isLoading) return;

    if (!userData) {
      setShowPhoneAuth(true);
      return;
    }

    fetchLatestTrip();
  }, [shareCode, userData, isLoading]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    );
  }

  // Show phone auth if not authenticated
  if (showPhoneAuth || !userData) {
    return (
      <div className="max-w-md mx-auto p-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Verify Your Phone to View Trip</h2>
          </CardHeader>
          <CardContent>
            <PhoneAuth onAuthSuccess={() => setShowPhoneAuth(false)} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state while fetching trip
  if (!trip) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-lg text-gray-600">Loading trip details...</p>
      </div>
    );
  }

  // Show trip details once authenticated
  return (
    <div className="max-w-2xl mx-auto p-6">
      <TripUpdateProvider onUpdate={fetchLatestTrip}>
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <TripOverview 
              trip={trip} 
              userPhone={userData.phoneNumber} 
            />
          </TabsContent>
          
          <TabsContent value="itinerary">
            <TripItinerary trip={trip} />
          </TabsContent>

          <TabsContent value="tasks">
            <Tasks trip={trip} />
          </TabsContent>
        </Tabs>
      </TripUpdateProvider>
    </div>
  );
} 
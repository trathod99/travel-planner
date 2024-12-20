'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { database } from '@/lib/firebase/clientApp';
import { ref, get } from 'firebase/database';
import { notFound } from 'next/navigation';
import { Trip } from '@/types/trip';
import { PhoneAuth } from '@/components/PhoneAuth';
import { useUserManagement } from '@/hooks/useUserManagement';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TripOverview } from '@/components/TripOverview';
import { TripItinerary } from '@/components/TripItinerary';

interface PageProps {
  params: Promise<{ shareCode: string }>;
}

export default function TripPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { shareCode } = resolvedParams;
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { userData } = useUserManagement();

  useEffect(() => {
    async function fetchTrip() {
      const tripRef = ref(database, `trips/${shareCode}`);
      const snapshot = await get(tripRef);
      
      if (snapshot.exists()) {
        setTrip(snapshot.val());
      }
      setIsLoading(false);
    }

    fetchTrip();
  }, [shareCode]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Loading trip details...</p>
      </div>
    );
  }

  if (!trip) {
    return notFound();
  }

  // If user is not authenticated, show phone auth
  if (!userData) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <h1 className="text-2xl font-bold">Sign in to view trip details</h1>
        </CardHeader>
        <CardContent>
          <PhoneAuth redirectPath={`/trip/${shareCode}`} />
        </CardContent>
      </Card>
    );
  }

  // Show trip details once authenticated
  return (
    <div className="max-w-2xl mx-auto p-6">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <TripOverview trip={trip} userPhone={userData.phoneNumber} />
        </TabsContent>
        
        <TabsContent value="itinerary">
          <TripItinerary trip={trip} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 
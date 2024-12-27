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
import { Home, Calendar, ClipboardList } from 'lucide-react';

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
    <TripUpdateProvider onUpdate={fetchLatestTrip}>
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="sticky top-0 w-full bg-background border-b sm:border-b-0 sm:mt-4">
          <div className="max-w-2xl mx-auto">
            <TabsList className="w-full grid grid-cols-3 h-auto p-2">
              <TabsTrigger value="overview" className="flex flex-col items-center gap-1 py-2 px-1">
                <Home className="h-5 w-5" />
                <span className="text-xs font-medium">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="itinerary" className="flex flex-col items-center gap-1 py-2 px-1">
                <Calendar className="h-5 w-5" />
                <span className="text-xs font-medium">Itinerary</span>
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex flex-col items-center gap-1 py-2 px-1">
                <ClipboardList className="h-5 w-5" />
                <span className="text-xs font-medium">Tasks</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
        
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
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
        </div>
      </Tabs>
    </TripUpdateProvider>
  );
} 
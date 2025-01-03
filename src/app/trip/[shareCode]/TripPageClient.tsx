'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { database } from '@/lib/firebase/clientApp';
import { ref, onValue } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { useUserManagement } from '@/hooks/useUserManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Loader2, Home, Calendar, ClipboardList } from 'lucide-react';
import { TripOverview } from '@/components/TripOverview';
import { TripItinerary } from '@/components/TripItinerary';
import { Tasks } from '@/components/Tasks';
import { PhoneAuth } from '@/components/PhoneAuth';

interface TripPageClientProps {
  shareCode: string;
}

export function TripPageClient({ shareCode }: TripPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { userData } = useUserManagement();
  const [trip, setTrip] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPhoneAuth, setShowPhoneAuth] = useState(false);

  useEffect(() => {
    if (!shareCode) return;

    const tripRef = ref(database, `trips/${shareCode}`);
    const unsubscribe = onValue(tripRef, (snapshot) => {
      if (snapshot.exists()) {
        const tripData = snapshot.val();
        // Ensure the trip has the shareCode
        setTrip({ ...tripData, shareCode });
      } else {
        toast({
          title: "Trip Not Found",
          description: "The trip you're looking for doesn't exist.",
          variant: "destructive",
        });
        router.push('/');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [shareCode, router, toast]);

  const handleAuthSuccess = () => {
    setShowPhoneAuth(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!trip) {
    return null;
  }

  if (!userData?.phoneNumber) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Verify Your Phone to View Trip</h2>
        <PhoneAuth onAuthSuccess={handleAuthSuccess} />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="overview" className="flex flex-col items-center gap-1">
            <Home className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="itinerary" className="flex flex-col items-center gap-1">
            <Calendar className="h-4 w-4" />
            Itinerary
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex flex-col items-center gap-1">
            <ClipboardList className="h-4 w-4" />
            Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TripOverview trip={trip} />
        </TabsContent>

        <TabsContent value="itinerary">
          <TripItinerary trip={trip} />
        </TabsContent>

        <TabsContent value="tasks">
          <Tasks trip={trip} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 
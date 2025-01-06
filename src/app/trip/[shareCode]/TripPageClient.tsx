'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { database } from '@/lib/firebase/clientApp';
import { ref, onValue, get } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { useUserManagement } from '@/hooks/useUserManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Loader2, Home, Calendar, ClipboardList, Activity } from 'lucide-react';
import { TripOverview } from '@/components/TripOverview';
import { TripItinerary } from '@/components/TripItinerary';
import { Tasks } from '@/components/Tasks';
import { PhoneAuth } from '@/components/PhoneAuth';
import { TripPreview } from '@/components/TripPreview';
import { TripUpdateProvider } from '@/contexts/TripUpdateContext';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { Activity as ActivityType } from '@/types/activity';

interface TripPageClientProps {
  shareCode: string;
}

export function TripPageClient({ shareCode }: TripPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { userData, isLoading: isAuthLoading } = useUserManagement();
  const [trip, setTrip] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [isTripLoading, setIsTripLoading] = useState(true);
  const [showPhoneAuth, setShowPhoneAuth] = useState(false);

  const fetchLatestTrip = async () => {
    if (!shareCode) return;
    const tripRef = ref(database, `trips/${shareCode}`);
    const snapshot = await get(tripRef);
    if (snapshot.exists()) {
      setTrip({ ...snapshot.val(), shareCode });
    }
  };

  // Fetch trip data
  useEffect(() => {
    if (!shareCode) return;

    const tripRef = ref(database, `trips/${shareCode}`);
    const unsubscribe = onValue(tripRef, (snapshot) => {
      if (snapshot.exists()) {
        const tripData = snapshot.val();
        setTrip({ ...tripData, shareCode });
      } else {
        toast({
          title: "Trip Not Found",
          description: "The trip you're looking for doesn't exist.",
          variant: "destructive",
        });
        router.push('/');
      }
      setIsTripLoading(false);
    });

    return () => unsubscribe();
  }, [shareCode, router, toast]);

  // Fetch activities
  useEffect(() => {
    if (!shareCode) return;

    const activitiesRef = ref(database, `trips/${shareCode}/activities`);
    const unsubscribe = onValue(activitiesRef, (snapshot) => {
      if (snapshot.exists()) {
        const activitiesData = snapshot.val();
        const activitiesList = Object.values(activitiesData) as ActivityType[];
        // Sort by timestamp, most recent first
        activitiesList.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setActivities(activitiesList);
      } else {
        setActivities([]);
      }
    });

    return () => unsubscribe();
  }, [shareCode]);

  // Handle successful authentication
  const handleAuthSuccess = () => {
    window.location.reload();
  };

  // Show loading state while checking auth and fetching initial trip data
  if (isAuthLoading || isTripLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] gap-3">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm text-muted-foreground">
          {isAuthLoading ? 'Checking authentication...' : 'Loading trip details...'}
        </p>
      </div>
    );
  }

  // Handle trip not found
  if (!trip) {
    return null;
  }

  // Show preview for unauthenticated users
  if (!userData) {
    const previewData = {
      name: trip.name,
      location: trip.location,
      startDate: trip.startDate,
      endDate: trip.endDate,
      admins: trip.admins || {}
    };

    if (showPhoneAuth) {
      return (
        <div className="space-y-6">
          <TripPreview 
            trip={previewData}
            onSignInClick={() => {}} 
          />
          <Card className="max-w-2xl mx-auto p-6">
            <h2 className="text-lg font-semibold mb-4">Sign in to see full trip details</h2>
            <PhoneAuth onAuthSuccess={handleAuthSuccess} />
          </Card>
        </div>
      );
    }

    return (
      <TripPreview 
        trip={previewData}
        onSignInClick={() => setShowPhoneAuth(true)} 
      />
    );
  }

  return (
    <TripUpdateProvider onUpdate={fetchLatestTrip}>
      <div className="space-y-6">
        <Tabs defaultValue="overview" className="w-full">
          <div className="sticky top-0 w-full bg-background border-b sm:border-b-0 sm:mt-4">
            <div className="max-w-2xl mx-auto">
              <TabsList className="w-full grid grid-cols-4 h-auto p-2">
                <TabsTrigger value="overview" className="flex flex-col items-center gap-1 py-2 px-1">
                  <Home className="h-4 w-4" />
                  <span className="text-xs font-medium">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="itinerary" className="flex flex-col items-center gap-1 py-2 px-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-medium">Itinerary</span>
                </TabsTrigger>
                <TabsTrigger value="tasks" className="flex flex-col items-center gap-1 py-2 px-1">
                  <ClipboardList className="h-4 w-4" />
                  <span className="text-xs font-medium">Tasks</span>
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex flex-col items-center gap-1 py-2 px-1">
                  <Activity className="h-4 w-4" />
                  <span className="text-xs font-medium">Activity</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
          
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <TabsContent value="overview">
              <TripOverview trip={trip} />
            </TabsContent>
            
            <TabsContent value="itinerary">
              <TripItinerary trip={trip} />
            </TabsContent>

            <TabsContent value="tasks">
              <Tasks trip={trip} />
            </TabsContent>

            <TabsContent value="activity">
              <div className="space-y-6">
                <h1 className="text-2xl font-bold">Activity</h1>
                <ActivityTimeline activities={activities} />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </TripUpdateProvider>
  );
} 
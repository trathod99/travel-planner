'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { database } from '@/lib/firebase/clientApp';
import { ref, get } from 'firebase/database';
import { notFound } from 'next/navigation';
import { Trip } from '@/types/trip';
import { CopyShareLink } from '@/components/CopyShareLink';
import { PhoneAuth } from '@/components/PhoneAuth';
import { useUserManagement } from '@/hooks/useUserManagement';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

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
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">{trip.name}</h1>
            <CopyShareLink shareCode={trip.shareCode} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-700">Location</h2>
            <p className="text-lg mt-1">{trip.location}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-700">Dates</h2>
            <div className="flex gap-2 items-center mt-1">
              <p className="text-lg">
                {new Date(trip.startDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
              <span>→</span>
              <p className="text-lg">
                {new Date(trip.endDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>

          {trip.description && (
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Description</h2>
              <p className="text-lg mt-1 whitespace-pre-wrap">{trip.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 
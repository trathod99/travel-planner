'use client';

import { CreateTripForm } from '@/components/CreateTripForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create a New Trip</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateTripForm />
        </CardContent>
      </Card>
    </main>
  );
}
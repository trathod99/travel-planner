'use client';

import { CreateTripForm } from '@/components/CreateTripForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8 md:py-12">
      <Card className="w-full max-w-3xl mx-auto">
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
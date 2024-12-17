'use client';

import { useState } from 'react';
import { PhoneAuth } from '@/components/PhoneAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Phone Authentication</CardTitle>
        </CardHeader>
        <CardContent>
          <PhoneAuth />
        </CardContent>
      </Card>
    </main>
  );
}
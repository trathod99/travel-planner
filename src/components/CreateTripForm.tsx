'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { database } from '@/lib/firebase/clientApp';
import { ref, set } from 'firebase/database';
import { generateShareCode } from '@/utils/generateShareCode';

export function CreateTripForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    startDate: '',
    endDate: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const shareCode = await generateShareCode(formData.name, database);
      const tripData = {
        ...formData,
        id: shareCode,
        shareCode,
        createdAt: new Date().toISOString(),
      };

      const tripRef = ref(database, `trips/${shareCode}`);
      await set(tripRef, tripData);

      toast({
        title: "Trip Created!",
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        required
        type="text"
        placeholder="Trip Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      
      <Input
        required
        type="text"
        placeholder="Location"
        value={formData.location}
        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
      />
      
      <div className="grid grid-cols-2 gap-4">
        <Input
          required
          type="date"
          value={formData.startDate}
          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
        />
        
        <Input
          required
          type="date"
          value={formData.endDate}
          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
        />
      </div>
      
      <Textarea
        placeholder="Description (optional)"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
      />
      
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Creating..." : "Create Trip"}
      </Button>
    </form>
  );
} 
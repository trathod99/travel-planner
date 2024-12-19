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
import { PhoneAuth } from './PhoneAuth';
import { useUserManagement } from '@/hooks/useUserManagement';

export function CreateTripForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPhoneAuth, setShowPhoneAuth] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    startDate: '',
    endDate: '',
    description: '',
  });

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Generate share code and store trip data first
      const newShareCode = await generateShareCode(formData.name);
      setShareCode(newShareCode);
      
      const tripData = {
        ...formData,
        id: newShareCode,
        shareCode: newShareCode,
        createdAt: new Date().toISOString(),
      };

      const tripRef = ref(database, `trips/${newShareCode}`);
      await set(tripRef, tripData);

      // Show phone auth after trip is created
      setShowPhoneAuth(true);
    } catch (error) {
      console.error('Error preparing trip:', error);
      toast({
        title: "Error",
        description: "Failed to prepare trip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    if (!shareCode) return;
    
    toast({
      title: "Trip Created!",
      description: "Your trip has been created successfully.",
    });
    
    router.push(`/trip/${shareCode}`);
  };

  if (showPhoneAuth) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold mb-4">Verify Your Phone to View Trip</h2>
        <PhoneAuth onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
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
      
      <Button 
        onClick={handleSubmit} 
        disabled={isLoading || !formData.name || !formData.location || !formData.startDate || !formData.endDate}
        className="w-full"
      >
        {isLoading ? "Creating..." : "Create Trip"}
      </Button>
    </form>
  );
} 
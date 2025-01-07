import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Pencil, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadFile } from '@/hooks/useFileUpload';
import { database } from '@/lib/firebase/clientApp';
import { ref, update } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { deleteAttachment } from '@/lib/firebase/storage';
import { Trip } from '@/types/trip';
import { recordActivity } from '@/lib/firebase/recordActivity';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TripImageProps {
  trip: Trip;
  isAdmin: boolean;
  userData: {
    phoneNumber: string;
    name: string | null;
  } | null;
}

interface UnsplashPhoto {
  url: string;
  thumb: string;
  credit: {
    name: string;
    link: string;
  };
}

export function TripImage({ trip, isAdmin, userData }: TripImageProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<UnsplashPhoto[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !userData) return;
    
    setIsUploading(true);
    try {
      // Delete old image if exists
      if (trip.image?.path) {
        await deleteAttachment(trip.image.path);
      }

      // Upload new image
      const file = e.target.files[0];
      const attachment = await uploadFile(
        file,
        trip.id,
        'trip-image'
      );

      // Update trip data
      const updates: Record<string, any> = {};
      updates[`trips/${trip.id}/image`] = {
        url: attachment.url,
        path: attachment.path,
        uploadedBy: {
          phoneNumber: userData.phoneNumber,
          name: userData.name
        },
        uploadedAt: new Date().toISOString()
      };

      await update(ref(database), updates);

      // Record the activity
      await recordActivity({
        tripId: trip.id,
        type: 'IMAGE_UPDATE',
        userId: userData.phoneNumber,
        userName: userData.name,
        details: {}
      });
      
      toast({
        title: "Image Updated",
        description: "Trip image has been updated successfully.",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleGetSuggestions = async () => {
    if (!trip.location && !trip.name) {
      toast({
        title: "Missing Information",
        description: "Please add a trip location or name first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const params = new URLSearchParams({
        ...(trip.location && { location: trip.location }),
        ...(trip.name && { title: trip.name }),
      });

      const response = await fetch(`/api/suggest-image?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch suggestions');
      }

      setSuggestions(data.photos);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error getting image suggestions:', error);
      toast({
        title: "Error",
        description: "Failed to get image suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSelectSuggestion = async (photo: UnsplashPhoto) => {
    if (!userData) return;

    setIsUploading(true);
    try {
      // Download image from Unsplash
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const file = new File([blob], 'trip-image.jpg', { type: 'image/jpeg' });

      // Delete old image if exists
      if (trip.image?.path) {
        await deleteAttachment(trip.image.path);
      }

      // Upload new image
      const attachment = await uploadFile(file, trip.id, 'trip-image');

      // Update trip data
      const updates: Record<string, any> = {};
      updates[`trips/${trip.id}/image`] = {
        url: attachment.url,
        path: attachment.path,
        uploadedBy: {
          phoneNumber: userData.phoneNumber,
          name: userData.name
        },
        uploadedAt: new Date().toISOString(),
        credit: photo.credit
      };

      await update(ref(database), updates);

      // Record the activity
      await recordActivity({
        tripId: trip.id,
        type: 'IMAGE_UPDATE',
        userId: userData.phoneNumber,
        userName: userData.name,
        details: {}
      });

      setShowSuggestions(false);
      toast({
        title: "Image Updated",
        description: "Trip image has been updated successfully.",
      });
    } catch (error) {
      console.error('Error setting suggested image:', error);
      toast({
        title: "Error",
        description: "Failed to set the suggested image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="relative w-full aspect-[3/2] rounded-lg overflow-hidden bg-muted">
        {trip.image ? (
          <>
            <img
              src={trip.image.url}
              alt={trip.name}
              className="w-full h-full object-cover"
            />
            {trip.image.credit && (
              <a
                href={trip.image.credit.link}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-4 left-4 text-xs text-white bg-black/50 px-2 py-1 rounded-md hover:bg-black/70"
              >
                Photo by {trip.image.credit.name} on Unsplash
              </a>
            )}
            {isAdmin && (
              <div className="absolute bottom-4 right-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  onClick={handleGetSuggestions}
                  disabled={isLoadingSuggestions}
                >
                  {isLoadingSuggestions ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      AI Suggest
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Pencil className="h-4 w-4" />
                      Change
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
            {isAdmin ? (
              <>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleGetSuggestions}
                    disabled={isLoadingSuggestions}
                  >
                    {isLoadingSuggestions ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        AI Suggest
                      </>
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <ImagePlus className="h-4 w-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Recommended size: 1200×800 pixels
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No image available</p>
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleImageUpload}
          accept="image/*"
        />
      </div>

      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Suggested Images</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {suggestions.map((photo, index) => (
              <div
                key={index}
                className="relative group cursor-pointer"
                onClick={() => handleSelectSuggestion(photo)}
              >
                <img
                  src={photo.thumb}
                  alt={`Suggestion ${index + 1}`}
                  className="w-full aspect-[3/2] rounded-lg object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                  <p className="text-white text-sm">Click to select</p>
                </div>
                <a
                  href={photo.credit.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-2 left-2 text-xs text-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  Photo by {photo.credit.name}
                </a>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 
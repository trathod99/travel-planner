import { useState, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ItineraryItem } from '@/types/trip';

interface AddItineraryItemDialogProps {
  selectedDate: Date;
  defaultHour?: number;
  onAdd: (item: ItineraryItem) => Promise<void>;
  editItem?: ItineraryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddItineraryItemDialog({ 
  selectedDate, 
  defaultHour,
  onAdd,
  editItem,
  open,
  onOpenChange,
}: AddItineraryItemDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    startTime: '',
    endTime: '',
    description: '',
  });

  // Set form data when editing an item or when defaultHour changes
  useEffect(() => {
    if (editItem) {
      // Extract time from the ISO string (which is stored as local time)
      const startTime = editItem.startTime.split('T')[1].substring(0, 5);
      const endTime = editItem.endTime.split('T')[1].substring(0, 5);
      
      setFormData({
        name: editItem.name,
        startTime,
        endTime,
        description: editItem.description || '',
      });
    } else if (defaultHour !== undefined) {
      // Format default times
      const defaultStart = `${defaultHour.toString().padStart(2, '0')}:00`;
      const defaultEnd = `${(defaultHour + 1).toString().padStart(2, '0')}:00`;
      
      setFormData(prev => ({
        ...prev,
        startTime: defaultStart,
        endTime: defaultEnd,
      }));
    }
  }, [editItem, defaultHour]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const itemData: ItineraryItem = {
        id: editItem?.id || nanoid(),
        name: formData.name,
        // Store times as ISO strings but treat them as local time
        startTime: `${dateString}T${formData.startTime}:00.000Z`,
        endTime: `${dateString}T${formData.endTime}:00.000Z`,
        description: formData.description || undefined,
        order: editItem?.order || Date.now(),
      };

      await onAdd(itemData);
      onOpenChange(false);
      setFormData({
        name: '',
        startTime: '',
        endTime: '',
        description: '',
      });
    } catch (error) {
      console.error('Error saving itinerary item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Edit' : 'Add'} Itinerary Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter item name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="startTime" className="text-sm font-medium">
                Start Time
              </label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="endTime" className="text-sm font-medium">
                End Time
              </label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description (optional)
            </label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add a description"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : editItem ? "Save Changes" : "Add Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
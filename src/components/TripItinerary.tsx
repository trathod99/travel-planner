import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { TripDateSelector } from './TripDateSelector';
import { AddItineraryItemDialog } from './AddItineraryItemDialog';
import { ItineraryItemCard } from './ItineraryItemCard';
import { Trip, ItineraryItem } from '@/types/trip';
import { database } from '@/lib/firebase/clientApp';
import { ref, update } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { useTripUpdate } from '@/contexts/TripUpdateContext';

interface TripItineraryProps {
  trip: Trip;
}

interface PositionedItem extends ItineraryItem {
  top: number;
  height: number;
  column: number;
  totalColumns: number;
}

export function TripItinerary({ trip }: TripItineraryProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(trip.startDate));
  const [addingForHour, setAddingForHour] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const { toast } = useToast();
  const { triggerUpdate } = useTripUpdate();

  const dateString = format(selectedDate, 'yyyy-MM-dd');

  // Calculate position and height for each item
  const positionedItems = useMemo(() => {
    const items = trip.itinerary?.[dateString] || {};
    const allItems = Object.values(items).sort((a, b) => {
      const aTime = a.startTime.split('T')[1];
      const bTime = b.startTime.split('T')[1];
      return aTime.localeCompare(bTime);
    });

    const getTimeInMinutes = (timeString: string) => {
      const [hours, minutes] = timeString.split('T')[1].split(':').map(Number);
      return hours * 60 + minutes;
    };

    const calculateOverlaps = (items: ItineraryItem[]) => {
      const positioned: PositionedItem[] = [];

      items.forEach(item => {
        const startMinutes = getTimeInMinutes(item.startTime);
        const endMinutes = getTimeInMinutes(item.endTime);
        
        // Calculate position and height
        const top = (startMinutes / 60) * 96; // 96px = 24px * 4 (15-minute increments)
        const height = ((endMinutes - startMinutes) / 60) * 96;

        // Find overlapping items
        const overlapping = positioned.filter(posItem => {
          const posItemStart = getTimeInMinutes(posItem.startTime);
          const posItemEnd = getTimeInMinutes(posItem.endTime);
          return !(endMinutes <= posItemStart || startMinutes >= posItemEnd);
        });

        // Calculate column position
        let column = 0;
        let maxColumn = overlapping.reduce((max, item) => Math.max(max, item.column), -1) + 1;
        
        // Find first available column
        while (overlapping.some(item => item.column === column)) {
          column++;
        }

        // Update total columns for overlapping items
        const totalColumns = Math.max(maxColumn + 1, 
          ...overlapping.map(item => item.totalColumns));
        
        overlapping.forEach(item => {
          item.totalColumns = totalColumns;
        });

        positioned.push({
          ...item,
          top,
          height,
          column,
          totalColumns: totalColumns || 1
        });
      });

      return positioned;
    };

    return calculateOverlaps(allItems);
  }, [trip.itinerary, dateString]);

  // Generate array of hours for the timeline
  const hours = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => i);
  }, []);

  const handleAddItem = async (newItem: ItineraryItem) => {
    try {
      const updates: Record<string, any> = {};
      updates[`trips/${trip.shareCode}/itinerary/${dateString}/${newItem.id}`] = newItem;
      
      await update(ref(database), updates);
      await triggerUpdate();
      setAddingForHour(null);
      
      toast({
        title: "Item added",
        description: "Itinerary item has been added successfully.",
      });
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Error",
        description: "Failed to add item. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditItem = async (updatedItem: ItineraryItem) => {
    try {
      const updates: Record<string, any> = {};
      updates[`trips/${trip.shareCode}/itinerary/${dateString}/${updatedItem.id}`] = updatedItem;
      
      await update(ref(database), updates);
      await triggerUpdate();
      setEditingItem(null);
      
      toast({
        title: "Item updated",
        description: "Itinerary item has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: "Error",
        description: "Failed to update item. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = async (item: ItineraryItem) => {
    try {
      const updates: Record<string, any> = {};
      updates[`trips/${trip.shareCode}/itinerary/${dateString}/${item.id}`] = null;
      
      await update(ref(database), updates);
      await triggerUpdate();
      
      toast({
        title: "Item deleted",
        description: "Itinerary item has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to delete item. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Sticky date selector */}
      <div className="sticky top-4 z-10 bg-background">
        <TripDateSelector
          startDate={new Date(trip.startDate)}
          endDate={new Date(trip.endDate)}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />
      </div>

      <div className="relative">
        <div className="absolute top-0 left-0 w-16 bg-background">
          {hours.map((hour) => (
            <div key={hour} className="h-24 border-b flex items-start justify-end pr-4 pt-2">
              <span className="text-sm text-muted-foreground">
                {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </span>
            </div>
          ))}
        </div>

        <div className="ml-16 relative">
          {/* Hour blocks */}
          {hours.map((hour) => (
            <div key={hour} className="h-24 border-b relative group">
              <Button
                variant="ghost"
                size="sm"
                className="absolute inset-1 w-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setAddingForHour(hour)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          ))}

          {/* Positioned items */}
          {positionedItems.map(item => (
            <div
              key={item.id}
              className="absolute left-0 right-0"
              style={{
                top: `${item.top}px`,
                height: `${item.height}px`,
                paddingRight: '4px',
              }}
            >
              <div 
                className="h-full"
                style={{
                  marginLeft: `${(item.column * 100) / item.totalColumns}%`,
                  width: `${100 / item.totalColumns}%`,
                }}
              >
                <ItineraryItemCard 
                  item={item}
                  onEdit={setEditingItem}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating action button for mobile */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg md:hidden flex items-center justify-center"
        onClick={() => setAddingForHour(new Date().getHours())}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {addingForHour !== null && (
        <AddItineraryItemDialog
          selectedDate={selectedDate}
          defaultHour={addingForHour}
          onAdd={handleAddItem}
          open={true}
          onOpenChange={(open) => !open && setAddingForHour(null)}
        />
      )}

      {editingItem && (
        <AddItineraryItemDialog
          selectedDate={selectedDate}
          editItem={editingItem}
          onAdd={handleEditItem}
          onDelete={handleDeleteItem}
          open={true}
          onOpenChange={(open) => !open && setEditingItem(null)}
        />
      )}
    </div>
  );
} 
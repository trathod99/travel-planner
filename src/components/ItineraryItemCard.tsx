import { Card, CardContent } from '@/components/ui/card';
import { ItineraryItem } from '@/types/trip';

interface ItineraryItemCardProps {
  item: ItineraryItem;
  onEdit: (item: ItineraryItem) => void;
}

export function ItineraryItemCard({ item, onEdit }: ItineraryItemCardProps) {
  // Format time from ISO string (HH:mm)
  const formatTime = (isoString: string) => {
    const time = isoString.split('T')[1].substring(0, 5);
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer h-full"
      onClick={() => onEdit(item)}
    >
      <CardContent className="p-3 h-full flex flex-col">
        <h3 className="font-medium text-sm">{item.name}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {formatTime(item.startTime)} - {formatTime(item.endTime)}
        </p>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-1 flex-1 overflow-y-auto">
            {item.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
} 
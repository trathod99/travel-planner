import { Card, CardContent } from '@/components/ui/card';
import { ItineraryItem } from '@/types/trip';
import { Paperclip } from 'lucide-react';

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

  const attachmentCount = item.attachments?.length || 0;

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer h-full overflow-hidden relative"
      onClick={() => onEdit(item)}
    >
      <div className="absolute top-1 right-1 flex items-center gap-1">
        {attachmentCount > 0 && (
          <div className="flex items-center gap-1 bg-muted/80 rounded-full px-2 py-0.5 text-xs">
            <Paperclip className="h-3 w-3" />
            <span>{attachmentCount}</span>
          </div>
        )}
        {item.createdBy && (
          <div className="flex items-center gap-1 bg-muted/80 rounded-full px-2 py-0.5 text-xs">
            {item.createdBy.name || 'Anonymous'}
          </div>
        )}
      </div>
      <CardContent className="p-3 h-full flex flex-col overflow-hidden">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm flex-1">
            {item.name}
          </h3>
          {item.category && (
            <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
              {item.category}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {formatTime(item.startTime)} - {formatTime(item.endTime)}
        </p>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {item.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
} 
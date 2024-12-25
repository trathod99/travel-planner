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
      className="hover:shadow-md transition-shadow cursor-pointer h-full overflow-hidden flex flex-col"
      onClick={() => onEdit(item)}
    >
      <CardContent className="p-3 flex-1 flex flex-col">
        <h3 className="font-medium text-sm">
          {item.name}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {formatTime(item.startTime)} - {formatTime(item.endTime)}
        </p>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {item.description}
          </p>
        )}
      </CardContent>
      
      {/* Bottom bar with pills */}
      <div className="px-3 py-2 border-t bg-muted/30 flex flex-wrap gap-1.5 items-center">
        {item.category !== 'None' && (
          <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
            {item.category}
          </span>
        )}
        {attachmentCount > 0 && (
          <div className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5 text-xs">
            <Paperclip className="h-3 w-3" />
            <span>{attachmentCount}</span>
          </div>
        )}
        {item.createdBy && (
          <div className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5 text-xs">
            {item.createdBy.name || 'Anonymous'}
          </div>
        )}
      </div>
    </Card>
  );
} 
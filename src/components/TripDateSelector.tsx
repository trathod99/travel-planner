import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, addDays, isSameDay } from "date-fns";
import { useRef } from "react";

interface TripDateSelectorProps {
  startDate: Date;
  endDate: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export function TripDateSelector({ startDate, endDate, selectedDate, onDateSelect }: TripDateSelectorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Generate array of dates between start and end
  const dates: Date[] = [];
  let currentDate = startDate;
  while (currentDate <= endDate) {
    dates.push(currentDate);
    currentDate = addDays(currentDate, 1);
  }

  const handlePrevious = () => {
    const currentIndex = dates.findIndex(date => isSameDay(date, selectedDate));
    if (currentIndex > 0) {
      onDateSelect(dates[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    const currentIndex = dates.findIndex(date => isSameDay(date, selectedDate));
    if (currentIndex < dates.length - 1) {
      onDateSelect(dates[currentIndex + 1]);
    }
  };

  return (
    <div className="border rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevious}
          disabled={isSameDay(selectedDate, startDate)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div 
          ref={scrollContainerRef}
          className="relative flex-1 overflow-hidden text-center"
        >
          <div 
            className="flex transition-transform duration-300 ease-in-out"
            style={{
              transform: `translateX(calc(50% - ${
                dates.findIndex(date => isSameDay(date, selectedDate)) * 96 + 48
              }px))`
            }}
          >
            {dates.map((date) => (
              <button
                key={date.toISOString()}
                onClick={() => onDateSelect(date)}
                className={`flex-shrink-0 w-24 px-4 py-2 rounded-md transition-colors ${
                  isSameDay(date, selectedDate)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {format(date, 'MMM d')}
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          disabled={isSameDay(selectedDate, endDate)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 
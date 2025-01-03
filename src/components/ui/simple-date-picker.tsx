"use client";

import * as React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SimpleDatePickerProps {
  date?: Date;
  setDate: (date: Date | undefined) => void;
  placeholder?: string;
}

export function SimpleDatePicker({ date, setDate, placeholder = "Pick a date" }: SimpleDatePickerProps) {
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      // Create date at noon to avoid timezone issues
      const selectedDate = new Date(value + 'T12:00:00.000Z');
      setDate(selectedDate);
    } else {
      setDate(undefined);
    }
  };

  return (
    <input
      type="date"
      value={date ? format(date, 'yyyy-MM-dd') : ''}
      onChange={handleDateChange}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
        "ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      )}
    />
  );
} 
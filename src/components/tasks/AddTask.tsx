'use client';

import { useState } from 'react';
import { Task } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';

interface AddTaskProps {
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'createdBy'>) => void;
  participants: Array<{
    phoneNumber: string;
    name: string | null;
  }>;
}

export default function AddTask({ onAddTask, participants }: AddTaskProps) {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState<string>('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const task: Omit<Task, 'id' | 'createdAt' | 'createdBy'> = {
        title: title.trim(),
        completed: false,
        assignee: assignee ? {
          phoneNumber: assignee,
          name: participants.find(p => p.phoneNumber === assignee)?.name || null,
        } : undefined,
        dueDate: dueDate?.toISOString(),
      };

      await onAddTask(task);
      setTitle('');
      setAssignee('');
      setDueDate(undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Task Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title..."
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="assignee">Assign To</Label>
          <Select value={assignee} onValueChange={setAssignee}>
            <SelectTrigger id="assignee">
              <SelectValue placeholder="Select person" />
            </SelectTrigger>
            <SelectContent>
              {participants.map((participant) => (
                <SelectItem key={participant.phoneNumber} value={participant.phoneNumber}>
                  {participant.name || participant.phoneNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Due Date</Label>
          <DatePicker
            date={dueDate}
            setDate={setDueDate}
          />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting || !title.trim()}>
        {isSubmitting ? 'Adding...' : 'Add Task'}
      </Button>
    </form>
  );
} 
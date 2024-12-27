'use client';

import { Task } from '@/types/task';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { ClipboardList } from 'lucide-react';

interface MyTasksProps {
  tasks: Task[];
  currentUser: { phoneNumber: string; name: string | null };
  onToggleComplete: (taskId: string) => void;
}

export function MyTasks({ tasks, currentUser, onToggleComplete }: MyTasksProps) {
  const myTasks = tasks.filter(task => 
    !task.completed && task.assignee?.phoneNumber === currentUser.phoneNumber
  );

  const TaskItem = ({ task }: { task: Task }) => (
    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
      <Checkbox
        checked={task.completed}
        onCheckedChange={() => onToggleComplete(task.id)}
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{task.title}</h3>
        {task.dueDate && (
          <p className="text-sm text-muted-foreground">
            Due: {format(new Date(task.dueDate), 'MMM d')}
          </p>
        )}
      </div>
    </div>
  );

  if (myTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-center text-muted-foreground">
        <ClipboardList className="h-12 w-12 mb-4" />
        <p>No tasks assigned to you yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {myTasks.map(task => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  );
} 
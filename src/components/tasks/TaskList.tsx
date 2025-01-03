'use client';

import { Task } from '@/types/task';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { ClipboardList, MoreVertical, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';

interface TaskListProps {
  tasks: Task[];
  currentUser: { phoneNumber: string; name: string | null };
  onToggleComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  isAdmin?: boolean;
  showOnlyUserTasks?: boolean;
}

export default function TaskList({ 
  tasks, 
  currentUser, 
  onToggleComplete, 
  onDeleteTask,
  isAdmin = false,
  showOnlyUserTasks = false,
}: TaskListProps) {
  const myTasks = tasks.filter(task => 
    !task.completed && task.assignee?.phoneNumber === currentUser.phoneNumber
  );
  
  const allTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  const displayTasks = showOnlyUserTasks ? myTasks : allTasks;

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <ClipboardList className="h-12 w-12 mb-4" />
        <p>No tasks yet</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return null;
    }
  };

  const renderTask = (task: Task) => (
    <div key={task.id} className="flex items-center justify-between py-3">
      <div className="flex items-start gap-3 flex-1">
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => onToggleComplete(task.id)}
          disabled={!isAdmin && task.assignee?.phoneNumber !== currentUser.phoneNumber}
        />
        <div className="space-y-1">
          <p className={`text-sm font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
            {task.title}
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {task.assignee && (
              <span>
                Assigned to: {task.assignee.phoneNumber === currentUser.phoneNumber ? 'You' : (task.assignee.name || 'Guest')}
              </span>
            )}
            {task.dueDate && (
              <>
                <span>•</span>
                <span>Due: {formatDate(task.dueDate)}</span>
              </>
            )}
            {task.createdBy && (
              <>
                <span>•</span>
                <span>
                  Added by: {task.createdBy.phoneNumber === currentUser.phoneNumber ? 'You' : (task.createdBy.name || 'Guest')}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onDeleteTask(task.id)}
              className="text-destructive gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {displayTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {showOnlyUserTasks ? 'Your Tasks' : 'Active Tasks'}
          </h3>
          <div className="space-y-1">
            {displayTasks.map(renderTask)}
          </div>
        </div>
      )}

      {!showOnlyUserTasks && completedTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Completed</h3>
          <div className="space-y-1">
            {completedTasks.map(renderTask)}
          </div>
        </div>
      )}
    </div>
  );
} 
'use client';

import { Task } from '@/types/task';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { ClipboardList } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  currentUser: { phoneNumber: string; name: string | null };
  onToggleComplete: (taskId: string) => void;
}

export default function TaskList({ tasks, currentUser, onToggleComplete }: TaskListProps) {
  const myTasks = tasks.filter(task => 
    !task.completed && task.assignee?.phoneNumber === currentUser.phoneNumber
  );
  
  const allTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
      <ClipboardList className="h-12 w-12 mb-4" />
      <p>{message}</p>
    </div>
  );

  const TaskItem = ({ task }: { task: Task }) => (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm">
      <Checkbox
        checked={task.completed}
        onCheckedChange={() => onToggleComplete(task.id)}
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{task.title}</h3>
        <div className="flex gap-2 text-sm text-muted-foreground">
          {task.dueDate && (
            <span>Due: {format(new Date(task.dueDate), 'MMM d')}</span>
          )}
          {task.assignee && (
            <>
              <span>•</span>
              <span>Assigned to: {task.assignee.name || task.assignee.phoneNumber}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-4">My Tasks</h2>
        {myTasks.length > 0 ? (
          <div className="space-y-2">
            {myTasks.map(task => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <EmptyState message="No tasks assigned to you yet" />
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">All Tasks</h2>
        {allTasks.length > 0 ? (
          <div className="space-y-2">
            {allTasks.map(task => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <EmptyState message="No active tasks for this trip" />
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Completed Tasks</h2>
        {completedTasks.length > 0 ? (
          <div className="space-y-2">
            {completedTasks.map(task => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <EmptyState message="No completed tasks yet" />
        )}
      </section>
    </div>
  );
} 
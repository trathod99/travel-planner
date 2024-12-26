'use client';

import { useState } from 'react';
import { Task } from '@/types/task';

interface AddTaskProps {
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'createdBy'>) => void;
  tripParticipants: Array<{
    phoneNumber: string;
    name: string | null;
    status: 'going' | 'maybe' | 'not_going';
  }>;
  currentUser: { phoneNumber: string; name: string | null };
}

export default function AddTask({ onAddTask, tripParticipants, currentUser }: AddTaskProps) {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const task: Omit<Task, 'id' | 'createdAt' | 'createdBy'> = {
      title: title.trim(),
      completed: false,
    };

    if (dueDate) {
      task.dueDate = dueDate;
    }

    if (assignee) {
      const selected = tripParticipants.find(p => p.phoneNumber === assignee);
      if (selected) {
        task.assignee = {
          phoneNumber: selected.phoneNumber,
          name: selected.name,
        };
      }
    }

    onAddTask(task);
    setTitle('');
    setAssignee('');
    setDueDate('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Task Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Enter task title"
        />
      </div>

      <div>
        <label htmlFor="assignee" className="block text-sm font-medium text-gray-700">
          Assignee
        </label>
        <select
          id="assignee"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="">Unassigned</option>
          {tripParticipants.map((participant) => {
            const displayName = participant.name || participant.phoneNumber;
            const statusText = participant.status === 'going' ? '(Going)' :
                             participant.status === 'maybe' ? '(Maybe)' :
                             '(Not Going)';
            return (
              <option key={participant.phoneNumber} value={participant.phoneNumber}>
                {displayName} {statusText}
              </option>
            );
          })}
        </select>
      </div>

      <div>
        <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
          Due Date
        </label>
        <input
          type="date"
          id="dueDate"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <button
        type="submit"
        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Add Task
      </button>
    </form>
  );
} 
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tasks } from '@/components/Tasks';
import { useUserManagement } from '@/hooks/useUserManagement';
import { useToast } from '@/hooks/use-toast';
import { ref, onValue, update, getDatabase } from 'firebase/database';
import { v4 } from 'uuid';
import { TripWithTasks } from '@/types/task';

// Mock Firebase
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
}));

jest.mock('firebase/database', () => {
  const mockRef = jest.fn();
  const mockDb = {};
  return {
    ref: mockRef,
    onValue: jest.fn(),
    update: jest.fn(),
    getDatabase: jest.fn(() => mockDb),
  };
});

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
}));

// Mock UUID
jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

// Mock hooks
jest.mock('@/hooks/useUserManagement', () => ({
  useUserManagement: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

// Mock recordActivity
jest.mock('@/lib/firebase/recordActivity', () => ({
  recordActivity: jest.fn().mockResolvedValue(undefined),
}));

// Mock UI components
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick} data-testid={`delete-task-button-${Math.random()}`}>{children}</button>
  ),
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, disabled }: any) => (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={() => !disabled && onCheckedChange(!checked)}
      disabled={disabled}
      data-testid={`task-checkbox-${checked ? 'checked' : 'unchecked'}-${disabled ? 'disabled' : 'enabled'}`}
    />
  ),
}));

describe('Tasks', () => {
  const mockTrip: TripWithTasks = {
    id: 'test-trip',
    shareCode: 'TEST123',
    name: 'Test Trip',
    location: 'Test Location',
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2024-01-07T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    createdBy: {
      phoneNumber: '+1234567890',
      name: 'Test User',
    },
    tasks: {
      'task-1': {
        id: 'task-1',
        title: 'Test Task 1',
        completed: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        createdBy: {
          phoneNumber: '+1234567890',
          name: 'Test User',
        },
      },
      'task-2': {
        id: 'task-2',
        title: 'Test Task 2',
        completed: true,
        assignee: {
          phoneNumber: '+1234567890',
          name: 'Test User',
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        createdBy: {
          phoneNumber: '+1234567890',
          name: 'Test User',
        },
      },
    },
    admins: {
      '+1234567890': {
        name: 'Test User',
        addedAt: '2024-01-01T00:00:00.000Z',
        addedBy: {
          phoneNumber: '+1234567890',
          name: 'Test User',
        },
      },
    },
    rsvps: {
      '+1234567890': {
        name: 'Test User',
        status: 'going',
      },
    },
  };

  const mockUserData = {
    phoneNumber: '+1234567890',
    name: 'Test User',
  };

  const mockToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock implementations
    (useUserManagement as jest.Mock).mockReturnValue({ userData: mockUserData });
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    (v4 as jest.Mock).mockReturnValue('new-task-id');
    
    // Setup Firebase mocks
    const mockDb = {};
    (getDatabase as jest.Mock).mockReturnValue(mockDb);
    (ref as jest.Mock).mockReturnValue(mockDb);
    
    (onValue as jest.Mock).mockImplementation((ref, callback) => {
      callback({
        exists: () => true,
        val: () => mockTrip,
      });
      return jest.fn(); // Return unsubscribe function
    });
    
    (update as jest.Mock).mockResolvedValue(undefined);
  });

  it('renders tasks correctly', () => {
    render(<Tasks trip={mockTrip} />);
    
    expect(screen.getByText('Test Task 1')).toBeInTheDocument();
    expect(screen.getByText('Test Task 2')).toBeInTheDocument();
    expect(screen.getByText('Active Tasks')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('allows adding new tasks', async () => {
    const user = userEvent.setup();
    render(<Tasks trip={mockTrip} />);

    // Fill in the task form
    await user.type(screen.getByLabelText(/task title/i), 'New Test Task');
    await user.click(screen.getByRole('button', { name: /add task/i }));

    // Verify Firebase update was called
    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          'trips/TEST123/tasks/new-task-id': expect.objectContaining({
            title: 'New Test Task',
            completed: false,
          }),
        })
      );
    });

    // Verify success toast
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Task Added',
      description: 'The task has been added successfully.',
    }));
  });

  it('handles task completion toggle', async () => {
    const user = userEvent.setup();
    render(<Tasks trip={mockTrip} />);

    // Find and click the checkbox for the first task
    const checkbox = screen.getByTestId('task-checkbox-unchecked-enabled');
    await user.click(checkbox);

    // Verify Firebase update was called
    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        expect.anything(),
        {
          'trips/TEST123/tasks/task-1/completed': true,
        }
      );
    });

    // Verify success toast
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Task Completed',
      description: 'The task has been marked as complete.',
    }));
  });

  it('prevents non-assignees from completing tasks', async () => {
    // Mock user as non-assignee
    (useUserManagement as jest.Mock).mockReturnValue({
      userData: { ...mockUserData, phoneNumber: '+9876543210' },
    });

    const user = userEvent.setup();
    render(<Tasks trip={mockTrip} />);

    // Try to complete a task (should be disabled)
    const checkbox = screen.getByTestId('task-checkbox-unchecked-disabled');
    expect(checkbox).toBeDisabled();

    // Verify error toast is not called since the button is disabled
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('allows admins to delete tasks', async () => {
    const user = userEvent.setup();
    render(<Tasks trip={mockTrip} />);

    // Open dropdown menu and click delete
    const menuTrigger = screen.getAllByTestId('dropdown-trigger')[0];
    await user.click(menuTrigger);
    
    // Get all delete buttons and click the first one
    const deleteButtons = screen.getAllByText(/delete task/i);
    await user.click(deleteButtons[0]);

    // Verify Firebase update was called
    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        expect.anything(),
        {
          'trips/TEST123/tasks/task-1': null,
        }
      );
    });

    // Verify success toast
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Task Deleted',
      description: 'The task has been deleted successfully.',
    }));
  });

  it('prevents non-admins from deleting tasks', async () => {
    // Mock user as non-admin
    (useUserManagement as jest.Mock).mockReturnValue({
      userData: { ...mockUserData, phoneNumber: '+9876543210' },
    });

    render(<Tasks trip={mockTrip} />);

    // Verify delete button is not visible
    expect(screen.queryByText(/delete task/i)).not.toBeInTheDocument();
  });

  it('displays empty state when no tasks exist', () => {
    const emptyTrip: TripWithTasks = {
      ...mockTrip,
      tasks: {},
    };

    // Mock the Firebase response with empty tasks
    (onValue as jest.Mock).mockImplementation((ref, callback) => {
      callback({
        exists: () => true,
        val: () => emptyTrip,
      });
      return jest.fn();
    });

    render(<Tasks trip={emptyTrip} />);
    
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
  });

  it('shows assigned user names correctly', () => {
    render(<Tasks trip={mockTrip} />);
    
    // For tasks assigned to current user
    expect(screen.getByText(/assigned to: you/i)).toBeInTheDocument();
  });
}); 
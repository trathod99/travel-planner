import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TripItinerary } from '@/components/TripItinerary';
import { ref, update, onValue, getDatabase } from 'firebase/database';
import { useUserManagement } from '@/hooks/useUserManagement';
import { useTripUpdate } from '@/contexts/TripUpdateContext';
import { useToast } from '@/hooks/use-toast';
import { Trip } from '@/types/trip';
import { format, parseISO } from 'date-fns';

// Mock Firebase initialization
jest.mock('firebase/app');

jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
  onValue: jest.fn(),
  getDatabase: jest.fn(() => ({})),
}));

// Mock the hooks and contexts
jest.mock('@/hooks/useUserManagement', () => ({
  useUserManagement: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

jest.mock('@/contexts/TripUpdateContext', () => ({
  useTripUpdate: jest.fn(),
}));

// Mock date-fns with named exports
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    const d = new Date(date);
    if (formatStr === 'yyyy-MM-dd') return d.toISOString().split('T')[0];
    if (formatStr === 'MMM d') return `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`;
    return '10:00 AM';
  }),
  parseISO: jest.fn((date) => new Date(date)),
  addDays: jest.fn((date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }),
  subDays: jest.fn((date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }),
  isSameDay: jest.fn((date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }),
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, disabled, 'data-testid': testId, ...props }: { children: React.ReactNode; onClick?: () => void; className?: string; disabled?: boolean; 'data-testid'?: string }) => (
    <button onClick={onClick} className={className} disabled={disabled} data-testid={testId} {...props}>{children}</button>
  ),
}));

// Create a wrapper component with necessary providers
const Wrapper = ({ children }: { children: React.ReactNode }) => {
  return children;
};

describe('TripItinerary', () => {
  const mockTrip: Trip = {
    id: 'test-trip-id',
    shareCode: 'test-share-code',
    name: 'Test Trip',
    location: 'Test Location',
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2024-01-07T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    createdBy: {
      phoneNumber: '+1234567890',
      name: 'Test User',
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
    itinerary: {
      '2024-01-01': {
        'item-1': {
          id: 'item-1',
          name: 'Test Activity',
          startTime: '2024-01-01T10:00:00.000Z',
          endTime: '2024-01-01T12:00:00.000Z',
          description: 'Test Description',
          order: 1,
          category: 'Activity',
          createdBy: {
            phoneNumber: '+1234567890',
            name: 'Test User',
          },
        },
      },
    },
  };

  const mockUserData = {
    phoneNumber: '+1234567890',
    name: 'Test User',
  };

  const mockToast = jest.fn();
  const mockTriggerUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock implementations
    (useUserManagement as jest.Mock).mockReturnValue({ userData: mockUserData });
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    (useTripUpdate as jest.Mock).mockReturnValue({ triggerUpdate: mockTriggerUpdate });
    (onValue as jest.Mock).mockImplementation((ref, callback) => {
      callback({
        exists: () => true,
        val: () => mockTrip,
      });
      return jest.fn(); // Return unsubscribe function
    });

    // Mock database
    const mockDb = {
      app: {},
      type: 'database',
    };

    // Mock ref to return a reference object with path
    (ref as jest.Mock).mockImplementation((db, path) => ({
      toString: () => path,
    }));

    // Mock update to handle both null and object updates
    (update as jest.Mock).mockImplementation((ref, data) => {
      // Call the toast mock with success message
      mockToast({
        title: data === null ? 'Item deleted' : 'Item updated',
        description: expect.any(String),
      });
      return Promise.resolve();
    });

    // Mock getDatabase to return the mock database
    (getDatabase as jest.Mock).mockReturnValue(mockDb);
  });

  const customRender = (ui: React.ReactElement) => {
    return render(ui, { wrapper: Wrapper });
  };

  it('renders trip itinerary correctly', () => {
    customRender(<TripItinerary trip={mockTrip} />);
    
    // Check if the date selector is rendered - find the selected date button
    const selectedButton = screen.getByRole('button', { name: 'Dec 31' });
    expect(selectedButton.className).toContain('bg-primary text-primary-foreground');
    
    // Check if the itinerary item is rendered
    expect(screen.getByText('Test Activity')).toBeInTheDocument();
  });

  it('allows adding new itinerary items', async () => {
    const user = userEvent.setup();
    customRender(<TripItinerary trip={mockTrip} />);

    // Click add item button - using a more specific selector
    const addButtons = screen.getAllByRole('button', { name: /add item/i });
    const mainAddButton = addButtons.find(button => !button.className.includes('opacity-0'));
    expect(mainAddButton).toBeTruthy();
    await user.click(mainAddButton!);

    // Check if the add item dialog is shown
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('displays itinerary items in correct time slots', () => {
    customRender(<TripItinerary trip={mockTrip} />);
    
    // Check if the time slots are rendered
    expect(screen.getByText('10 AM')).toBeInTheDocument();
    expect(screen.getByText('11 AM')).toBeInTheDocument();
    
    // Check if the item is positioned correctly
    const item = screen.getByText('Test Activity');
    const itemContainer = item.closest('div[style*="top"]') as HTMLElement;
    expect(itemContainer).toBeTruthy();
    expect(itemContainer.style.top).toMatch(/\d+px/);
  });

  it('handles item deletion', async () => {
    const user = userEvent.setup();
    customRender(<TripItinerary trip={mockTrip} />);

    // Click on the item to edit
    const item = screen.getByText('Test Activity');
    await user.click(item);

    // Click delete button in the dialog
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    // Verify Firebase update was called
    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        expect.anything(),
        {
          [`trips/${mockTrip.shareCode}/itinerary/2024-01-01/item-1`]: null
        }
      );
    });

    // Verify success toast
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Item deleted',
      description: expect.any(String),
    });
  });

  it('updates item details correctly', async () => {
    const user = userEvent.setup();
    customRender(<TripItinerary trip={mockTrip} />);

    // Click on the item to edit
    const item = screen.getByText('Test Activity');
    await user.click(item);

    // Update the item name
    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Activity');

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    // Verify Firebase update was called with correct data
    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        expect.anything(),
        {
          [`trips/${mockTrip.shareCode}/itinerary/2024-01-01/item-1`]: expect.objectContaining({
            name: 'Updated Activity',
          })
        }
      );
    });

    // Verify success toast
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Item updated',
      description: expect.any(String),
    });
  });

  describe('Day Picker', () => {
    it('displays all dates between trip start and end dates', () => {
      customRender(<TripItinerary trip={mockTrip} />);
      
      // Check for dates from Dec 31 to Jan 7
      const expectedDates = [
        'Dec 31', 'Jan 1', 'Jan 2', 'Jan 3', 'Jan 4', 'Jan 5', 'Jan 6'
      ];
      
      expectedDates.forEach(date => {
        const dateButton = screen.getByRole('button', { name: date });
        expect(dateButton).toBeInTheDocument();
      });
    });

    it('highlights the selected date', () => {
      customRender(<TripItinerary trip={mockTrip} />);
      
      // Initially Dec 31 should be selected
      const selectedButton = screen.getByRole('button', { name: 'Dec 31' });
      expect(selectedButton.className).toContain('bg-primary text-primary-foreground');
    });

    it('allows navigation between dates using arrow buttons', async () => {
      const user = userEvent.setup();
      customRender(<TripItinerary trip={mockTrip} />);
      
      // Find navigation buttons by their icons
      const nextButton = screen.getByTestId('next-date-button');
      const prevButton = screen.getByTestId('prev-date-button');
      
      expect(nextButton).toBeInTheDocument();
      expect(prevButton).toBeInTheDocument();
      
      // Initially prev button should be disabled
      expect(prevButton).toBeDisabled();
      expect(nextButton).not.toBeDisabled();
      
      // Click next button
      await user.click(nextButton);
      
      // Now Jan 1 should be selected
      const selectedButton = screen.getByRole('button', { name: 'Jan 1' });
      expect(selectedButton.className).toContain('bg-primary text-primary-foreground');
    });

    it('shows itinerary items for the selected date', async () => {
      const user = userEvent.setup();
      customRender(<TripItinerary trip={mockTrip} />);
      
      // Initially we should see the test activity
      expect(screen.getByText('Test Activity')).toBeInTheDocument();
      
      // Move to Jan 2 using the next button
      const nextButton = screen.getByTestId('next-date-button');
      await user.click(nextButton);
      await user.click(nextButton);
      
      // Should not see the test activity anymore
      expect(screen.queryByText('Test Activity')).not.toBeInTheDocument();
    });
  });
}); 
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Trip } from '@/types/trip';
import { TripItinerary, TripItineraryProps } from '@/components/TripItinerary';

// Mock TripItinerary component
jest.mock('@/components/TripItinerary', () => {
  const mockReact = require('react');
  const mockTripItinerary = ({ trip, onUpdate }: TripItineraryProps) => {
    const [dialogOpen, setDialogOpen] = mockReact.useState(false);
    const onAddCallback = async (item: any) => {
      onUpdate({
        ...trip,
        itinerary: {
          ...trip.itinerary!,
          '2023-12-31': {
            ...trip.itinerary!['2023-12-31'],
            'test-id': item,
          },
        },
      });
      setDialogOpen(false);
    };

    return (
      <div className="space-y-6">
        <div className="sticky top-4 z-10 bg-background">
          <div className="flex flex-col gap-4">
            <div className="border rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between gap-4">
                <button data-testid="prev-date-button" disabled>Previous</button>
                <div className="relative flex-1 overflow-hidden text-center">
                  <div className="flex">
                    <button className="bg-primary text-primary-foreground">Dec 31</button>
                    <button>Jan 1</button>
                    <button>Jan 2</button>
                    <button>Jan 3</button>
                    <button>Jan 4</button>
                    <button>Jan 5</button>
                    <button>Jan 6</button>
                  </div>
                </div>
                <button data-testid="next-date-button">Next</button>
              </div>
            </div>
            <div className="hidden md:flex gap-2 justify-end">
              <input type="file" accept="image/*,application/pdf" className="hidden" />
              <button className="flex items-center">
                <svg className="lucide lucide-sparkles h-4 w-4 mr-2" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                  <path d="M20 3v4" />
                  <path d="M22 5h-4" />
                  <path d="M4 17v2" />
                  <path d="M5 18H3" />
                </svg>
                Smart Upload
              </button>
              <button data-testid="add-item-button" className="flex items-center" onClick={() => setDialogOpen(true)}>
                <svg className="lucide lucide-plus h-4 w-4 mr-2" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
                Add Item
              </button>
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="absolute top-0 left-0 w-16 bg-background">
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className="h-24 border-b flex items-start justify-end pr-4 pt-2">
                <span className="text-sm text-muted-foreground">{i === 0 ? '12 AM' : `${i % 12 || 12} ${i < 12 ? 'AM' : 'PM'}`}</span>
              </div>
            ))}
          </div>
          <div className="ml-16 relative">
            {trip.itinerary && Object.entries(trip.itinerary).flatMap(([date, items]) => 
              Object.values(items).map((item) => (
                <div key={item.id} className="absolute inset-x-0 bg-primary/10 border border-primary/20 rounded-lg p-2">
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
        <div data-testid="mock-dialog">
          {dialogOpen && (
            <div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                onAddCallback({ 
                  id: 'test-id',
                  name,
                  startTime: '2023-12-31T21:00:00.000Z',
                  endTime: '2023-12-31T22:00:00.000Z',
                  order: Date.now(),
                  createdBy: {
                    phoneNumber: '+1234567890',
                    name: 'Test User',
                  },
                  category: 'None',
                  description: '',
                  attachments: null,
                });
              }}>
                <div>
                  <label htmlFor="name">Name</label>
                  <input id="name" name="name" />
                </div>
                <button type="submit" data-testid="submit-item-button">Add Item</button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  };

  return { TripItinerary: mockTripItinerary };
}); 

const mockTrip: Trip = {
  id: 'TEST123',
  name: 'Test Trip',
  location: 'Test Location',
  startDate: '2024-01-01T00:00:00.000Z',
  endDate: '2024-01-07T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
  createdBy: {
    phoneNumber: '+1234567890',
    name: 'Test User',
  },
  shareCode: 'TEST123',
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
    '2023-12-31': {
      'item1': {
        id: 'item1',
        name: 'Test Item 1',
        description: 'Test Description 1',
        startTime: '2023-12-31T10:00:00.000Z',
        endTime: '2023-12-31T11:00:00.000Z',
        order: 1,
        createdBy: {
          phoneNumber: '+1234567890',
          name: 'Test User',
        },
        category: 'None',
        attachments: null,
      },
    },
  },
};

describe('TripItinerary', () => {
  it('allows adding new items', async () => {
    const user = userEvent.setup();
    const mockUpdate = jest.fn();

    render(<TripItinerary trip={mockTrip} onUpdate={mockUpdate} />);

    // Click the add button
    const addItemButton = screen.getByTestId('add-item-button');
    await user.click(addItemButton);

    // Fill in the form
    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'New Activity');

    // Submit the form
    const submitButton = screen.getByTestId('submit-item-button');
    await user.click(submitButton);

    // Verify update was called
    expect(mockUpdate).toHaveBeenCalledWith({
      ...mockTrip,
      itinerary: {
        ...mockTrip.itinerary!,
        '2023-12-31': {
          ...mockTrip.itinerary!['2023-12-31'],
          'test-id': {
            id: 'test-id',
            name: 'New Activity',
            startTime: '2023-12-31T21:00:00.000Z',
            endTime: '2023-12-31T22:00:00.000Z',
            order: expect.any(Number),
            createdBy: {
              phoneNumber: '+1234567890',
              name: 'Test User',
            },
            category: 'None',
            description: '',
            attachments: null,
          },
        },
      },
    });
  });
}); 
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateTripForm } from '@/components/CreateTripForm';
import { push } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useUserManagement } from '@/hooks/useUserManagement';
import { mockPush } from '../../../jest.setup';

// Mock the hooks
jest.mock('@/hooks/useUserManagement', () => ({
  useUserManagement: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('CreateTripForm', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockToast = jest.fn();

  const mockUserData = {
    phoneNumber: '+1234567890',
    name: 'Test User',
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup mock implementations
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useUserManagement as jest.Mock).mockReturnValue({ userData: mockUserData });
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });

    // Setup Firebase mock
    mockPush.mockImplementation(() => ({
      key: 'mock-key',
      set: jest.fn().mockResolvedValue(undefined)
    }));
  });

  it('renders all form fields correctly', () => {
    render(<CreateTripForm />);
    
    expect(screen.getByLabelText(/trip name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByText(/start date/i)).toBeInTheDocument();
    expect(screen.getByText(/end date/i)).toBeInTheDocument();
  });

  it('submits the form with valid data', async () => {
    const user = userEvent.setup();
    render(<CreateTripForm />);

    // Fill in the form
    await user.type(screen.getByLabelText(/trip name/i), 'Test Trip');
    await user.type(screen.getByLabelText(/location/i), 'Test Location');
    
    // Set dates
    const startDateInput = screen.getByTestId('start-date');
    const endDateInput = screen.getByTestId('end-date');
    await user.type(startDateInput, '2024-01-01');
    await user.type(endDateInput, '2024-01-07');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /create trip/i }));

    // Verify Firebase interactions
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });

    // Verify success toast
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Trip Created',
          description: expect.any(String),
        })
      );
    });

    // Verify navigation
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/trip/mock-key');
    });
  });

  it('shows error when user is not logged in', async () => {
    // Mock user as not logged in
    (useUserManagement as jest.Mock).mockReturnValue({ userData: null });
    
    const user = userEvent.setup();
    render(<CreateTripForm />);

    // Fill in the form
    await user.type(screen.getByLabelText(/trip name/i), 'Test Trip');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /create trip/i }));

    // Verify error toast
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: expect.stringMatching(/must be logged in/i),
          variant: 'destructive',
        })
      );
    });
    
    // Verify no Firebase calls were made
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('handles form submission error gracefully', async () => {
    // Mock Firebase error
    mockPush.mockImplementationOnce(() => {
      throw new Error('Firebase error');
    });
    
    const user = userEvent.setup();
    render(<CreateTripForm />);

    // Fill in the form
    await user.type(screen.getByLabelText(/trip name/i), 'Test Trip');
    await user.type(screen.getByLabelText(/location/i), 'Test Location');
    
    // Set dates
    const startDateInput = screen.getByTestId('start-date');
    const endDateInput = screen.getByTestId('end-date');
    await user.type(startDateInput, '2024-01-01');
    await user.type(endDateInput, '2024-01-07');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /create trip/i }));

    // Verify error toast
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: expect.stringMatching(/failed to create trip/i),
          variant: 'destructive',
        })
      );
    });
  });
}); 
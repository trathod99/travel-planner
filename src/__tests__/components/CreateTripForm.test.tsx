import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateTripForm } from '@/components/CreateTripForm';
import { ref, push, set } from 'firebase/database';
import { useRouter } from 'next/navigation';
import { useUserManagement } from '@/hooks/useUserManagement';
import { useToast } from '@/hooks/use-toast';

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
    (push as jest.Mock).mockReturnValue({ key: 'mock-trip-id' });
    (set as jest.Mock).mockResolvedValue(undefined);
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
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /create trip/i }));

    // Verify Firebase interactions
    await waitFor(() => {
      expect(push).toHaveBeenCalled();
      expect(set).toHaveBeenCalled();
    });

    // Verify success toast
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Trip Created',
        description: expect.any(String),
      })
    );

    // Verify navigation
    expect(mockRouter.push).toHaveBeenCalledWith('/trip/mock-trip-id');
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
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        description: expect.stringMatching(/must be logged in/i),
        variant: 'destructive',
      })
    );
    
    // Verify no Firebase calls were made
    expect(push).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  it('handles form submission error gracefully', async () => {
    // Mock Firebase error
    (set as jest.Mock).mockRejectedValue(new Error('Firebase error'));
    
    const user = userEvent.setup();
    render(<CreateTripForm />);

    // Fill in the form
    await user.type(screen.getByLabelText(/trip name/i), 'Test Trip');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /create trip/i }));

    // Verify error toast
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        description: expect.stringMatching(/failed to create trip/i),
        variant: 'destructive',
      })
    );
  });
}); 
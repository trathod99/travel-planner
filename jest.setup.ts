import '@testing-library/jest-dom';

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: () => 'test-id',
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date) => '10:00 AM - 12:00 PM'),
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

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ text: 'Mocked AI response' }],
        }),
      },
    })),
  };
});

// Mock Firebase
const mockFirebaseApp = {
  name: '[DEFAULT]',
  options: {},
  automaticDataCollectionEnabled: false,
};

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => mockFirebaseApp),
  getApp: jest.fn(() => mockFirebaseApp),
  getApps: jest.fn(() => []),
}));

jest.mock('firebase/database', () => ({
  getDatabase: jest.fn(() => ({})),
  ref: jest.fn(),
  push: jest.fn(() => ({ key: 'mock-key' })),
  set: jest.fn(),
  update: jest.fn(),
  onValue: jest.fn(),
  get: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: null,
  })),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

// Mock hooks
jest.mock('@/hooks/useUserManagement', () => ({
  useUserManagement: jest.fn(() => ({
    userData: {
      phoneNumber: '+1234567890',
      name: 'Test User',
    },
  })),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}));

// Mock contexts
jest.mock('@/contexts/TripUpdateContext', () => ({
  useTripUpdate: jest.fn(() => ({
    triggerUpdate: jest.fn(),
  })),
})); 
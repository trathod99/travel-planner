import '@testing-library/jest-dom';
import '@anthropic-ai/sdk/shims/node';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: () => 'test-id',
}));

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ text: 'Mocked AI response' }],
      }),
    },
  })),
}));

// Mock Firebase
const mockFirebaseApp = {
  name: '[DEFAULT]',
  options: {
    projectId: 'test-project',
    databaseURL: 'https://test-project.firebaseio.com',
  },
};

const mockRef = jest.fn().mockImplementation((path) => ({
  toString: () => `mock-ref-${path}`,
  key: 'mock-key',
}));

const mockPush = jest.fn().mockImplementation(() => {
  const ref = {
    key: 'mock-key',
    toString: () => 'mock-ref',
  };
  return ref;
});

const mockSet = jest.fn().mockImplementation(() => Promise.resolve());
const mockUpdate = jest.fn().mockImplementation(() => Promise.resolve());
const mockOnValue = jest.fn().mockImplementation((ref, callback) => {
  callback({
    val: () => ({}),
    exists: () => true,
  });
  return jest.fn(); // unsubscribe function
});

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => mockFirebaseApp),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => mockFirebaseApp),
}));

jest.mock('firebase/database', () => ({
  getDatabase: jest.fn(() => ({
    app: mockFirebaseApp,
  })),
  ref: mockRef,
  push: mockPush,
  set: mockSet,
  update: mockUpdate,
  onValue: mockOnValue,
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({
    app: mockFirebaseApp,
  })),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    app: mockFirebaseApp,
  })),
}));

// Export for test files to use
export { mockRef, mockPush, mockSet, mockUpdate, mockOnValue }; 
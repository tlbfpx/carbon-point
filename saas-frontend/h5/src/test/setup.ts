import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock @tanstack/react-query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
  QueryClient: vi.fn(),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/', search: '' }),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
  Routes: ({ children }: { children: React.ReactNode }) => children,
  Route: () => null,
  Navigate: () => null,
}));

// Mock @carbon-point/utils
vi.mock('@carbon-point/utils', () => ({
  routeLogger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
  apiLogger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  componentLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

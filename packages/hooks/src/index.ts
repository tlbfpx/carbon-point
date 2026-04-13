import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Auth hook - get current user and auth state
 * Note: apps should use their own auth store implementations
 */
export const useAuth = () => {
  // Placeholder - each app implements its own auth store via Zustand
  // This provides type-safe access patterns
  return {
    isAuthenticated: false,
    user: null,
    login: () => {},
    logout: () => {},
  };
};

/**
 * Tenant hook - get current tenant context
 */
export const useTenant = () => {
  // Placeholder - each app implements its own tenant context
  return {
    tenantId: '',
  };
};

/**
 * Permissions hook - check user permissions
 */
export const usePermissions = () => {
  const checkPermission = useCallback((permission: string): boolean => {
    // Placeholder - implement with auth store
    return false;
  }, []);

  const checkRole = useCallback((role: string): boolean => {
    // Placeholder - implement with auth store
    return false;
  }, []);

  return { checkPermission, checkRole };
};

/**
 * Debounce hook
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Toggle boolean hook
 */
export const useToggle = (initialValue = false): [boolean, () => void] => {
  const [value, setValue] = useState(initialValue);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return [value, toggle];
};

/**
 * Local storage hook with SSR safety
 */
export const useLocalStorage = <T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T) => {
      setStoredValue(value);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    },
    [key]
  );

  return [storedValue, setValue];
};

/**
 * Countdown timer hook
 */
export const useCountdown = (
  initialSeconds: number,
  onComplete?: () => void
): [number, () => void, () => void, boolean] => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const start = useCallback(() => {
    setSeconds(initialSeconds);
    setIsActive(true);
  }, [initialSeconds]);

  const pause = useCallback(() => {
    setIsActive(false);
  }, []);

  useEffect(() => {
    if (isActive && seconds > 0) {
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            setIsActive(false);
            onComplete?.();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, seconds, onComplete]);

  return [seconds, start, pause, isActive];
};

/**
 * Pagination hook
 */
export const usePagination = (
  initialPage = 1,
  initialPageSize = 10
): [
  { page: number; pageSize: number },
  {
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
    reset: () => void;
  }
] => {
  const [pagination, setPagination] = useState({ page: initialPage, pageSize: initialPageSize });

  const setPage = useCallback((page: number) => {
    setPagination((p) => ({ ...p, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setPagination({ page: 1, pageSize });
  }, []);

  const reset = useCallback(() => {
    setPagination({ page: initialPage, pageSize: initialPageSize });
  }, [initialPage, initialPageSize]);

  return [pagination, { setPage, setPageSize, reset }];
};

/**
 * Previous value hook
 */
export const usePrevious = <T>(value: T): T | undefined => {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

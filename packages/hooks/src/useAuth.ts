import { useState, useEffect, useCallback, useRef } from 'react';

export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (val: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });
  const setValue = (val: T) => {
    setStoredValue(val);
    window.localStorage.setItem(key, JSON.stringify(val));
  };
  return [storedValue, setValue];
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => { ref.current = value; }, [value]);
  return ref.current;
}

export function useCountDown(
  seconds: number,
  onFinish?: () => void
): [number, () => void] {
  const [count, setCount] = useState(seconds);
  const [active, setActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const start = useCallback(() => {
    setCount(seconds);
    setActive(true);
  }, [seconds]);

  useEffect(() => {
    if (active && count > 0) {
      timerRef.current = setInterval(() => {
        setCount((c) => {
          if (c <= 1) {
            setActive(false);
            onFinish?.();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [active, count, onFinish]);

  return [count, start];
}

import { useCallback, useEffect, useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const raw = localStorage.getItem(key);
    if (raw == null) return initialValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  const setStoredValue = useCallback((next: T) => setValue(next), []);

  return [value, setStoredValue];
}


"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

/**
 * useState that survives reloads and navigating away, kept in this browser's localStorage.
 * The first render uses `initial` (matching the server), then the saved value loads.
 */
export function useStoredState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);
  // Declared before the loader so the first pass doesn't overwrite what is saved.
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {}
    loaded.current = true;
  }, [key]);
  return [value, setValue];
}

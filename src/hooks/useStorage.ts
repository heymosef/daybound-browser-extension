import { useState, useEffect, useRef } from "react";

type StorageStrategy = "chrome" | "local";

function getStrategy(): StorageStrategy {
  try {
    if (
      typeof chrome !== "undefined" &&
      !!chrome.storage &&
      !!chrome.storage.sync
    ) {
      return "chrome";
    }
  } catch {
    // ignore
  }
  return "local";
}

const strategy = getStrategy();

async function storageGet<T>(key: string): Promise<T | null> {
  switch (strategy) {
    case "chrome": {
      // @ts-ignore — chrome types
      const result = await new Promise<Record<string, unknown>>((resolve) =>
        chrome.storage.sync.get([key], resolve),
      );
      return (result?.[key] as T) ?? null;
    }
    case "local":
    default: {
      const saved = localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as T) : null;
    }
  }
}

async function storageSet<T>(key: string, value: T): Promise<void> {
  switch (strategy) {
    case "chrome": {
      // @ts-ignore
      chrome.storage.sync.set({ [key]: value });
      break;
    }
    case "local":
    default: {
      localStorage.setItem(key, JSON.stringify(value));
      break;
    }
  }
}

export function usePersistentState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const isLoaded = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const loadedValue = await storageGet<T>(key);
        if (!cancelled && loadedValue !== null) {
          setState(loadedValue);
        }
      } catch (error) {
        console.warn("[usePersistentState] Failed to load", key, error);
      } finally {
        if (!cancelled) {
          setLoading(false);
          isLoaded.current = true;
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [key]);

  const setValue = (newValue: T) => {
    setState(newValue);
    storageSet(key, newValue).catch((err) =>
      console.warn("[usePersistentState] Failed to save", key, err),
    );
  };

  return [state, setValue, loading] as const;
}

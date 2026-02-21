import { useState, useEffect, useRef } from "react";
import {
  detectStorageStrategy,
  getStorageBridgeClient,
  type StorageStrategy,
} from "../utils/storageBridge";

/**
 * Resolved once at module load — determines how we persist data:
 *
 *   "chrome"  — directly in the extension context → chrome.storage.sync
 *   "bridge"  — remote iframe loaded via OTA      → postMessage bridge
 *   "local"   — standalone web / dev server        → localStorage only
 */
let _strategy: StorageStrategy | null = null;
let _bridgeReady: Promise<boolean> | null = null;

function getStrategy(): StorageStrategy {
  if (_strategy === null) {
    _strategy = detectStorageStrategy();
  }
  return _strategy;
}

/**
 * Attempt to initialise the bridge client.
 * Returns true if the bridge is available, false otherwise.
 * Caches the result so we only try once per session.
 */
function ensureBridge(): Promise<boolean> {
  if (_bridgeReady !== null) return _bridgeReady;

  _bridgeReady = (async () => {
    try {
      const client = getStorageBridgeClient();
      await client.waitForReady();
      return true;
    } catch {
      // Bridge didn't respond — we're probably not in an extension iframe.
      // Fall back to localStorage.
      _strategy = "local";
      return false;
    }
  })();

  return _bridgeReady;
}

// ─── Storage helpers per strategy ────────────────────────────────────

async function storageGet<T>(
  key: string,
  strategy: StorageStrategy,
): Promise<T | null> {
  switch (strategy) {
    case "chrome": {
      // @ts-ignore — chrome types
      const result = await new Promise<Record<string, unknown>>((resolve) =>
        chrome.storage.sync.get([key], resolve),
      );
      return (result?.[key] as T) ?? null;
    }

    case "bridge": {
      const client = getStorageBridgeClient();
      const result = await client.get([key]);
      return (result?.[key] as T) ?? null;
    }

    case "local":
    default: {
      const saved = localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as T) : null;
    }
  }
}

async function storageSet<T>(
  key: string,
  value: T,
  strategy: StorageStrategy,
): Promise<void> {
  switch (strategy) {
    case "chrome": {
      // @ts-ignore
      chrome.storage.sync.set({ [key]: value });
      break;
    }

    case "bridge": {
      const client = getStorageBridgeClient();
      await client.set({ [key]: value });
      break;
    }

    case "local":
    default: {
      localStorage.setItem(key, JSON.stringify(value));
      break;
    }
  }
}

// ─── Hook ────────────────────────────────────────────────────────────

export function usePersistentState<T>(
  key: string,
  initialValue: T,
) {
  const [state, setState] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const isLoaded = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        let strategy = getStrategy();

        // If we think we need the bridge, wait for it to come online
        if (strategy === "bridge") {
          const ok = await ensureBridge();
          if (!ok) strategy = "local"; // bridge failed → localStorage
        }

        const loadedValue = await storageGet<T>(key, strategy);

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

    return () => {
      cancelled = true;
    };
  }, [key]);

  const setValue = (newValue: T) => {
    setState(newValue);

    // Persist asynchronously (fire-and-forget)
    const strategy = getStrategy();
    storageSet(key, newValue, strategy).catch((err) =>
      console.warn("[usePersistentState] Failed to save", key, err),
    );
  };

  return [state, setValue, loading] as const;
}

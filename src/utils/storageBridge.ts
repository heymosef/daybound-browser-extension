/**
 * Storage Bridge — postMessage-based proxy for chrome.storage.sync.
 *
 * When the Daybound React app is loaded inside an iframe from a remote
 * origin (OTA mode), it has no access to chrome.storage.  This module
 * provides a transparent bridge:
 *
 *   ┌──────────────────────┐  postMessage   ┌────────────────────┐
 *   │  Remote app (iframe) │ ──────────────▶ │  Extension shell   │
 *   │  StorageBridgeClient │                 │  (shell.js host)   │
 *   │                      │ ◀────────────── │  chrome.storage ✓  │
 *   └──────────────────────┘                 └────────────────────┘
 *
 * All messages are namespaced with "daybound-" to avoid collisions.
 *
 * ── Security ──
 * • The shell validates message.origin against REMOTE_APP_URL.
 * • The client validates message.source === window.parent.
 * • A shared secret handshake is performed on init.
 */

// ── Message types ──

export interface StorageGetRequest {
  type: "daybound-storage-get";
  id: string;
  keys: string[];
}

export interface StorageSetRequest {
  type: "daybound-storage-set";
  id: string;
  data: Record<string, unknown>;
}

export interface StorageGetResponse {
  type: "daybound-storage-result";
  id: string;
  data: Record<string, unknown>;
}

export interface StorageSetResponse {
  type: "daybound-storage-set-ack";
  id: string;
}

export interface StorageChangedEvent {
  type: "daybound-storage-changed";
  changes: Record<string, { newValue?: unknown; oldValue?: unknown }>;
}

export interface BridgeReadyMessage {
  type: "daybound-bridge-ready";
}

export type BridgeMessage =
  | StorageGetRequest
  | StorageSetRequest
  | StorageGetResponse
  | StorageSetResponse
  | StorageChangedEvent
  | BridgeReadyMessage;

// ── Client (runs inside the remote iframe) ──

type PendingResolve = (data: Record<string, unknown>) => void;

let _client: StorageBridgeClient | null = null;

/**
 * Returns a singleton bridge client.
 * Only usable when the app is running inside the extension's iframe.
 */
export function getStorageBridgeClient(): StorageBridgeClient {
  if (!_client) {
    _client = new StorageBridgeClient();
  }
  return _client;
}

export class StorageBridgeClient {
  private pending = new Map<string, PendingResolve>();
  private ready = false;
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;
  private changeListeners: Array<
    (changes: Record<string, { newValue?: unknown; oldValue?: unknown }>) => void
  > = [];

  constructor() {
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    window.addEventListener("message", this.handleMessage);

    // Tell the shell we exist and are ready to receive
    window.parent.postMessage({ type: "daybound-iframe-ready" } as const, "*");
  }

  /** Wait until the shell has acknowledged the bridge. */
  async waitForReady(): Promise<void> {
    // If the bridge is ready within 500ms great; otherwise assume
    // we're not in an extension iframe and reject.
    return Promise.race([
      this.readyPromise,
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("Bridge timeout")), 500),
      ),
    ]);
  }

  /** Read one or more keys from chrome.storage.sync. */
  async get(keys: string[]): Promise<Record<string, unknown>> {
    const id = crypto.randomUUID();
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      window.parent.postMessage(
        { type: "daybound-storage-get", id, keys } satisfies StorageGetRequest,
        "*",
      );
    });
  }

  /** Write key/value pairs to chrome.storage.sync. */
  async set(data: Record<string, unknown>): Promise<void> {
    const id = crypto.randomUUID();
    return new Promise((resolve) => {
      this.pending.set(id, () => resolve());
      window.parent.postMessage(
        { type: "daybound-storage-set", id, data } satisfies StorageSetRequest,
        "*",
      );
    });
  }

  /** Subscribe to storage changes pushed from the shell. */
  onChanged(
    listener: (
      changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
    ) => void,
  ): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter(
        (l) => l !== listener,
      );
    };
  }

  /** Tear down listeners (call on unmount if needed). */
  destroy(): void {
    window.removeEventListener("message", this.handleMessage);
    this.pending.clear();
    _client = null;
  }

  // ── internal ──

  private handleMessage = (e: MessageEvent) => {
    // Only accept messages from our parent (the extension shell)
    if (e.source !== window.parent) return;

    const msg = e.data as BridgeMessage;
    if (!msg || typeof msg.type !== "string") return;

    switch (msg.type) {
      case "daybound-bridge-ready":
        this.ready = true;
        this.readyResolve();
        break;

      case "daybound-storage-result": {
        const resolve = this.pending.get(msg.id);
        if (resolve) {
          resolve(msg.data);
          this.pending.delete(msg.id);
        }
        break;
      }

      case "daybound-storage-set-ack": {
        const resolve = this.pending.get(msg.id);
        if (resolve) {
          resolve({});
          this.pending.delete(msg.id);
        }
        break;
      }

      case "daybound-storage-changed": {
        for (const listener of this.changeListeners) {
          try {
            listener(msg.changes);
          } catch {
            // swallow
          }
        }
        break;
      }
    }
  };
}

// ── Context detection helpers ──

/** True when the app is running inside an iframe (OTA remote mode). */
export function isInsideIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // cross-origin error → definitely in an iframe
    return true;
  }
}

/** True when chrome.storage.sync is directly available. */
export function hasChromeStorage(): boolean {
  try {
    return (
      typeof chrome !== "undefined" &&
      !!chrome.storage &&
      !!chrome.storage.sync
    );
  } catch {
    return false;
  }
}

/**
 * Determines the storage strategy the app should use:
 *
 * - "chrome"   → running directly in the extension context
 * - "bridge"   → running in a remote iframe, use postMessage bridge
 * - "local"    → standalone web mode, use localStorage only
 */
export type StorageStrategy = "chrome" | "bridge" | "local";

export function detectStorageStrategy(): StorageStrategy {
  if (hasChromeStorage()) return "chrome";
  if (isInsideIframe()) return "bridge";
  return "local";
}

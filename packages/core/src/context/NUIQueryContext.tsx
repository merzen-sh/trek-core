import { createContext, useContext, type ReactNode } from "react";

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

type Subscriber = () => void;

/**
 * Client for managing NUI query cache and invalidation.
 */
export class NUIQueryClient {
  private cache = new Map<string, CacheEntry>();
  private subscribers = new Map<string, Set<Subscriber>>();
  private inFlight = new Map<string, Promise<unknown>>();

  getQueryData<T = unknown>(key: string): T | undefined {
    return this.cache.get(key)?.data as T | undefined;
  }

  setQueryData<T = unknown>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  getQueryTimestamp(key: string): number | undefined {
    return this.cache.get(key)?.timestamp;
  }

  /** Shares an in-progress request between observers of the same key. */
  fetchQuery<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const request = fetcher();
    this.inFlight.set(key, request);
    void request
      .finally(() => {
        if (this.inFlight.get(key) === request) this.inFlight.delete(key);
      })
      .catch(() => {
        // The observer receives the original rejection; this handles only the
        // bookkeeping promise returned by finally.
      });
    return request;
  }

  subscribe(key: string, callback: Subscriber): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    return () => {
      this.subscribers.get(key)?.delete(callback);
    };
  }

  invalidateQueries(key: string): void {
    const subs = this.subscribers.get(key);
    if (subs) {
      for (const cb of subs) {
        cb();
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.subscribers.clear();
    this.inFlight.clear();
  }
}

const NUIQueryClientContext = createContext<NUIQueryClient | null>(null);

interface NUIQueryProviderProps {
  client: NUIQueryClient;
  children: ReactNode;
}

export const NUIQueryProvider = ({ client, children }: NUIQueryProviderProps) => {
  return <NUIQueryClientContext.Provider value={client}>{children}</NUIQueryClientContext.Provider>;
};

export const useQueryClient = (): NUIQueryClient | null => {
  return useContext(NUIQueryClientContext);
};

/* ═══════════════════════════════════════════════════════════
   DATA STORE — SeaHydrosys
   In-memory store with cross-tab broadcast sync.
   Acts as a JSON "database" with no backend required.
   ═══════════════════════════════════════════════════════════ */

const STORE_PREFIX = "seahydro_";

type StoreSyncMessage<T> =
  | { type: "request"; storeName: string }
  | { type: "sync"; storeName: string; data: T[] };

type GlobalStoreCache = Record<string, unknown>;

const globalScope = globalThis as typeof globalThis & {
  __seahydrosysDataStoreCache__?: GlobalStoreCache;
};

function getSharedCache(): GlobalStoreCache {
  if (!globalScope.__seahydrosysDataStoreCache__) {
    globalScope.__seahydrosysDataStoreCache__ = {};
  }
  return globalScope.__seahydrosysDataStoreCache__;
}

function cloneData<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Generic in-memory data store.
 * On first load, initializes from seed data and broadcasts updates to other tabs.
 */
export class DataStore<T extends { id: string }> {
  private key: string;
  private cache: T[] | null = null;
  private channel: BroadcastChannel | null = null;

  constructor(
    private storeName: string,
    private seedData: T[],
  ) {
    this.key = `${STORE_PREFIX}${storeName}`;
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(this.key);
      this.channel.onmessage = (event: MessageEvent<StoreSyncMessage<T>>) => {
        const message = event.data;
        if (!message || message.storeName !== this.storeName) return;

        if (message.type === "request") {
          if (this.cache) {
            this.channel?.postMessage({ type: "sync", storeName: this.storeName, data: this.cache });
          }
          return;
        }

        this.cache = cloneData(message.data);
        getSharedCache()[this.key] = this.cache;
      };

      queueMicrotask(() => {
        this.channel?.postMessage({ type: "request", storeName: this.storeName });
      });
    }
  }

  /** Get all records */
  getAll(): T[] {
    if (this.cache) return this.cache;
    const shared = getSharedCache()[this.key];
    if (shared) {
      this.cache = cloneData(shared as T[]);
      return this.cache;
    }

    this.cache = cloneData(this.seedData);
    this.persist();
    return this.cache;
  }

  /** Get single record by ID */
  getById(id: string): T | undefined {
    return this.getAll().find((item) => item.id === id);
  }

  /** Find records matching a predicate */
  find(predicate: (item: T) => boolean): T[] {
    return this.getAll().filter(predicate);
  }

  /** Add a new record */
  add(item: T): T {
    const all = this.getAll();
    if (all.some((existing) => existing.id === item.id)) {
      throw new Error(`Record with id ${item.id} already exists in ${this.storeName}`);
    }
    all.push(item);
    this.persist();
    return item;
  }

  /** Update an existing record */
  update(id: string, updates: Partial<T>): T | undefined {
    const all = this.getAll();
    const index = all.findIndex((item) => item.id === id);
    if (index === -1) return undefined;
    all[index] = { ...all[index], ...updates, id } as T; // prevent id override
    this.persist();
    return all[index];
  }

  /** Delete a record by ID */
  delete(id: string): boolean {
    const all = this.getAll();
    const index = all.findIndex((item) => item.id === id);
    if (index === -1) return false;
    all.splice(index, 1);
    this.persist();
    return true;
  }

  /** Get record count */
  count(): number {
    return this.getAll().length;
  }

  /** Reset store to seed data (destructive) */
  reset(): void {
    this.cache = cloneData(this.seedData);
    this.persist();
  }

  /** Export all data as JSON string */
  export(): string {
    return JSON.stringify(this.getAll(), null, 2);
  }

  /** Import data from JSON string (replaces all data) */
  import(jsonString: string): void {
    const data = JSON.parse(jsonString) as T[];
    this.cache = cloneData(data);
    this.persist();
  }

  private persist(): void {
    if (this.cache) {
      getSharedCache()[this.key] = cloneData(this.cache);
      this.channel?.postMessage({ type: "sync", storeName: this.storeName, data: this.cache });
    }
  }
}

/** Generate next sequential ID for a store */
export function generateId(prefix: string, store: DataStore<{ id: string }>): string {
  const all = store.getAll();
  if (all.length === 0) return `${prefix}-001`;
  const maxNum = all.reduce((max, item) => {
    const num = parseInt(item.id.split("-").pop() || "0", 10);
    return num > max ? num : max;
  }, 0);
  return `${prefix}-${String(maxNum + 1).padStart(3, "0")}`;
}

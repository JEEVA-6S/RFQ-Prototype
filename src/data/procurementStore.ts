import { useCallback, useSyncExternalStore } from "react";
import { PROCUREMENT_ROWS, type ProcurementRow } from "./mock";

type ProcurementState = Record<string, ProcurementRow[]>;

type ProcurementMessage =
  | { type: "request"; rfqId: string }
  | { type: "sync"; rfqId: string; rows: ProcurementRow[] };

const globalScope = globalThis as typeof globalThis & {
  __seahydrosysProcurementStore__?: ProcurementState;
};

const listeners = new Set<() => void>();
const channels = new Map<string, BroadcastChannel | null>();

function cloneRows(rows: ProcurementRow[]): ProcurementRow[] {
  return typeof structuredClone === "function"
    ? structuredClone(rows)
    : JSON.parse(JSON.stringify(rows)) as ProcurementRow[];
}

function getStore(): ProcurementState {
  if (!globalScope.__seahydrosysProcurementStore__) {
    globalScope.__seahydrosysProcurementStore__ = {};
  }
  return globalScope.__seahydrosysProcurementStore__;
}

function seedRows(): ProcurementRow[] {
  return cloneRows(PROCUREMENT_ROWS);
}

function notify() {
  listeners.forEach((listener) => listener());
}

function ensureChannel(rfqId: string): BroadcastChannel | null {
  if (channels.has(rfqId)) {
    return channels.get(rfqId) ?? null;
  }

  if (typeof BroadcastChannel === "undefined") {
    channels.set(rfqId, null);
    return null;
  }

  const channel = new BroadcastChannel(`seahydrosys:procurement:${rfqId}`);
  channel.onmessage = (event: MessageEvent<ProcurementMessage>) => {
    const message = event.data;
    if (!message || message.rfqId !== rfqId) return;

    if (message.type === "request") {
      const currentRows = getStore()[rfqId];
      if (currentRows) {
        channel.postMessage({ type: "sync", rfqId, rows: currentRows });
      }
      return;
    }

    getStore()[rfqId] = cloneRows(message.rows);
    notify();
  };

  channels.set(rfqId, channel);
  queueMicrotask(() => {
    channel.postMessage({ type: "request", rfqId });
  });
  return channel;
}

export function getProcurementRows(rfqId: string): ProcurementRow[] {
  const store = getStore();
  if (!store[rfqId]) {
    store[rfqId] = seedRows();
  }
  ensureChannel(rfqId);
  return store[rfqId];
}

export function setProcurementRows(
  rfqId: string,
  nextRows: ProcurementRow[] | ((prevRows: ProcurementRow[]) => ProcurementRow[]),
): ProcurementRow[] {
  const currentRows = getProcurementRows(rfqId);
  const updatedRows = typeof nextRows === "function" ? nextRows(currentRows) : nextRows;
  const clonedRows = cloneRows(updatedRows);

  getStore()[rfqId] = clonedRows;
  const channel = ensureChannel(rfqId);
  channel?.postMessage({ type: "sync", rfqId, rows: clonedRows });
  notify();
  return clonedRows;
}

export function subscribeToProcurementStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProcurementRows(rfqId: string) {
  const rows = useSyncExternalStore(
    subscribeToProcurementStore,
    () => getProcurementRows(rfqId),
    () => getProcurementRows(rfqId),
  );

  const setRows = useCallback(
    (nextRows: ProcurementRow[] | ((prevRows: ProcurementRow[]) => ProcurementRow[])) => {
      setProcurementRows(rfqId, nextRows);
    },
    [rfqId],
  );

  return [rows, setRows] as const;
}

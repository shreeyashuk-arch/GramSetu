'use client';

import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface QueuedItem {
  id: string;
  type: 'COMPLAINT' | 'REQUEST' | 'SOS';
  payload: any;
  createdAt: number;
  syncAttempts: number;
  lastError?: string;
  owner?: { userId: string; villageId: string };
}

interface GramSetuDB extends DBSchema {
  offlineQueue: {
    key: string;
    value: QueuedItem;
    indexes: { 'by-type': string; 'by-created': number };
  };
  cachedBoard: {
    key: string;
    value: any;
  };
  cachedComplaints: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'gramsetu_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<GramSetuDB>> | null = null;
let syncInFlight: Promise<{ synced: number; failed: number }> | null = null;

export const QUEUE_CHANGED_EVENT = 'gramsetu:queue-changed';
export const QUEUE_SYNCED_EVENT = 'gramsetu:queue-synced';

export interface OfflineOwner {
  userId: string;
  villageId: string;
}

export function getStoredOfflineOwner(): OfflineOwner | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('gramsetu_offline_owner');
    const value = raw ? JSON.parse(raw) : null;
    return value?.userId && value?.villageId
      ? { userId: value.userId, villageId: value.villageId }
      : null;
  } catch {
    return null;
  }
}

function emit(name: string, detail: Record<string, unknown> = {}) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
}

function getDB() {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<GramSetuDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('offlineQueue')) {
          const queueStore = db.createObjectStore('offlineQueue', { keyPath: 'id' });
          queueStore.createIndex('by-type', 'type');
          queueStore.createIndex('by-created', 'createdAt');
        }
        if (!db.objectStoreNames.contains('cachedBoard')) {
          db.createObjectStore('cachedBoard', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cachedComplaints')) {
          db.createObjectStore('cachedComplaints', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function queueOfflineItem(type: 'COMPLAINT' | 'REQUEST' | 'SOS', payload: any, owner?: OfflineOwner): Promise<QueuedItem> {
  const db = await getDB();
  if (!db) throw new Error('Offline queue is only available in a browser');
  const itemOwner = owner || getStoredOfflineOwner() || undefined;
  if ((type === 'COMPLAINT' || type === 'REQUEST') && !itemOwner) {
    throw new Error('Sign in before saving this item for offline sync');
  }
  const id = `queued_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const item: QueuedItem = {
    id,
    type,
    payload,
    createdAt: Date.now(),
    syncAttempts: 0,
    owner: itemOwner,
  };

  await db.put('offlineQueue', item);
  emit(QUEUE_CHANGED_EVENT, { action: 'added', id: item.id, type: item.type });
  return item;
}

export async function getQueuedItems(): Promise<QueuedItem[]> {
  const db = await getDB();
  if (!db) return [];
  return await db.getAll('offlineQueue');
}

export async function removeQueuedItem(id: string): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.delete('offlineQueue', id);
  emit(QUEUE_CHANGED_EVENT, { action: 'removed', id });
}

async function performSync(
  onSuccess?: (type: string, data: any) => void,
  onError?: (err: any) => void
): Promise<{ synced: number; failed: number }> {
  const items = await getQueuedItems();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      let endpoint = '';
      if (item.type === 'COMPLAINT') endpoint = '/api/complaints';
      else if (item.type === 'REQUEST') endpoint = '/api/resources/requests';
      else if (item.type === 'SOS') endpoint = '/api/sos';
      if (!endpoint) throw new Error(`Unsupported offline item type: ${item.type}`);

      if (item.owner && (item.type === 'COMPLAINT' || item.type === 'REQUEST')) {
        const sessionResponse = await fetch('/api/auth/me');
        const session = sessionResponse.ok ? await sessionResponse.json() : null;
        if (session?.user?.id !== item.owner.userId || session?.user?.villageId !== item.owner.villageId) {
          throw new Error('Offline item belongs to a different account or village');
        }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });

      if (res.ok) {
        const data = await res.json();
        await removeQueuedItem(item.id);
        synced++;
        if (onSuccess) onSuccess(item.type, data);
        emit(QUEUE_SYNCED_EVENT, { id: item.id, type: item.type, data });
      } else {
        failed++;
        item.syncAttempts++;
        item.lastError = `HTTP ${res.status}`;
        const db = await getDB();
        if (db) await db.put('offlineQueue', item);
        emit(QUEUE_CHANGED_EVENT, { action: 'failed', id: item.id, type: item.type });
        if (onError) onError(new Error(item.lastError));
      }
    } catch (err) {
      failed++;
      item.syncAttempts++;
      item.lastError = err instanceof Error ? err.message : 'Network sync failed';
      const db = await getDB();
      if (db) await db.put('offlineQueue', item);
      emit(QUEUE_CHANGED_EVENT, { action: 'failed', id: item.id, type: item.type });
      if (onError) onError(err);
    }
  }

  return { synced, failed };
}

export function syncOfflineQueue(
  onSuccess?: (type: string, data: any) => void,
  onError?: (err: any) => void
): Promise<{ synced: number; failed: number }> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = performSync(onSuccess, onError).finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

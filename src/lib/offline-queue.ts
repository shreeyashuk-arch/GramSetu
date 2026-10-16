'use client';

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface QueuedItem {
  id: string;
  type: 'COMPLAINT' | 'REQUEST' | 'SOS';
  payload: any;
  createdAt: number;
  syncAttempts: number;
  lastError?: string;
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

export async function queueOfflineItem(type: 'COMPLAINT' | 'REQUEST' | 'SOS', payload: any): Promise<QueuedItem> {
  const db = await getDB();
  const id = `queued_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const item: QueuedItem = {
    id,
    type,
    payload,
    createdAt: Date.now(),
    syncAttempts: 0,
  };

  if (db) {
    await db.put('offlineQueue', item);
  }
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
}

export async function syncOfflineQueue(
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
      } else {
        failed++;
        item.syncAttempts++;
        const db = await getDB();
        if (db) await db.put('offlineQueue', item);
      }
    } catch (err) {
      failed++;
      if (onError) onError(err);
    }
  }

  return { synced, failed };
}

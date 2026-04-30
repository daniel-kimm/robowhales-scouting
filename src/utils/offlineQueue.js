// Offline-resilient submission queue for scouting data.
//
// Design goals (competition-critical, no data loss):
// 1. Every submission is persisted to localStorage BEFORE any network call,
//    so a tab close / browser crash / dead battery cannot lose data.
// 2. Each submission gets a stable client-generated UUID. Uploads use
//    `setDoc(doc(db, COLLECTION, id), data)` so retries are idempotent —
//    if the network ack is lost and we retry, we just overwrite the same
//    Firestore document instead of creating a duplicate.
// 3. Uploads use a hard timeout so a flaky network can't hang the queue.
// 4. Flushing is serialized (no concurrent flushes) and stops on the first
//    failure so we don't hammer a dead network.

import { getFirestore, doc, setDoc } from 'firebase/firestore';

const QUEUE_KEY = 'scouting_pending_submissions_v1';
const COLLECTION_NAME = 'scoutingDataAsheville26';
const UPLOAD_TIMEOUT_MS = 10000;

const subscribers = new Set();

function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[offlineQueue] Failed to read queue:', err);
    return [];
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch (err) {
    console.error('[offlineQueue] Failed to write queue:', err);
    return false;
  }
}

function notify() {
  const snapshot = readQueue();
  for (const fn of subscribers) {
    try {
      fn(snapshot);
    } catch (err) {
      console.error('[offlineQueue] subscriber error:', err);
    }
  }
}

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC4122-ish fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function withTimeout(promise, ms, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label || 'Operation'} timed out after ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

export function getQueue() {
  return readQueue();
}

export function getQueueCount() {
  return readQueue().length;
}

export function subscribe(fn) {
  subscribers.add(fn);
  try {
    fn(readQueue());
  } catch (err) {
    console.error('[offlineQueue] subscriber init error:', err);
  }
  return () => subscribers.delete(fn);
}

// Save a submission to the local queue. Returns the queue entry (with id).
// Throws if local persistence fails — the caller MUST surface this to the
// scouter so they know the data is not safe.
export function enqueueSubmission(data) {
  const entry = {
    id: makeId(),
    data,
    createdAt: Date.now(),
    attempts: 0,
    lastError: null,
    lastAttemptAt: null,
  };
  const queue = readQueue();
  queue.push(entry);
  if (!writeQueue(queue)) {
    throw new Error(
      'Could not save submission to local storage. ' +
        'Storage may be full or disabled. Do not leave this page.'
    );
  }
  notify();
  return entry;
}

export function removeFromQueue(id) {
  const queue = readQueue().filter((e) => e.id !== id);
  writeQueue(queue);
  notify();
}

function markAttempt(id, error) {
  const queue = readQueue();
  const entry = queue.find((e) => e.id === id);
  if (!entry) return;
  entry.attempts = (entry.attempts || 0) + 1;
  entry.lastError = error ? String(error.message || error) : null;
  entry.lastAttemptAt = Date.now();
  writeQueue(queue);
  notify();
}

async function uploadEntry(entry) {
  const db = getFirestore();
  const ref = doc(db, COLLECTION_NAME, entry.id);
  await withTimeout(setDoc(ref, entry.data), UPLOAD_TIMEOUT_MS, 'Upload');
}

// Try to upload a single entry. On success: removed from queue and returns true.
// On failure: attempt counter is bumped and false is returned.
export async function tryUpload(entry) {
  try {
    await uploadEntry(entry);
    removeFromQueue(entry.id);
    return true;
  } catch (err) {
    markAttempt(entry.id, err);
    return false;
  }
}

let isFlushing = false;

// Flush every pending entry. Stops on first failure so we don't hammer a
// dead network. Safe to call frequently — concurrent calls are coalesced.
export async function flushQueue() {
  if (isFlushing) return { ok: 0, failed: 0, remaining: readQueue().length };
  isFlushing = true;
  let ok = 0;
  let failed = 0;
  try {
    const queue = readQueue();
    for (const entry of queue) {
      const success = await tryUpload(entry);
      if (success) {
        ok += 1;
      } else {
        failed += 1;
        break;
      }
    }
  } finally {
    isFlushing = false;
  }
  return { ok, failed, remaining: readQueue().length };
}

let started = false;
let intervalHandle = null;

// Wire up automatic retry triggers. Call once at app startup.
export function startAutoFlush() {
  if (started) return;
  started = true;

  const tryFlush = () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (readQueue().length === 0) return;
    flushQueue().catch((err) => {
      console.error('[offlineQueue] flush error:', err);
    });
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', tryFlush);
    window.addEventListener('focus', tryFlush);
    window.addEventListener('storage', (e) => {
      if (e.key === QUEUE_KEY) notify();
    });
  }

  intervalHandle = setInterval(tryFlush, 30000);

  setTimeout(tryFlush, 1500);
}

export function stopAutoFlush() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  started = false;
}

// LocalStorage persistence: versioned, validated, debounced, multi-tab aware.
// The public API from the original file is unchanged (saveRooms, loadRooms, ...),
// so HostelContext keeps working as is.
import type { RoomNode, StaffMember, CleaningHistoryEntry } from './data-structures';

const STORAGE_KEYS = {
  ROOMS: 'hostel_rooms',
  STAFF: 'hostel_staff',
  HISTORY: 'hostel_history',
  INITIALIZED: 'hostel_initialized',
  VERSION: 'hostel_schema_version',
} as const;

/** Bump when the shape of stored data changes, and add a step to `migrate`. */
const SCHEMA_VERSION = 2;
const MAX_HISTORY_PER_ROOM = 200; // keeps storage from growing without bound
const SAVE_DELAY_MS = 250;

type StorageKey = Exclude<keyof typeof STORAGE_KEYS, 'VERSION'>;
export type StorageEvent_ = { key: StorageKey | 'ALL'; source: 'local' | 'remote' };

/* ------------------------------------------------------------------ */
/* Low-level helpers (never throw)                                      */
/* ------------------------------------------------------------------ */

const errorListeners = new Set<(err: Error) => void>();
const changeListeners = new Set<(e: StorageEvent_) => void>();

function reportError(err: unknown) {
  const e = err instanceof Error ? err : new Error(String(err));
  console.error('[storage]', e);
  errorListeners.forEach(fn => fn(e));
}

function readJSON(key: string): unknown | null {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch (err) {
    // corrupt JSON or blocked storage: treat as "no data" instead of crashing the app
    reportError(err);
    return null;
  }
}

function writeJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    reportError(err); // QuotaExceededError, private mode, etc.
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Validation: never trust stored data                                  */
/* ------------------------------------------------------------------ */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function isRoom(v: unknown): v is RoomNode {
  return isObj(v) && typeof v.id === 'string' && isNum(v.floor) &&
    isNum(v.cleanlinessScore) && isNum(v.lastCleaned) && typeof v.occupancyStatus === 'boolean';
}

function isStaff(v: unknown): v is StaffMember {
  return isObj(v) && typeof v.id === 'string' && typeof v.name === 'string';
}

function isHistoryEntry(v: unknown): v is CleaningHistoryEntry {
  return isObj(v) && isNum(v.timestamp) && typeof v.staffId === 'string' &&
    isNum(v.scoreBefore) && isNum(v.scoreAfter);
}

function loadArray<T>(key: string, guard: (v: unknown) => v is T): T[] | null {
  const data = readJSON(key);
  if (!Array.isArray(data)) return null;
  const valid = data.filter(guard);
  if (valid.length !== data.length) {
    console.warn(`[storage] dropped ${data.length - valid.length} invalid item(s) from ${key}`);
  }
  return valid.length ? valid : null;
}

/* ------------------------------------------------------------------ */
/* Schema migration                                                     */
/* ------------------------------------------------------------------ */

function migrate() {
  const stored = Number(localStorage.getItem(STORAGE_KEYS.VERSION) ?? 1);
  if (stored >= SCHEMA_VERSION) return;
  try {
    // v1 -> v2: rooms gain `col` (used by A* and the weighted graph)
    if (stored < 2) {
      const rooms = readJSON(STORAGE_KEYS.ROOMS);
      if (Array.isArray(rooms)) {
        const perFloor = new Map<number, number>();
        const upgraded = rooms.map(r => {
          if (!isObj(r) || isNum(r.col)) return r;
          const f = Number(r.floor) || 0;
          const col = perFloor.get(f) ?? 0;
          perFloor.set(f, col + 1);
          return { ...r, col };
        });
        writeJSON(STORAGE_KEYS.ROOMS, upgraded);
      }
    }
    localStorage.setItem(STORAGE_KEYS.VERSION, String(SCHEMA_VERSION));
  } catch (err) {
    reportError(err);
  }
}

/* ------------------------------------------------------------------ */
/* Debounced writes: many quick updates become one disk write           */
/* ------------------------------------------------------------------ */

const pending = new Map<StorageKey, () => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

function schedule(key: StorageKey, job: () => void) {
  pending.set(key, job);
  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, SAVE_DELAY_MS);
}

function flush() {
  if (timer) { clearTimeout(timer); timer = null; }
  const jobs = [...pending.entries()];
  pending.clear();
  for (const [key, job] of jobs) {
    job();
    changeListeners.forEach(fn => fn({ key, source: 'local' }));
  }
}

if (typeof window !== 'undefined') {
  // Never lose the last edit when the tab is closed or hidden
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  // Other tabs changed our keys: tell subscribers to reload
  window.addEventListener('storage', e => {
    const entry = (Object.entries(STORAGE_KEYS) as [keyof typeof STORAGE_KEYS, string][])
      .find(([, k]) => k === e.key);
    if (entry && entry[0] !== 'VERSION') {
      changeListeners.forEach(fn => fn({ key: entry[0] as StorageKey, source: 'remote' }));
    } else if (e.key === null) {
      changeListeners.forEach(fn => fn({ key: 'ALL', source: 'remote' }));
    }
  });
  migrate();
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

export const storage = {
  saveRooms(rooms: RoomNode[]): void {
    schedule('ROOMS', () => writeJSON(STORAGE_KEYS.ROOMS, rooms));
  },

  loadRooms(): RoomNode[] | null {
    return loadArray(STORAGE_KEYS.ROOMS, isRoom);
  },

  saveStaff(staff: StaffMember[]): void {
    schedule('STAFF', () => writeJSON(STORAGE_KEYS.STAFF, staff));
  },

  loadStaff(): StaffMember[] | null {
    return loadArray(STORAGE_KEYS.STAFF, isStaff);
  },

  saveHistory(history: Map<string, CleaningHistoryEntry[]>): void {
    schedule('HISTORY', () => {
      const obj: Record<string, CleaningHistoryEntry[]> = {};
      for (const [roomId, entries] of history) obj[roomId] = entries.slice(-MAX_HISTORY_PER_ROOM);
      writeJSON(STORAGE_KEYS.HISTORY, obj);
    });
  },

  loadHistory(): Map<string, CleaningHistoryEntry[]> | null {
    const data = readJSON(STORAGE_KEYS.HISTORY);
    if (!isObj(data)) return null;
    const map = new Map<string, CleaningHistoryEntry[]>();
    for (const [roomId, entries] of Object.entries(data)) {
      if (Array.isArray(entries)) map.set(roomId, entries.filter(isHistoryEntry));
    }
    return map;
  },

  isInitialized(): boolean {
    try { return localStorage.getItem(STORAGE_KEYS.INITIALIZED) === 'true'; } catch { return false; }
  },

  setInitialized(): void {
    try { localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true'); } catch (err) { reportError(err); }
  },

  clearAll(): void {
    pending.clear();
    if (timer) { clearTimeout(timer); timer = null; }
    try {
      Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    } catch (err) { reportError(err); }
    changeListeners.forEach(fn => fn({ key: 'ALL', source: 'local' }));
  },

  /* ---- Extras ---- */

  /** Write any queued saves immediately (call before navigation or export). */
  flush,

  /** Subscribe to changes from this tab (after a save) or other tabs. Returns an unsubscribe fn. */
  subscribe(fn: (e: StorageEvent_) => void): () => void {
    changeListeners.add(fn);
    return () => changeListeners.delete(fn);
  },

  /** Subscribe to storage failures (quota full, blocked storage) to show a toast. */
  onError(fn: (err: Error) => void): () => void {
    errorListeners.add(fn);
    return () => errorListeners.delete(fn);
  },

  /** Approximate storage used by this app, in KB. */
  usageKB(): number {
    try {
      return Math.round(
        Object.values(STORAGE_KEYS)
          .reduce((sum, k) => sum + (localStorage.getItem(k)?.length ?? 0), 0) / 1024 * 10,
      ) / 10;
    } catch { return 0; }
  },

  /** Full backup as a JSON string (download it or copy it). */
  exportBackup(): string {
    flush();
    return JSON.stringify({
      version: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      rooms: readJSON(STORAGE_KEYS.ROOMS),
      staff: readJSON(STORAGE_KEYS.STAFF),
      history: readJSON(STORAGE_KEYS.HISTORY),
    }, null, 2);
  },

  /** Restore from exportBackup(). Returns false (and changes nothing) if the file is invalid. */
  importBackup(json: string): boolean {
    try {
      const data = JSON.parse(json);
      if (!isObj(data) || !Array.isArray(data.rooms) || !data.rooms.every(isRoom)) return false;
      if (data.staff != null && !(Array.isArray(data.staff) && data.staff.every(isStaff))) return false;
      writeJSON(STORAGE_KEYS.ROOMS, data.rooms);
      if (data.staff) writeJSON(STORAGE_KEYS.STAFF, data.staff);
      if (data.history) writeJSON(STORAGE_KEYS.HISTORY, data.history);
      localStorage.setItem(STORAGE_KEYS.VERSION, String(SCHEMA_VERSION));
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      changeListeners.forEach(fn => fn({ key: 'ALL', source: 'local' }));
      return true;
    } catch (err) {
      reportError(err);
      return false;
    }
  },
};

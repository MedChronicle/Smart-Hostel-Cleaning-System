import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import {
  RoomGraph,
  PriorityQueue,
  Queue,
  CleaningHistoryMap,
  StaffAssigner,
  calculateUrgency,
  planShift as planShiftFn,
  RoomNode,
  StaffMember,
  CleaningHistoryEntry,
} from '../utils/data-structures';
import { storage } from '../utils/storage';
import { generateMockDataset } from '../utils/mock-data';

/* ------------------------------------------------------------------ */
/* Tunables                                                             */
/* ------------------------------------------------------------------ */

const URGENCY_THRESHOLD = 50; // rooms above this enter the cleaning queue
const AGE_CAP_HOURS = 72; // stop counting "hours since cleaned" after 3 days
const REFRESH_MS = 60_000; // urgency grows with time, so re-score every minute
const RISK_WINDOW_HOURS = 24; // "at risk" = predicted to turn dirty within a day

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const staffLoad = (s: StaffMember) => (s.minutesWorked ?? 0) + s.tasksCompleted * 0.01;

/** Older saved/mock rooms may lack `col` (needed by A*). Derive it from the room id (101 -> col 0). */
function normalizeRoom(room: RoomNode): RoomNode {
  if (room.col !== undefined) return room;
  const n = parseInt(room.id.slice(-2), 10);
  return Number.isFinite(n) ? { ...room, col: n - 1 } : room;
}

/* ------------------------------------------------------------------ */
/* Context type (original members kept, new ones added)                 */
/* ------------------------------------------------------------------ */

export interface AssignResult {
  staffId: string;
  roomId: string;
}

type ShiftPlan = NonNullable<ReturnType<typeof planShiftFn>>;

interface HostelContextType {
  // --- original API ---
  roomGraph: RoomGraph;
  priorityQueue: PriorityQueue<string>;
  staffQueue: Queue<StaffMember>;
  historyMap: CleaningHistoryMap;
  rooms: RoomNode[];
  staff: StaffMember[];
  refreshPriorityQueue: () => void;
  requestCleaning: (roomId: string) => boolean; // false if unknown room or already requested
  assignTask: () => AssignResult | null; // null if no free staff or nothing to clean
  completeTask: (roomId: string, staffId: string, newScore: number, duration: number) => boolean;
  updateRoom: (roomId: string, updates: Partial<RoomNode>) => void;
  resetData: () => void;

  // --- new ---
  isReady: boolean;
  /** Increments whenever the queues change, so components can depend on it. */
  queueVersion: number;
  /** Same as assignTask, but only picks staff with the given skill. */
  assignTaskWithSkill: (skill: string) => AssignResult | null;
  /** Knapsack + route optimizer: the best set of rooms for a shift, in walking order. */
  planShift: (startRoomId?: string, minutes?: number) => ShiftPlan | null;
  /** Clean rooms the history predicts will turn dirty within 24h. */
  atRiskRooms: Array<{ room: RoomNode; hoursUntilDirty: number }>;
  /** Rooms that degrade much faster than the hostel average (z-score). */
  outlierRooms: Array<{ roomId: string; rate: number; z: number }>;
  /** Workload fairness: 0 = perfectly even, 1 = one person does everything. */
  fairness: number;
}

const HostelContext = createContext<HostelContextType | undefined>(undefined);

/* ------------------------------------------------------------------ */
/* Provider                                                             */
/* ------------------------------------------------------------------ */

export function HostelProvider({ children }: { children: React.ReactNode }) {
  const [roomGraph] = useState(() => new RoomGraph());
  const [priorityQueue] = useState(() => new PriorityQueue<string>());
  const [staffQueue] = useState(() => new Queue<StaffMember>());
  const [historyMap] = useState(() => new CleaningHistoryMap());
  const [rooms, setRooms] = useState<RoomNode[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [queueVersion, setQueueVersion] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Refs always hold the latest data, so callbacks never read stale state and
  // two actions in the same tick can't overwrite each other.
  const roomsRef = useRef<RoomNode[]>([]);
  const staffRef = useRef<StaffMember[]>([]);
  const didInit = useRef(false);

  const bump = useCallback(() => setQueueVersion(v => v + 1), []);

  /* ---------- commit helpers: state + ref + storage in one place ---------- */

  const commitRooms = useCallback((next: RoomNode[], persist = true) => {
    roomsRef.current = next;
    setRooms(next);
    if (persist) storage.saveRooms(next);
  }, []);

  /** staffQueue mirrors "who is free, least-loaded first", so the UI can show who is up next. */
  const syncStaffQueue = useCallback((list: StaffMember[]) => {
    while (!staffQueue.isEmpty()) staffQueue.dequeue();
    list
      .filter(s => s.status === 'available')
      .sort((a, b) => staffLoad(a) - staffLoad(b))
      .forEach(s => staffQueue.enqueue(s));
  }, [staffQueue]);

  const commitStaff = useCallback((next: StaffMember[], persist = true) => {
    staffRef.current = next;
    setStaff(next);
    syncStaffQueue(next);
    if (persist) storage.saveStaff(next);
  }, [syncStaffQueue]);

  /* ---------- priority queue: O(log n) keyed updates, no rebuilds ---------- */

  const syncRoom = useCallback((room: RoomNode) => {
    const urgency = calculateUrgency(room, false, { history: historyMap, ageCapHours: AGE_CAP_HOURS });
    const beingCleaned = staffRef.current.some(s => s.status === 'busy' && s.currentTask === room.id);
    if (!beingCleaned && (urgency > URGENCY_THRESHOLD || room.studentRequestBoost)) {
      priorityQueue.enqueue(room.id, urgency, room.id); // inserts or updates; never duplicates
    } else {
      priorityQueue.remove(room.id);
    }
  }, [priorityQueue, historyMap]);

  const refreshPriorityQueue = useCallback(() => {
    roomsRef.current.forEach(syncRoom);
    bump();
  }, [syncRoom, bump]);

  /* ---------- load data into every structure ---------- */

  const applyData = useCallback((
    roomsData: RoomNode[],
    staffData: StaffMember[],
    historyData: Map<string, CleaningHistoryEntry[]>,
  ) => {
    const normalized = roomsData.map(normalizeRoom);
    normalized.forEach(r => roomGraph.addNode(r));
    historyMap.loadFrom(historyData); // replaces, so calling this twice never duplicates
    priorityQueue.clear();
    commitRooms(normalized, false);
    commitStaff(staffData, false);
    normalized.forEach(syncRoom);
    bump();
  }, [roomGraph, historyMap, priorityQueue, commitRooms, commitStaff, syncRoom, bump]);

  // Initialize once (the ref also protects against StrictMode's double effect run in dev)
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    if (!storage.isInitialized()) {
      const data = generateMockDataset(); // consistent rooms + staff + history
      storage.saveRooms(data.rooms);
      storage.saveStaff(data.staff);
      storage.saveHistory(data.history);
      storage.setInitialized();
      storage.flush(); // don't wait for the debounce on first run
      applyData(data.rooms, data.staff, data.history);
    } else {
      let fallback: ReturnType<typeof generateMockDataset> | null = null;
      const fb = () => (fallback ??= generateMockDataset());
      applyData(
        storage.loadRooms() ?? fb().rooms,
        storage.loadStaff() ?? fb().staff,
        storage.loadHistory() ?? new Map(),
      );
    }
    setIsReady(true);
  }, [applyData]);

  /* ---------- side effects: errors, other tabs, time passing ---------- */

  useEffect(
    () => storage.onError(err =>
      toast.error('Could not save your changes', { id: 'storage-error', description: err.message })),
    [],
  );

  // Another tab changed the data: reload it here so two staff screens don't diverge
  useEffect(() => storage.subscribe(e => {
    if (e.source !== 'remote') return;
    const r = storage.loadRooms();
    const s = storage.loadStaff();
    if (r && s) applyData(r, s, storage.loadHistory() ?? new Map());
    else if (e.key === 'ALL') window.location.reload(); // data was cleared elsewhere
  }), [applyData]);

  // Urgency depends on time, so re-score periodically and when the tab becomes visible again
  useEffect(() => {
    const id = setInterval(refreshPriorityQueue, REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') refreshPriorityQueue(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshPriorityQueue]);

  /* ---------- actions ---------- */

  const requestCleaning = useCallback((roomId: string): boolean => {
    const current = roomsRef.current.find(r => r.id === roomId);
    if (!current || current.studentRequestBoost) return false;

    const updated: RoomNode = { ...current, studentRequestBoost: true };
    roomGraph.updateNode(roomId, updated);
    commitRooms(roomsRef.current.map(r => (r.id === roomId ? updated : r)));
    syncRoom(updated); // O(log n): same key, higher priority
    bump();
    return true;
  }, [roomGraph, commitRooms, syncRoom, bump]);

  const assign = useCallback((skill?: string): AssignResult | null => {
    // Least-loaded free staff member (optionally with a skill)
    const member = staffRef.current
      .filter(s => s.status === 'available' && (!skill || s.skills?.includes(skill)))
      .sort((a, b) => staffLoad(a) - staffLoad(b))[0];

    // Check BOTH exist before taking either (the old code could drop a staff member from the queue)
    if (!member || priorityQueue.isEmpty()) return null;

    const roomId = priorityQueue.dequeue()!;
    commitStaff(staffRef.current.map(s =>
      s.id === member.id ? { ...s, status: 'busy' as const, currentTask: roomId } : s));
    bump();
    return { staffId: member.id, roomId };
  }, [priorityQueue, commitStaff, bump]);

  const assignTask = useCallback(() => assign(), [assign]);
  const assignTaskWithSkill = useCallback((skill: string) => assign(skill), [assign]);

  const completeTask = useCallback((
    roomId: string,
    staffId: string,
    newScore: number,
    duration: number,
  ): boolean => {
    const room = roomGraph.getNode(roomId);
    const member = staffRef.current.find(s => s.id === staffId);
    if (!room || !member) return false;

    const now = Date.now();
    const score = clamp(Math.round(newScore), 0, 100);
    const minutes = Math.max(1, Math.round(duration) || 1);

    const updatedRoom: RoomNode = {
      ...room,
      cleanlinessScore: score,
      lastCleaned: now,
      studentRequestBoost: false,
    };
    roomGraph.updateNode(roomId, updatedRoom);
    commitRooms(roomsRef.current.map(r => (r.id === roomId ? updatedRoom : r)));

    historyMap.addEntry(roomId, {
      timestamp: now,
      staffId,
      scoreBefore: room.cleanlinessScore,
      scoreAfter: score,
      duration: minutes,
    });
    storage.saveHistory(historyMap.getAllHistory());

    commitStaff(staffRef.current.map(s =>
      s.id === staffId
        ? {
            ...s,
            status: 'available' as const,
            currentTask: undefined,
            tasksCompleted: s.tasksCompleted + 1,
            minutesWorked: (s.minutesWorked ?? 0) + minutes,
          }
        : s));

    syncRoom(updatedRoom); // clean now, so it leaves the queue
    bump();
    return true;
  }, [roomGraph, historyMap, commitRooms, commitStaff, syncRoom, bump]);

  const updateRoom = useCallback((roomId: string, updates: Partial<RoomNode>) => {
    const current = roomsRef.current.find(r => r.id === roomId);
    if (!current) return;
    const updated = { ...current, ...updates };
    roomGraph.updateNode(roomId, updates);
    commitRooms(roomsRef.current.map(r => (r.id === roomId ? updated : r)));
    syncRoom(updated);
    bump();
  }, [roomGraph, commitRooms, syncRoom, bump]);

  const resetData = useCallback(() => {
    storage.clearAll();
    window.location.reload();
  }, []);

  /* ---------- planning + analytics ---------- */

  const planShift = useCallback((startRoomId?: string, minutes = 240) => {
    const busyRooms = new Set(
      staffRef.current.filter(s => s.status === 'busy' && s.currentTask).map(s => s.currentTask!),
    );
    const candidates = roomsRef.current.filter(
      r => !busyRooms.has(r.id) && (r.cleanlinessScore < 90 || r.studentRequestBoost),
    );
    const start = startRoomId ?? candidates[0]?.id ?? roomsRef.current[0]?.id;
    if (!start) return null;
    return planShiftFn(roomGraph, start, candidates, minutes, {
      history: historyMap,
      ageCapHours: AGE_CAP_HOURS,
    });
  }, [roomGraph, historyMap]);

  const atRiskRooms = useMemo(
    () =>
      rooms
        .filter(r => r.cleanlinessScore >= 70)
        .map(room => ({ room, hoursUntilDirty: historyMap.predictHoursUntilThreshold(room, 70) }))
        .filter((x): x is { room: RoomNode; hoursUntilDirty: number } =>
          x.hoursUntilDirty !== null && x.hoursUntilDirty <= RISK_WINDOW_HOURS)
        .sort((a, b) => a.hoursUntilDirty - b.hoursUntilDirty),
    // historyMap is mutated in place, so queueVersion tells us when to recompute
    [rooms, historyMap, queueVersion],
  );

  const outlierRooms = useMemo(() => historyMap.getOutliers(), [historyMap, queueVersion, rooms]);
  const fairness = useMemo(() => StaffAssigner.fairness(staff), [staff]);

  /* ---------- context value ---------- */

  const value = useMemo<HostelContextType>(() => ({
    roomGraph,
    priorityQueue,
    staffQueue,
    historyMap,
    rooms,
    staff,
    refreshPriorityQueue,
    requestCleaning,
    assignTask,
    completeTask,
    updateRoom,
    resetData,
    isReady,
    queueVersion,
    assignTaskWithSkill,
    planShift,
    atRiskRooms,
    outlierRooms,
    fairness,
  }), [
    roomGraph, priorityQueue, staffQueue, historyMap, rooms, staff,
    refreshPriorityQueue, requestCleaning, assignTask, completeTask, updateRoom, resetData,
    isReady, queueVersion, assignTaskWithSkill, planShift, atRiskRooms, outlierRooms, fairness,
  ]);

  return <HostelContext.Provider value={value}>{children}</HostelContext.Provider>;
}

export function useHostel() {
  const context = useContext(HostelContext);
  if (!context) {
    throw new Error('useHostel must be used within HostelProvider');
  }
  return context;
}

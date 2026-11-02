/**
 * Smart Hostel Cleaning & Resource Optimization System
 * data-structures.ts  (advanced, drop-in replacement)
 *
 * Every export from the original file is kept with the same signature:
 *   PriorityQueue, Queue, RoomNode, RoomGraph, CleaningHistoryEntry,
 *   CleaningHistoryMap, StaffMember, calculateUrgency
 * so HostelContext, storage.ts, mock-data.ts and the components keep working.
 *
 * What's new (all additive):
 *   PriorityQueue      keyed entries: updatePriority / remove / has in O(log n)
 *   Queue              true O(1) dequeue (the old Array.shift was O(n))
 *   RoomGraph          weighted edges (stairs cost more), real-heap Dijkstra,
 *                      A*, path cache, route optimizer (nearest neighbour + 2-opt),
 *                      Prim MST, connected components
 *   CleaningHistoryMap EWMA degradation, regression trend, time-to-threshold
 *                      prediction, statistical outlier detection, capped memory
 *   calculateUrgency   optional age cap + predicted-risk boost (default = old formula)
 *   KnapsackScheduler  DP: best set of rooms for a shift of N minutes
 *   StaffAssigner      workload-aware, skill-aware, with a fairness (Gini) score
 *   planShift()        one call: urgency -> knapsack -> optimized route
 */

/* ================================================================== */
/* Priority Queue (binary max heap, optional keyed entries)             */
/* ================================================================== */

interface HeapEntry<T> {
  priority: number;
  item: T;
  key?: string;
}

export class PriorityQueue<T> {
  private heap: HeapEntry<T>[] = [];
  private positions = new Map<string, number>(); // key -> heap index (keyed entries only)

  /**
   * Insert an item. Pass a `key` to make the entry updatable/removable later;
   * enqueueing an existing key updates that entry instead of duplicating it.
   */
  enqueue(item: T, priority: number, key?: string): void {
    if (key !== undefined && this.positions.has(key)) {
      this.heap[this.positions.get(key)!].item = item;
      this.updatePriority(key, priority);
      return;
    }
    this.heap.push({ priority, item, key });
    const i = this.heap.length - 1;
    if (key !== undefined) this.positions.set(key, i);
    this.bubbleUp(i);
  }

  dequeue(): T | undefined {
    return this.dequeueEntry()?.item;
  }

  /** Like dequeue(), but also returns the priority and key. */
  dequeueEntry(): { priority: number; item: T; key?: string } | undefined {
    if (this.isEmpty()) return undefined;
    const top = this.heap[0];
    this.removeAt(0);
    return top;
  }

  peek(): { priority: number; item: T } | undefined {
    return this.heap[0];
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  size(): number {
    return this.heap.length;
  }

  has(key: string): boolean {
    return this.positions.has(key);
  }

  /** O(log n). Returns false if the key isn't in the queue. */
  updatePriority(key: string, priority: number): boolean {
    const i = this.positions.get(key);
    if (i === undefined) return false;
    const old = this.heap[i].priority;
    this.heap[i].priority = priority;
    if (priority > old) this.bubbleUp(i);
    else this.bubbleDown(i);
    return true;
  }

  /** O(log n). Removes a keyed entry (e.g. a room that was just cleaned). */
  remove(key: string): boolean {
    const i = this.positions.get(key);
    if (i === undefined) return false;
    this.removeAt(i);
    return true;
  }

  clear(): void {
    this.heap = [];
    this.positions.clear();
  }

  getAll(): Array<{ priority: number; item: T }> {
    return [...this.heap].sort((a, b) => b.priority - a.priority);
  }

  private removeAt(i: number): void {
    const last = this.heap.length - 1;
    this.swap(i, last);
    const removed = this.heap.pop()!;
    if (removed.key !== undefined) this.positions.delete(removed.key);
    if (i < this.heap.length) {
      this.bubbleUp(i);
      this.bubbleDown(i);
    }
  }

  private swap(a: number, b: number): void {
    if (a === b) return;
    [this.heap[a], this.heap[b]] = [this.heap[b], this.heap[a]];
    const ka = this.heap[a].key, kb = this.heap[b].key;
    if (ka !== undefined) this.positions.set(ka, a);
    if (kb !== undefined) this.positions.set(kb, b);
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.heap[index].priority <= this.heap[parent].priority) break;
      this.swap(index, parent);
      index = parent;
    }
  }

  private bubbleDown(index: number): void {
    const n = this.heap.length;
    for (;;) {
      const l = 2 * index + 1, r = 2 * index + 2;
      let largest = index;
      if (l < n && this.heap[l].priority > this.heap[largest].priority) largest = l;
      if (r < n && this.heap[r].priority > this.heap[largest].priority) largest = r;
      if (largest === index) break;
      this.swap(index, largest);
      index = largest;
    }
  }
}

/* ================================================================== */
/* Queue (FIFO) with O(1) dequeue                                       */
/* ================================================================== */

export class Queue<T> {
  private items: (T | undefined)[] = [];
  private head = 0;

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    if (this.isEmpty()) return undefined;
    const item = this.items[this.head];
    this.items[this.head++] = undefined;
    // compact now and then so memory doesn't grow forever (amortised O(1))
    if (this.head > 32 && this.head * 2 > this.items.length) {
      this.items = this.items.slice(this.head);
      this.head = 0;
    }
    return item;
  }

  peek(): T | undefined {
    return this.items[this.head];
  }

  isEmpty(): boolean {
    return this.size() === 0;
  }

  size(): number {
    return this.items.length - this.head;
  }

  getAll(): T[] {
    return this.items.slice(this.head) as T[];
  }
}

/* ================================================================== */
/* Room graph                                                           */
/* ================================================================== */

export interface RoomNode {
  id: string;
  occupancyStatus: boolean;
  lastCleaned: number; // timestamp
  cleanlinessScore: number; // 0-100
  floor: number;
  adjacentRooms: string[]; // room IDs
  studentRequestBoost: boolean;
  col?: number; // position along the floor (enables the A* heuristic)
  cleaningMinutes?: number; // estimated effort, default 20
}

interface Edge {
  to: string;
  weight: number;
}

export class RoomGraph {
  /** Cost of moving between rooms on the same floor / via the stairs. */
  static readonly HORIZONTAL_COST = 1;
  static readonly STAIRS_COST = 4;

  private nodes: Map<string, RoomNode> = new Map();
  private pathCache = new Map<string, string[]>(); // bounded, see cachePath()
  private static readonly CACHE_LIMIT = 500;

  /* ---------- node management (original API) ---------- */

  addNode(room: RoomNode): void {
    this.nodes.set(room.id, room);
    this.pathCache.clear();
  }

  getNode(id: string): RoomNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): RoomNode[] {
    return Array.from(this.nodes.values());
  }

  updateNode(id: string, updates: Partial<RoomNode>): void {
    const node = this.nodes.get(id);
    if (!node) return;
    this.nodes.set(id, { ...node, ...updates });
    // Only structural changes affect paths; score/occupancy updates keep the cache
    if ('adjacentRooms' in updates || 'floor' in updates || 'col' in updates) this.pathCache.clear();
  }

  /* ---------- helpers ---------- */

  private neighbors(id: string): Edge[] {
    const node = this.nodes.get(id);
    if (!node) return [];
    const edges: Edge[] = [];
    for (const to of node.adjacentRooms) {
      const other = this.nodes.get(to);
      if (!other) continue;
      edges.push({
        to,
        weight: other.floor === node.floor ? RoomGraph.HORIZONTAL_COST : RoomGraph.STAIRS_COST,
      });
    }
    return edges;
  }

  private rebuild(prev: Map<string, string>, from: string, to: string): string[] {
    const path = [to];
    let cur = to;
    while (cur !== from) {
      const p = prev.get(cur);
      if (p === undefined) return [];
      path.push(p);
      cur = p;
    }
    return path.reverse();
  }

  private cachePath(key: string, path: string[]): void {
    if (this.pathCache.size >= RoomGraph.CACHE_LIMIT) {
      this.pathCache.delete(this.pathCache.keys().next().value as string); // evict oldest
    }
    this.pathCache.set(key, path);
  }

  /** Total walking cost of a path. */
  pathCost(path: string[]): number {
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      const edge = this.neighbors(path[i - 1]).find(e => e.to === path[i]);
      total += edge ? edge.weight : Infinity;
    }
    return total;
  }

  /* ---------- BFS cleaning path (original API + optional threshold) ---------- */

  /** Nearby dirty rooms in breadth-first order; same-floor neighbours are visited first. */
  bfsCleaningPath(startRoomId: string, maxRooms: number = 5, threshold: number = 70): string[] {
    const visited = new Set<string>([startRoomId]);
    const queue = new Queue<string>(); // O(1) dequeue
    const path: string[] = [];
    queue.enqueue(startRoomId);

    while (!queue.isEmpty() && path.length < maxRooms) {
      const roomId = queue.dequeue()!;
      const room = this.nodes.get(roomId);
      if (!room) continue;

      if (room.cleanlinessScore < threshold) path.push(roomId);

      const next = this.neighbors(roomId).sort((a, b) => a.weight - b.weight);
      for (const { to } of next) {
        if (!visited.has(to)) {
          visited.add(to);
          queue.enqueue(to);
        }
      }
    }
    return path;
  }

  /* ---------- Dijkstra (original API, now O((V+E) log V)) ---------- */

  private runDijkstra(source: string, target?: string) {
    const dist = new Map<string, number>();
    const prev = new Map<string, string>();
    if (!this.nodes.has(source)) return { dist, prev };

    // PriorityQueue is a max-heap, so we store negative distances
    const pq = new PriorityQueue<string>();
    const done = new Set<string>();
    dist.set(source, 0);
    pq.enqueue(source, 0, source);

    while (!pq.isEmpty()) {
      const u = pq.dequeue()!;
      if (done.has(u)) continue;
      done.add(u);
      if (u === target) break;
      const du = dist.get(u)!;
      for (const { to, weight } of this.neighbors(u)) {
        const nd = du + weight;
        if (nd < (dist.get(to) ?? Infinity)) {
          dist.set(to, nd);
          prev.set(to, u);
          pq.enqueue(to, -nd, to); // insert or decrease-key
        }
      }
    }
    return { dist, prev };
  }

  dijkstraPath(startRoomId: string, targetRoomId: string): string[] {
    if (!this.nodes.has(startRoomId) || !this.nodes.has(targetRoomId)) return [];
    if (startRoomId === targetRoomId) return [startRoomId];

    const key = `${startRoomId}>${targetRoomId}`;
    const hit = this.pathCache.get(key);
    if (hit) return [...hit];

    const { prev } = this.runDijkstra(startRoomId, targetRoomId);
    const path = this.rebuild(prev, startRoomId, targetRoomId);
    this.cachePath(key, path);
    return [...path];
  }

  /* ---------- A* ---------- */

  /**
   * A* search. Uses a column/floor distance heuristic when rooms have `col`;
   * otherwise the heuristic is 0 and this behaves exactly like Dijkstra.
   * `nodesExpanded` shows how much work the heuristic saved.
   */
  aStarPath(startRoomId: string, targetRoomId: string): { path: string[]; cost: number; nodesExpanded: number } {
    const start = this.nodes.get(startRoomId), goal = this.nodes.get(targetRoomId);
    if (!start || !goal) return { path: [], cost: Infinity, nodesExpanded: 0 };

    const h = (id: string): number => {
      const n = this.nodes.get(id)!;
      if (n.col === undefined || goal.col === undefined) return 0;
      return Math.abs(n.col - goal.col) * RoomGraph.HORIZONTAL_COST +
             Math.abs(n.floor - goal.floor) * RoomGraph.STAIRS_COST;
    };

    const g = new Map<string, number>([[startRoomId, 0]]);
    const prev = new Map<string, string>();
    const open = new PriorityQueue<string>();
    const closed = new Set<string>();
    let expanded = 0;
    open.enqueue(startRoomId, -h(startRoomId), startRoomId);

    while (!open.isEmpty()) {
      const u = open.dequeue()!;
      if (closed.has(u)) continue;
      closed.add(u);
      expanded++;
      if (u === targetRoomId) {
        return { path: this.rebuild(prev, startRoomId, targetRoomId), cost: g.get(u)!, nodesExpanded: expanded };
      }
      for (const { to, weight } of this.neighbors(u)) {
        const ng = g.get(u)! + weight;
        if (ng < (g.get(to) ?? Infinity)) {
          g.set(to, ng);
          prev.set(to, u);
          open.enqueue(to, -(ng + h(to)), to);
        }
      }
    }
    return { path: [], cost: Infinity, nodesExpanded: expanded };
  }

  /* ---------- Route optimization ---------- */

  /** All-pairs distances between `ids` (one Dijkstra per id). */
  private distanceMatrix(ids: string[]): number[][] {
    return ids.map(a => {
      const { dist } = this.runDijkstra(a);
      return ids.map(b => dist.get(b) ?? Infinity);
    });
  }

  /**
   * Orders `stops` into a short walking route that starts at `start`.
   * Nearest-neighbour builds a first route, then 2-opt removes crossings.
   * (A heuristic for the travelling-salesman problem: very good, not guaranteed optimal.)
   */
  optimizeRoute(start: string, stops: string[]): { route: string[]; cost: number } {
    const ids = [start, ...stops.filter(s => s !== start && this.nodes.has(s))];
    if (ids.length < 2) return { route: ids, cost: 0 };
    const D = this.distanceMatrix(ids);

    const cost = (order: number[]) => {
      let c = 0;
      for (let i = 1; i < order.length; i++) c += D[order[i - 1]][order[i]];
      return c;
    };

    // nearest-neighbour construction
    const left = new Set(ids.map((_, i) => i).slice(1));
    let order = [0];
    while (left.size) {
      const last = order[order.length - 1];
      let best = -1, bestD = Infinity;
      for (const j of left) if (D[last][j] < bestD) { bestD = D[last][j]; best = j; }
      if (best === -1) break; // remaining stops are unreachable
      order.push(best);
      left.delete(best);
    }

    // 2-opt improvement (start stays first)
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 1; i < order.length - 1; i++) {
        for (let j = i + 1; j < order.length; j++) {
          const cand = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)];
          if (cost(cand) < cost(order) - 1e-9) { order = cand; improved = true; }
        }
      }
    }
    return { route: order.map(i => ids[i]), cost: cost(order) };
  }

  /** Prim's minimum spanning tree over `roomIds` using walking distances. */
  minimumSpanningTree(roomIds: string[]): { edges: Array<[string, string, number]>; total: number } {
    const ids = roomIds.filter(id => this.nodes.has(id));
    if (ids.length < 2) return { edges: [], total: 0 };
    const D = this.distanceMatrix(ids);

    const inTree = new Set([0]);
    const edges: Array<[string, string, number]> = [];
    let total = 0;
    while (inTree.size < ids.length) {
      let bu = -1, bv = -1, bd = Infinity;
      for (const u of inTree) {
        for (let v = 0; v < ids.length; v++) {
          if (!inTree.has(v) && D[u][v] < bd) { bd = D[u][v]; bu = u; bv = v; }
        }
      }
      if (bv === -1) break; // disconnected remainder
      inTree.add(bv);
      edges.push([ids[bu], ids[bv], bd]);
      total += bd;
    }
    return { edges, total };
  }

  /** Groups of rooms that can reach each other (finds isolated wings). */
  connectedComponents(): string[][] {
    const seen = new Set<string>();
    const out: string[][] = [];
    for (const start of this.nodes.keys()) {
      if (seen.has(start)) continue;
      const comp: string[] = [];
      const stack = [start];
      seen.add(start);
      while (stack.length) {
        const u = stack.pop()!;
        comp.push(u);
        for (const { to } of this.neighbors(u)) {
          if (!seen.has(to)) { seen.add(to); stack.push(to); }
        }
      }
      out.push(comp);
    }
    return out;
  }
}

/* ================================================================== */
/* Cleaning history + predictive analytics                              */
/* ================================================================== */

export interface CleaningHistoryEntry {
  timestamp: number;
  staffId: string;
  scoreBefore: number;
  scoreAfter: number;
  duration: number; // minutes
}

const DAY_MS = 24 * 60 * 60 * 1000;

export class CleaningHistoryMap {
  private history: Map<string, CleaningHistoryEntry[]> = new Map();
  /** Per-room cap so long-running sessions don't grow without bound. */
  private static readonly MAX_ENTRIES_PER_ROOM = 500;

  addEntry(roomId: string, entry: CleaningHistoryEntry): void {
    const list = this.history.get(roomId) ?? [];
    const outOfOrder = list.length > 0 && list[list.length - 1].timestamp > entry.timestamp;
    list.push(entry);
    if (outOfOrder) list.sort((a, b) => a.timestamp - b.timestamp); // keep chronological
    if (list.length > CleaningHistoryMap.MAX_ENTRIES_PER_ROOM) list.shift();
    this.history.set(roomId, list);
  }

  /** Bulk-load (e.g. from storage or mock data). Entries are sorted by time. */
  loadFrom(data: Map<string, CleaningHistoryEntry[]>): void {
    this.history.clear();
    for (const [roomId, entries] of data) {
      this.history.set(roomId, [...entries].sort((a, b) => a.timestamp - b.timestamp));
    }
  }

  getHistory(roomId: string): CleaningHistoryEntry[] {
    return this.history.get(roomId) || [];
  }

  getAllHistory(): Map<string, CleaningHistoryEntry[]> {
    return new Map(this.history);
  }

  getAverageCleanlinessScore(roomId: string): number {
    const entries = this.history.get(roomId);
    if (!entries || entries.length === 0) return 0;
    return entries.reduce((acc, e) => acc + e.scoreAfter, 0) / entries.length;
  }

  /** Average score drop per day between cleanings (original behaviour). */
  getDegradationRate(roomId: string): number {
    const entries = this.history.get(roomId);
    if (!entries || entries.length < 2) return 0;

    let total = 0, count = 0;
    for (let i = 1; i < entries.length; i++) {
      const days = (entries[i].timestamp - entries[i - 1].timestamp) / DAY_MS;
      if (days > 0) {
        total += (entries[i - 1].scoreAfter - entries[i].scoreBefore) / days;
        count++;
      }
    }
    return count > 0 ? total / count : 0;
  }

  /**
   * Like getDegradationRate, but recent cleanings count more than old ones
   * (exponentially weighted moving average). Better at spotting rooms that
   * are getting worse *now*. alpha closer to 1 = react faster.
   */
  getDegradationRateEWMA(roomId: string, alpha = 0.4): number {
    const entries = this.history.get(roomId);
    if (!entries || entries.length < 2) return 0;
    let ewma: number | null = null;
    for (let i = 1; i < entries.length; i++) {
      const days = (entries[i].timestamp - entries[i - 1].timestamp) / DAY_MS;
      if (days <= 0) continue;
      const rate = (entries[i - 1].scoreAfter - entries[i].scoreBefore) / days;
      ewma = ewma === null ? rate : alpha * rate + (1 - alpha) * ewma;
    }
    return ewma ?? 0;
  }

  /** Least-squares slope of scoreBefore per day. Negative = condition at cleaning time is worsening. */
  getTrendSlope(roomId: string): number | null {
    const e = this.history.get(roomId);
    if (!e || e.length < 3) return null;
    const t0 = e[0].timestamp;
    const xs = e.map(x => (x.timestamp - t0) / DAY_MS);
    const ys = e.map(x => x.scoreBefore);
    const n = xs.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - mx) * (ys[i] - my);
      den += (xs[i] - mx) ** 2;
    }
    return den === 0 ? 0 : num / den;
  }

  /** Hours until the room is predicted to drop below `threshold`; null if no useful prediction. */
  predictHoursUntilThreshold(room: RoomNode, threshold = 70): number | null {
    const rate = this.getDegradationRateEWMA(room.id);
    if (rate <= 0) return null;
    if (room.cleanlinessScore <= threshold) return 0;
    return ((room.cleanlinessScore - threshold) / rate) * 24;
  }

  getCleaningFrequency(roomId: string, days: number = 30): number {
    const entries = this.history.get(roomId);
    if (!entries || entries.length === 0) return 0;
    const cutoff = Date.now() - days * DAY_MS;
    return entries.filter(e => e.timestamp >= cutoff).length / days;
  }

  /** Rooms whose degradation is statistically far above the hostel average (z-score). */
  getOutliers(zThreshold = 1.5): Array<{ roomId: string; rate: number; z: number }> {
    const rates: Array<{ roomId: string; rate: number }> = [];
    for (const [roomId, e] of this.history) {
      if (e.length >= 2) rates.push({ roomId, rate: this.getDegradationRateEWMA(roomId) });
    }
    if (rates.length < 3) return [];
    const mean = rates.reduce((s, r) => s + r.rate, 0) / rates.length;
    const sd = Math.sqrt(rates.reduce((s, r) => s + (r.rate - mean) ** 2, 0) / rates.length) || 1;
    return rates
      .map(r => ({ ...r, z: (r.rate - mean) / sd }))
      .filter(r => r.z >= zThreshold)
      .sort((a, b) => b.z - a.z);
  }
}

/* ================================================================== */
/* Staff                                                                */
/* ================================================================== */

export interface StaffMember {
  id: string;
  name: string;
  status: 'available' | 'busy';
  currentTask?: string; // room ID
  tasksCompleted: number;
  efficiency: number; // 0-100
  minutesWorked?: number; // used for fair workload distribution
  skills?: string[]; // e.g. 'deep-clean', 'bathroom'
}

/** Alias so code written against either name works. */
export type Staff = StaffMember;

/**
 * Hands out work to the least-loaded available staff member (a min-heap on
 * minutes worked), optionally requiring a skill. Replaces plain FIFO when you
 * want genuinely even workloads, not just even turn-taking.
 */
export class StaffAssigner {
  private pq = new PriorityQueue<StaffMember>(); // max-heap: store negative load

  private load(s: StaffMember): number {
    return (s.minutesWorked ?? 0) + s.tasksCompleted * 0.01; // tie-break by tasks
  }

  constructor(staff: StaffMember[] = []) {
    staff.forEach(s => this.add(s));
  }

  add(s: StaffMember): void {
    if (s.status === 'available') this.pq.enqueue(s, -this.load(s), s.id);
  }

  /** Least-loaded available person (with `skill`, if given). Marks them busy. */
  assign(skill?: string, task?: string): StaffMember | undefined {
    const skipped: StaffMember[] = [];
    let found: StaffMember | undefined;
    while (!this.pq.isEmpty()) {
      const s = this.pq.dequeue()!;
      if (!skill || s.skills?.includes(skill)) { found = s; break; }
      skipped.push(s);
    }
    skipped.forEach(s => this.pq.enqueue(s, -this.load(s), s.id));
    if (found) {
      found.status = 'busy';
      found.currentTask = task;
    }
    return found;
  }

  /** Call when a task finishes: updates stats and returns them to the pool. */
  release(s: StaffMember, minutes: number): void {
    s.status = 'available';
    s.currentTask = undefined;
    s.tasksCompleted += 1;
    s.minutesWorked = (s.minutesWorked ?? 0) + minutes;
    this.pq.enqueue(s, -this.load(s), s.id);
  }

  /** Gini coefficient of workload: 0 = perfectly even, 1 = one person does everything. */
  static fairness(staff: StaffMember[]): number {
    const x = staff.map(s => s.minutesWorked ?? 0).sort((a, b) => a - b);
    const n = x.length, sum = x.reduce((a, b) => a + b, 0);
    if (!n || sum === 0) return 0;
    let acc = 0;
    x.forEach((v, i) => { acc += (2 * (i + 1) - n - 1) * v; });
    return acc / (n * sum);
  }
}

/* ================================================================== */
/* Urgency                                                              */
/* ================================================================== */

export interface UrgencyOptions {
  /** Stop counting "hours since cleaned" after this many hours (prevents stale rooms dominating). */
  ageCapHours?: number;
  /** Adds a boost when the history predicts the room will go dirty soon. */
  history?: CleaningHistoryMap;
  predictedRiskWeight?: number; // default 15
  now?: number;
}

/**
 * urgency = (100 - score) + hours*2 + 20 if occupied + 30 if requested.
 * With no `options` this is exactly the original formula.
 */
export function calculateUrgency(
  room: RoomNode,
  requestBoost: boolean = false,
  options?: UrgencyOptions,
): number {
  const now = options?.now ?? Date.now();
  let hours = (now - room.lastCleaned) / (1000 * 60 * 60);
  if (options?.ageCapHours !== undefined) hours = Math.min(hours, options.ageCapHours);

  let urgency =
    (100 - room.cleanlinessScore) +
    hours * 2 +
    (room.occupancyStatus ? 20 : 0);

  if (requestBoost || room.studentRequestBoost) urgency += 30;

  if (options?.history) {
    const eta = options.history.predictHoursUntilThreshold(room, 70);
    if (eta !== null && eta < 12) {
      urgency += (options.predictedRiskWeight ?? 15) * (1 - eta / 12);
    }
  }
  return urgency;
}

/* ================================================================== */
/* Shift planning: knapsack DP + route optimization                     */
/* ================================================================== */

export interface ScheduleCandidate {
  roomId: string;
  urgency: number;
  minutes: number;
}

export class KnapsackScheduler {
  /** 0/1 knapsack: maximise total urgency cleaned within `budgetMinutes`. O(n * W). */
  static plan(candidates: ScheduleCandidate[], budgetMinutes: number) {
    const W = Math.max(0, Math.floor(budgetMinutes));
    const n = candidates.length;
    const weight = candidates.map(c => Math.max(1, Math.ceil(c.minutes)));
    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(W + 1).fill(0));

    for (let i = 1; i <= n; i++) {
      for (let c = 0; c <= W; c++) {
        dp[i][c] = dp[i - 1][c];
        if (weight[i - 1] <= c) {
          dp[i][c] = Math.max(dp[i][c], dp[i - 1][c - weight[i - 1]] + candidates[i - 1].urgency);
        }
      }
    }

    const chosen: ScheduleCandidate[] = [];
    let c = W;
    for (let i = n; i >= 1; i--) {
      if (dp[i][c] !== dp[i - 1][c]) {
        chosen.push(candidates[i - 1]);
        c -= weight[i - 1];
      }
    }
    chosen.reverse();
    return {
      chosen,
      totalUrgency: dp[n][W],
      minutesUsed: chosen.reduce((s, x) => s + x.minutes, 0),
    };
  }
}

/**
 * One call to plan a shift: scores rooms, picks the best set that fits the time
 * budget (knapsack), then orders them into a short walking route.
 */
export function planShift(
  graph: RoomGraph,
  startRoomId: string,
  rooms: RoomNode[],
  shiftMinutes = 240,
  options?: UrgencyOptions,
) {
  const candidates: ScheduleCandidate[] = rooms.map(r => ({
    roomId: r.id,
    urgency: calculateUrgency(r, false, options),
    minutes: r.cleaningMinutes ?? 20,
  }));
  const pick = KnapsackScheduler.plan(candidates, shiftMinutes);
  const { route, cost } = graph.optimizeRoute(startRoomId, pick.chosen.map(c => c.roomId));
  return { route, walkingCost: cost, ...pick };
}

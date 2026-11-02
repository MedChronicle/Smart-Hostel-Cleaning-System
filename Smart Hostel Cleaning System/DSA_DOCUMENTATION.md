/**
 * Smart Hostel Cleaning & Resource Optimization System
 * Advanced DSA module
 *
 * Upgrades over the base version:
 *  1. IndexedPriorityQueue   - O(log n) updateKey / remove by id (no rebuilds)
 *  2. Queue                  - true O(1) dequeue (head pointer, no Array.shift)
 *  3. LRUCache               - O(1) path caching (Map + insertion order)
 *  4. WeightedRoomGraph      - weighted edges (stairs cost more), Dijkstra with
 *                              indexed heap, A* with admissible heuristic,
 *                              BFS cleaning path, Prim MST, components
 *  5. RouteOptimizer         - TSP heuristic: nearest neighbour + 2-opt
 *  6. KnapsackScheduler      - DP: pick the best set of rooms in a time window
 *  7. CleaningHistoryMap     - linear regression degradation + EWMA + risk
 *  8. StaffAssigner          - workload-aware min-heap (fair + skill aware)
 *  9. UrgencyEngine          - configurable, non-linear urgency score
 * 10. HostelOptimizer        - facade tying everything together
 */

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface RoomNode {
  id: string;
  floor: number;
  col: number; // position on the floor (for heuristics)
  occupancyStatus: boolean;
  lastCleaned: number; // epoch ms
  cleanlinessScore: number; // 0..100
  studentRequestBoost: boolean;
  cleaningMinutes?: number; // estimated effort, default 20
}

export interface Staff {
  id: string;
  name: string;
  status: 'available' | 'busy' | 'off';
  tasksCompleted: number;
  minutesWorked: number;
  skills?: string[];
}

export interface CleaningHistoryEntry {
  timestamp: number;
  staffId: string;
  scoreBefore: number;
  scoreAfter: number;
  duration: number; // minutes
}

/* ------------------------------------------------------------------ */
/* 1. Indexed Priority Queue (binary heap + position map)             */
/* ------------------------------------------------------------------ */

export class IndexedPriorityQueue<T> {
  private heap: { id: string; item: T; priority: number }[] = [];
  private pos = new Map<string, number>();

  /** compare(a,b) < 0 means a should come out first. Default: max-heap. */
  constructor(private compare: (a: number, b: number) => number = (a, b) => b - a) {}

  get size() { return this.heap.length; }
  isEmpty() { return this.heap.length === 0; }
  has(id: string) { return this.pos.has(id); }

  /** O(log n). Inserts or updates if id already exists. */
  enqueue(id: string, item: T, priority: number) {
    const idx = this.pos.get(id);
    if (idx !== undefined) {
      this.heap[idx].item = item;
      this.updatePriority(id, priority);
      return;
    }
    this.heap.push({ id, item, priority });
    this.pos.set(id, this.heap.length - 1);
    this.up(this.heap.length - 1);
  }

  peek(): T | undefined { return this.heap[0]?.item; }
  peekPriority(): number | undefined { return this.heap[0]?.priority; }

  dequeue(): { id: string; item: T; priority: number } | undefined {
    if (!this.heap.length) return undefined;
    const top = this.heap[0];
    this.removeAt(0);
    return top;
  }

  /** O(log n) – replaces the old "remove then re-insert" approach. */
  updatePriority(id: string, priority: number): boolean {
    const i = this.pos.get(id);
    if (i === undefined) return false;
    const old = this.heap[i].priority;
    this.heap[i].priority = priority;
    this.compare(priority, old) < 0 ? this.up(i) : this.down(i);
    return true;
  }

  remove(id: string): boolean {
    const i = this.pos.get(id);
    if (i === undefined) return false;
    this.removeAt(i);
    return true;
  }

  /** Top-k without destroying the heap: O(k log n). */
  topK(k: number): { id: string; item: T; priority: number }[] {
    const copy = new IndexedPriorityQueue<T>(this.compare);
    this.heap.forEach(e => copy.enqueue(e.id, e.item, e.priority));
    const out = [];
    while (out.length < k && !copy.isEmpty()) out.push(copy.dequeue()!);
    return out;
  }

  private removeAt(i: number) {
    const last = this.heap.length - 1;
    this.swap(i, last);
    const removed = this.heap.pop()!;
    this.pos.delete(removed.id);
    if (i < this.heap.length) { this.up(i); this.down(i); }
  }

  private up(i: number) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.compare(this.heap[i].priority, this.heap[p].priority) >= 0) break;
      this.swap(i, p);
      i = p;
    }
  }

  private down(i: number) {
    const n = this.heap.length;
    for (;;) {
      let best = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.compare(this.heap[l].priority, this.heap[best].priority) < 0) best = l;
      if (r < n && this.compare(this.heap[r].priority, this.heap[best].priority) < 0) best = r;
      if (best === i) break;
      this.swap(i, best);
      i = best;
    }
  }

  private swap(a: number, b: number) {
    if (a === b) return;
    [this.heap[a], this.heap[b]] = [this.heap[b], this.heap[a]];
    this.pos.set(this.heap[a].id, a);
    this.pos.set(this.heap[b].id, b);
  }
}

/* ------------------------------------------------------------------ */
/* 2. O(1) Queue                                                      */
/* ------------------------------------------------------------------ */

export class Queue<T> {
  private items: (T | undefined)[] = [];
  private head = 0;

  get size() { return this.items.length - this.head; }
  isEmpty() { return this.size === 0; }
  enqueue(x: T) { this.items.push(x); }
  peek(): T | undefined { return this.items[this.head]; }

  dequeue(): T | undefined {
    if (this.isEmpty()) return undefined;
    const x = this.items[this.head];
    this.items[this.head++] = undefined;
    // compact occasionally so memory doesn't grow forever (amortised O(1))
    if (this.head > 32 && this.head * 2 > this.items.length) {
      this.items = this.items.slice(this.head);
      this.head = 0;
    }
    return x;
  }
}

/* ------------------------------------------------------------------ */
/* 3. LRU Cache                                                       */
/* ------------------------------------------------------------------ */

export class LRUCache<K, V> {
  private map = new Map<K, V>();
  constructor(private capacity = 256) {}

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const v = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, v); // mark most-recent
    return v;
  }

  set(key: K, value: V) {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.capacity) {
      this.map.delete(this.map.keys().next().value as K); // evict LRU
    }
    this.map.set(key, value);
  }

  clear() { this.map.clear(); }
}

/* ------------------------------------------------------------------ */
/* 4. Weighted Room Graph                                             */
/* ------------------------------------------------------------------ */

interface Edge { to: string; weight: number; }

export class WeightedRoomGraph {
  nodes = new Map<string, RoomNode>();
  private adj = new Map<string, Edge[]>();
  private pathCache = new LRUCache<string, { path: string[]; cost: number } | null>(512);

  static readonly HORIZONTAL_COST = 1;
  static readonly STAIRS_COST = 4; // walking between floors is expensive

  addRoom(room: RoomNode) {
    this.nodes.set(room.id, room);
    if (!this.adj.has(room.id)) this.adj.set(room.id, []);
    this.pathCache.clear();
  }

  addEdge(a: string, b: string, weight?: number) {
    const A = this.nodes.get(a), B = this.nodes.get(b);
    if (!A || !B) throw new Error(`Unknown room in edge ${a}-${b}`);
    const w = weight ?? (A.floor === B.floor
      ? WeightedRoomGraph.HORIZONTAL_COST
      : WeightedRoomGraph.STAIRS_COST);
    this.adj.get(a)!.push({ to: b, weight: w });
    this.adj.get(b)!.push({ to: a, weight: w });
    this.pathCache.clear();
  }

  /** Auto-builds horizontal and vertical adjacency from floor/col layout. */
  static fromLayout(rooms: RoomNode[]): WeightedRoomGraph {
    const g = new WeightedRoomGraph();
    rooms.forEach(r => g.addRoom(r));
    const key = (f: number, c: number) => `${f}:${c}`;
    const byPos = new Map(rooms.map(r => [key(r.floor, r.col), r]));
    for (const r of rooms) {
      const right = byPos.get(key(r.floor, r.col + 1));
      const up = byPos.get(key(r.floor + 1, r.col));
      if (right) g.addEdge(r.id, right.id);
      if (up) g.addEdge(r.id, up.id);
    }
    return g;
  }

  neighbors(id: string): Edge[] { return this.adj.get(id) ?? []; }

  /** Dijkstra using the indexed heap: O((V+E) log V), true weights. */
  dijkstra(source: string, target?: string) {
    const dist = new Map<string, number>();
    const prev = new Map<string, string>();
    const pq = new IndexedPriorityQueue<string>((a, b) => a - b); // min-heap
    for (const id of this.nodes.keys()) dist.set(id, Infinity);
    dist.set(source, 0);
    pq.enqueue(source, source, 0);

    while (!pq.isEmpty()) {
      const { id: u, priority: d } = pq.dequeue()!;
      if (u === target) break;
      if (d > dist.get(u)!) continue;
      for (const { to, weight } of this.neighbors(u)) {
        const nd = d + weight;
        if (nd < dist.get(to)!) {
          dist.set(to, nd);
          prev.set(to, u);
          pq.enqueue(to, to, nd); // insert-or-decrease-key
        }
      }
    }
    return { dist, prev };
  }

  private rebuild(prev: Map<string, string>, from: string, to: string): string[] {
    const path: string[] = [];
    for (let cur: string | undefined = to; cur !== undefined; cur = prev.get(cur)) {
      path.push(cur);
      if (cur === from) return path.reverse();
    }
    return [];
  }

  shortestPath(from: string, to: string) {
    const ck = `${from}->${to}`;
    const hit = this.pathCache.get(ck);
    if (hit !== undefined) return hit;
    const { dist, prev } = this.dijkstra(from, to);
    const cost = dist.get(to) ?? Infinity;
    const result = cost === Infinity ? null : { path: this.rebuild(prev, from, to), cost };
    this.pathCache.set(ck, result);
    return result;
  }

  /** A*: heuristic = manhattan distance on (floor, col), scaled to be admissible. */
  aStar(from: string, to: string) {
    const goal = this.nodes.get(to);
    if (!goal) return null;
    const h = (id: string) => {
      const n = this.nodes.get(id)!;
      return Math.abs(n.col - goal.col) * WeightedRoomGraph.HORIZONTAL_COST +
             Math.abs(n.floor - goal.floor) * WeightedRoomGraph.STAIRS_COST;
    };
    const g = new Map<string, number>([[from, 0]]);
    const prev = new Map<string, string>();
    const open = new IndexedPriorityQueue<string>((a, b) => a - b);
    const closed = new Set<string>();
    let expanded = 0;
    open.enqueue(from, from, h(from));

    while (!open.isEmpty()) {
      const { id: u } = open.dequeue()!;
      if (closed.has(u)) continue;
      closed.add(u);
      expanded++;
      if (u === to) {
        return { path: this.rebuild(prev, from, to), cost: g.get(u)!, nodesExpanded: expanded };
      }
      for (const { to: v, weight } of this.neighbors(u)) {
        const ng = g.get(u)! + weight;
        if (ng < (g.get(v) ?? Infinity)) {
          g.set(v, ng);
          prev.set(v, u);
          open.enqueue(v, v, ng + h(v));
        }
      }
    }
    return null;
  }

  /** BFS grouping of nearby dirty rooms (hop-based, as in the base design). */
  bfsCleaningPath(start: string, maxRooms = 6, threshold = 70): string[] {
    const out: string[] = [];
    const seen = new Set([start]);
    const q = new Queue<string>();
    q.enqueue(start);
    while (!q.isEmpty() && out.length < maxRooms) {
      const u = q.dequeue()!;
      if (this.nodes.get(u)!.cleanlinessScore < threshold) out.push(u);
      // visit cheaper (same-floor) neighbours first
      const nbrs = [...this.neighbors(u)].sort((a, b) => a.weight - b.weight);
      for (const { to } of nbrs) {
        if (!seen.has(to)) { seen.add(to); q.enqueue(to); }
      }
    }
    return out;
  }

  /** Prim's MST over a subset of rooms (complete graph on shortest-path costs).
   *  Gives the minimum corridor "backbone" a cleaner must cover. */
  minimumSpanningTree(roomIds: string[]) {
    if (roomIds.length === 0) return { edges: [] as [string, string, number][], total: 0 };
    const inTree = new Set([roomIds[0]]);
    const edges: [string, string, number][] = [];
    const pq = new IndexedPriorityQueue<[string, string]>((a, b) => a - b);
    const pushFrom = (u: string) => {
      for (const v of roomIds) {
        if (inTree.has(v)) continue;
        const d = this.shortestPath(u, v)?.cost ?? Infinity;
        if (d === Infinity) continue;
        const id = `${u}|${v}`;
        pq.enqueue(id, [u, v], d);
      }
    };
    pushFrom(roomIds[0]);
    let total = 0;
    while (!pq.isEmpty() && inTree.size < roomIds.length) {
      const { item: [u, v], priority } = pq.dequeue()!;
      if (inTree.has(v)) continue;
      inTree.add(v);
      edges.push([u, v, priority]);
      total += priority;
      pushFrom(v);
    }
    return { edges, total };
  }

  /** Connected components (iterative DFS) – detects isolated wings. */
  components(): string[][] {
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

/* ------------------------------------------------------------------ */
/* 5. Route Optimizer: nearest neighbour + 2-opt (TSP heuristic)      */
/* ------------------------------------------------------------------ */

export class RouteOptimizer {
  constructor(private graph: WeightedRoomGraph) {}

  private dist(a: string, b: string) {
    return this.graph.shortestPath(a, b)?.cost ?? Infinity;
  }

  routeCost(route: string[]) {
    let c = 0;
    for (let i = 1; i < route.length; i++) c += this.dist(route[i - 1], route[i]);
    return c;
  }

  /** Keeps `start` fixed as the first stop. */
  optimize(start: string, stops: string[]): { route: string[]; cost: number } {
    const remaining = new Set(stops.filter(s => s !== start));
    let route = [start];
    // nearest neighbour construction: O(k^2)
    while (remaining.size) {
      const last = route[route.length - 1];
      let best = '', bestD = Infinity;
      for (const r of remaining) {
        const d = this.dist(last, r);
        if (d < bestD) { bestD = d; best = r; }
      }
      if (!best) break;
      route.push(best);
      remaining.delete(best);
    }
    // 2-opt improvement
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 1; i < route.length - 1; i++) {
        for (let j = i + 1; j < route.length; j++) {
          const cand = [...route.slice(0, i), ...route.slice(i, j + 1).reverse(), ...route.slice(j + 1)];
          if (this.routeCost(cand) < this.routeCost(route) - 1e-9) {
            route = cand;
            improved = true;
          }
        }
      }
    }
    return { route, cost: this.routeCost(route) };
  }
}

/* ------------------------------------------------------------------ */
/* 6. Dynamic Programming: 0/1 knapsack over a shift window           */
/* ------------------------------------------------------------------ */

export interface ScheduleCandidate { roomId: string; urgency: number; minutes: number; }

export class KnapsackScheduler {
  /** Maximise total urgency handled within `budgetMinutes`. O(n * W). */
  static plan(cands: ScheduleCandidate[], budgetMinutes: number) {
    const W = Math.max(0, Math.floor(budgetMinutes));
    const n = cands.length;
    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(0));
    for (let i = 1; i <= n; i++) {
      const { urgency, minutes } = cands[i - 1];
      const w = Math.max(1, Math.ceil(minutes));
      for (let c = 0; c <= W; c++) {
        dp[i][c] = dp[i - 1][c];
        if (w <= c) dp[i][c] = Math.max(dp[i][c], dp[i - 1][c - w] + urgency);
      }
    }
    const chosen: ScheduleCandidate[] = [];
    let c = W;
    for (let i = n; i >= 1; i--) {
      if (dp[i][c] !== dp[i - 1][c]) {
        chosen.push(cands[i - 1]);
        c -= Math.max(1, Math.ceil(cands[i - 1].minutes));
      }
    }
    return {
      chosen: chosen.reverse(),
      totalUrgency: dp[n][W],
      minutesUsed: chosen.reduce((s, x) => s + x.minutes, 0),
    };
  }
}

/* ------------------------------------------------------------------ */
/* 7. History + predictive analytics                                  */
/* ------------------------------------------------------------------ */

export class CleaningHistoryMap {
  private map = new Map<string, CleaningHistoryEntry[]>();
  private static readonly DAY = 86_400_000;

  add(roomId: string, e: CleaningHistoryEntry) {
    const arr = this.map.get(roomId) ?? [];
    arr.push(e);
    arr.sort((a, b) => a.timestamp - b.timestamp);
    this.map.set(roomId, arr);
  }

  get(roomId: string) { return this.map.get(roomId) ?? []; }

  averageScore(roomId: string) {
    const h = this.get(roomId);
    return h.length ? h.reduce((s, e) => s + e.scoreBefore, 0) / h.length : null;
  }

  frequency(roomId: string, days: number, now = Date.now()) {
    const cutoff = now - days * CleaningHistoryMap.DAY;
    return this.get(roomId).filter(e => e.timestamp >= cutoff).length;
  }

  /**
   * Points lost per day between cleanings, smoothed with an EWMA so recent
   * behaviour counts more than old behaviour. O(k).
   */
  degradationRate(roomId: string, alpha = 0.4): number | null {
    const h = this.get(roomId);
    if (h.length < 2) return null;
    let ewma: number | null = null;
    for (let i = 1; i < h.length; i++) {
      const days = (h[i].timestamp - h[i - 1].timestamp) / CleaningHistoryMap.DAY;
      if (days <= 0) continue;
      const rate = (h[i - 1].scoreAfter - h[i].scoreBefore) / days;
      ewma = ewma === null ? rate : alpha * rate + (1 - alpha) * ewma;
    }
    return ewma;
  }

  /** Least-squares slope of scoreBefore over time (trend: is the room getting worse?). */
  trendSlopePerDay(roomId: string): number | null {
    const h = this.get(roomId);
    if (h.length < 3) return null;
    const t0 = h[0].timestamp;
    const xs = h.map(e => (e.timestamp - t0) / CleaningHistoryMap.DAY);
    const ys = h.map(e => e.scoreBefore);
    const n = xs.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
    return den === 0 ? 0 : num / den;
  }

  /** Hours until the room is predicted to fall under `threshold`. */
  predictHoursUntil(room: RoomNode, threshold = 70, now = Date.now()): number | null {
    const rate = this.degradationRate(room.id);
    if (rate === null || rate <= 0) return null;
    const ageDays = (now - room.lastCleaned) / CleaningHistoryMap.DAY;
    const current = Math.min(100, room.cleanlinessScore) - 0; // live score
    void ageDays;
    return Math.max(0, ((current - threshold) / rate) * 24);
  }

  /** Z-score of a room's degradation vs. all rooms: flags statistical outliers. */
  outliers(zThreshold = 1.5): { roomId: string; rate: number; z: number }[] {
    const rates: { roomId: string; rate: number }[] = [];
    for (const id of this.map.keys()) {
      const r = this.degradationRate(id);
      if (r !== null) rates.push({ roomId: id, rate: r });
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

/* ------------------------------------------------------------------ */
/* 8. Staff assignment: workload-aware min-heap                       */
/* ------------------------------------------------------------------ */

export class StaffAssigner {
  // lower workload = higher priority; ties broken by fewer tasks
  private pq = new IndexedPriorityQueue<Staff>((a, b) => a - b);

  private score(s: Staff) { return s.minutesWorked + s.tasksCompleted * 0.01; }

  add(s: Staff) { if (s.status === 'available') this.pq.enqueue(s.id, s, this.score(s)); }

  /** Pick the least-loaded available staff, optionally requiring a skill. O(k log n). */
  assign(requiredSkill?: string): Staff | undefined {
    const skipped: Staff[] = [];
    let found: Staff | undefined;
    while (!this.pq.isEmpty()) {
      const { item } = this.pq.dequeue()!;
      if (!requiredSkill || item.skills?.includes(requiredSkill)) { found = item; break; }
      skipped.push(item);
    }
    skipped.forEach(s => this.pq.enqueue(s.id, s, this.score(s)));
    if (found) found.status = 'busy';
    return found;
  }

  release(s: Staff, minutes: number) {
    s.status = 'available';
    s.tasksCompleted++;
    s.minutesWorked += minutes;
    this.pq.enqueue(s.id, s, this.score(s));
  }

  /** Gini coefficient of workload: 0 = perfectly fair, 1 = totally unfair. */
  static fairness(staff: Staff[]): number {
    const x = staff.map(s => s.minutesWorked).sort((a, b) => a - b);
    const n = x.length, sum = x.reduce((a, b) => a + b, 0);
    if (!n || sum === 0) return 0;
    let acc = 0;
    x.forEach((v, i) => { acc += (2 * (i + 1) - n - 1) * v; });
    return acc / (n * sum);
  }
}

/* ------------------------------------------------------------------ */
/* 9. Urgency engine                                                  */
/* ------------------------------------------------------------------ */

export interface UrgencyWeights {
  dirtiness: number;
  agePerHour: number;
  ageCapHours: number;
  occupied: number;
  request: number;
  predictedRisk: number;
}

export const DEFAULT_WEIGHTS: UrgencyWeights = {
  dirtiness: 1,
  agePerHour: 2,
  ageCapHours: 72, // don't let very old timestamps dominate forever
  occupied: 20,
  request: 30,
  predictedRisk: 15,
};

export class UrgencyEngine {
  constructor(
    private history: CleaningHistoryMap,
    private w: UrgencyWeights = DEFAULT_WEIGHTS,
  ) {}

  score(room: RoomNode, now = Date.now()): number {
    const hours = Math.min((now - room.lastCleaned) / 3_600_000, this.w.ageCapHours);
    // squared dirtiness makes very dirty rooms stand out more than linear
    const dirt = ((100 - room.cleanlinessScore) / 100) ** 2 * 100 * this.w.dirtiness;
    let s = dirt + hours * this.w.agePerHour;
    if (room.occupancyStatus) s += this.w.occupied;
    if (room.studentRequestBoost) s += this.w.request;
    const eta = this.history.predictHoursUntil(room, 70, now);
    if (eta !== null && eta < 12) s += this.w.predictedRisk * (1 - eta / 12);
    return s;
  }
}

/* ------------------------------------------------------------------ */
/* 10. Facade                                                         */
/* ------------------------------------------------------------------ */

export class HostelOptimizer {
  readonly history = new CleaningHistoryMap();
  readonly urgency = new UrgencyEngine(this.history);
  readonly tasks = new IndexedPriorityQueue<RoomNode>(); // max-heap
  readonly staff = new StaffAssigner();
  readonly router: RouteOptimizer;

  constructor(readonly graph: WeightedRoomGraph, staffList: Staff[]) {
    this.router = new RouteOptimizer(graph);
    staffList.forEach(s => this.staff.add(s));
    this.refreshAll();
  }

  refreshAll(now = Date.now()) {
    for (const r of this.graph.nodes.values()) this.refresh(r.id, now);
  }

  /** Lazy O(log n) update for a single room. */
  refresh(roomId: string, now = Date.now()) {
    const r = this.graph.nodes.get(roomId)!;
    if (r.cleanlinessScore >= 90 && !r.studentRequestBoost) { this.tasks.remove(roomId); return; }
    this.tasks.enqueue(roomId, r, this.urgency.score(r, now));
  }

  studentRequest(roomId: string) {
    const r = this.graph.nodes.get(roomId);
    if (!r) throw new Error(`No such room ${roomId}`);
    r.studentRequestBoost = true;
    this.refresh(roomId);
  }

  /** Plan a shift: knapsack picks rooms, 2-opt orders them. */
  planShift(startRoom: string, minutes = 240) {
    const cands: ScheduleCandidate[] = this.tasks.topK(this.tasks.size).map(e => ({
      roomId: e.id, urgency: e.priority, minutes: e.item.cleaningMinutes ?? 20,
    }));
    const pick = KnapsackScheduler.plan(cands, minutes);
    const ids = pick.chosen.map(c => c.roomId);
    const { route, cost } = this.router.optimize(startRoom, ids);
    return { rooms: route, walkingCost: cost, ...pick };
  }

  complete(roomId: string, staff: Staff, scoreAfter = 100, minutes = 20, now = Date.now()) {
    const r = this.graph.nodes.get(roomId)!;
    this.history.add(roomId, {
      timestamp: now, staffId: staff.id,
      scoreBefore: r.cleanlinessScore, scoreAfter, duration: minutes,
    });
    r.cleanlinessScore = scoreAfter;
    r.lastCleaned = now;
    r.studentRequestBoost = false;
    this.staff.release(staff, minutes);
    this.refresh(roomId, now);
  }
}

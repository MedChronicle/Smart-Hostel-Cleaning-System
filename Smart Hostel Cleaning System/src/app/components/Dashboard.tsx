import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useHostel } from '../context/HostelContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Sparkles,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Play,
  Pause,
  Search,
  ArrowUpDown,
  Flame,
  Activity,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { SimulationControls } from './SimulationControls';

interface QueueItem {
  priority: number;
  item: string;
}

interface StaffMember {
  id: string;
  name: string;
  tasksCompleted: number;
  efficiency: number;
  status?: string;
  currentTask?: string | null;
}

interface ActivityEntry {
  id: string;
  kind: 'assigned' | 'completed';
  text: string;
  time: Date;
}

type QueueFilter = 'all' | 'critical' | 'requested' | 'occupied';

const POLL_MS = 1000;
const VISIBLE_DEFAULT = 8;
const MAX_ACTIVITY = 8;
const CRITICAL_URGENCY = 100;

const cleanlinessColor = (score: number) => {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
};

const urgencyColor = (urgency: number) => {
  if (urgency >= CRITICAL_URGENCY) return 'text-red-600';
  if (urgency >= 70) return 'text-orange-600';
  return 'text-yellow-600';
};

const queueSignature = (items: QueueItem[]) => items.map((i) => `${i.item}:${i.priority.toFixed(2)}`).join('|');
const staffSignature = (items: StaffMember[]) =>
  items.map((s) => `${s.id}:${s.tasksCompleted}:${s.efficiency}`).join('|');

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

interface StatCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  borderClass: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  children?: React.ReactNode;
}

function StatCard({ title, icon: Icon, borderClass, value, caption, children }: StatCardProps) {
  return (
    <Card
      className={`backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 ${borderClass}`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {caption && <p className="text-xs text-muted-foreground">{caption}</p>}
        {children}
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { priorityQueue, staffQueue, rooms, staff, assignTask, refreshPriorityQueue } = useHostel();

  const [queueItems, setQueueItems] = useState<QueueItem[]>(() => priorityQueue.getAll());
  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>(() => staffQueue.getAll());
  const [paused, setPaused] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [filter, setFilter] = useState<QueueFilter>('all');
  const [search, setSearch] = useState('');
  const [heapOrder, setHeapOrder] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [avgDelta, setAvgDelta] = useState(0);

  const prevBusyRef = useRef<Map<string, string> | null>(null);
  const prevAvgRef = useRef<number | null>(null);

  const sync = useCallback(() => {
    const nextQueue = priorityQueue.getAll() as QueueItem[];
    const nextStaff = staffQueue.getAll() as StaffMember[];
    setQueueItems((prev) => (queueSignature(prev) === queueSignature(nextQueue) ? prev : nextQueue));
    setAvailableStaff((prev) => (staffSignature(prev) === staffSignature(nextStaff) ? prev : nextStaff));
    setLastUpdated(new Date());
  }, [priorityQueue, staffQueue]);

  useEffect(() => {
    sync();
    if (paused) return undefined;
    const interval = setInterval(sync, POLL_MS);
    return () => clearInterval(interval);
  }, [sync, paused]);

  const roomById = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const busyStaffList = useMemo(() => staff.filter((s) => s.status === 'busy'), [staff]);

  const averageCleanliness = useMemo(
    () => (rooms.length === 0 ? 0 : rooms.reduce((acc, r) => acc + r.cleanlinessScore, 0) / rooms.length),
    [rooms]
  );

  useEffect(() => {
    if (prevAvgRef.current !== null && prevAvgRef.current !== averageCleanliness) {
      setAvgDelta(averageCleanliness - prevAvgRef.current);
    }
    prevAvgRef.current = averageCleanliness;
  }, [averageCleanliness]);

  useEffect(() => {
    const current = new Map<string, string>();
    busyStaffList.forEach((member) => current.set(member.id, String(member.currentTask ?? '')));

    const previous = prevBusyRef.current;
    if (previous) {
      const entries: ActivityEntry[] = [];
      const nameOf = (id: string) => staff.find((s) => s.id === id)?.name ?? `Staff ${id}`;

      current.forEach((task, id) => {
        if (previous.get(id) !== task) {
          entries.push({
            id: `a-${id}-${task}-${Date.now()}`,
            kind: 'assigned',
            text: `${nameOf(id)} assigned to Room ${task}`,
            time: new Date(),
          });
        }
      });

      previous.forEach((task, id) => {
        if (!current.has(id)) {
          entries.push({
            id: `c-${id}-${task}-${Date.now()}`,
            kind: 'completed',
            text: `${nameOf(id)} finished Room ${task}`,
            time: new Date(),
          });
        }
      });

      if (entries.length > 0) {
        setActivity((prev) => [...entries.reverse(), ...prev].slice(0, MAX_ACTIVITY));
      }
    }

    prevBusyRef.current = current;
  }, [busyStaffList, staff]);

  const dirtyRooms = useMemo(() => rooms.filter((r) => r.cleanlinessScore < 70).length, [rooms]);

  const distribution = useMemo(() => {
    const counts = { clean: 0, moderate: 0, dirty: 0 };
    rooms.forEach((r) => {
      if (r.cleanlinessScore >= 80) counts.clean += 1;
      else if (r.cleanlinessScore >= 60) counts.moderate += 1;
      else counts.dirty += 1;
    });
    return counts;
  }, [rooms]);

  const floorHealth = useMemo(() => {
    const groups = new Map<string, { sum: number; count: number }>();
    rooms.forEach((r) => {
      const key = String(r.floor);
      const entry = groups.get(key) ?? { sum: 0, count: 0 };
      entry.sum += r.cleanlinessScore;
      entry.count += 1;
      groups.set(key, entry);
    });
    return Array.from(groups.entries())
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([floor, { sum, count }]) => ({ floor, average: Math.round(sum / count), count }));
  }, [rooms]);

  const criticalCount = useMemo(
    () => queueItems.filter((i) => i.priority >= CRITICAL_URGENCY).length,
    [queueItems]
  );

  const maxPriority = useMemo(
    () => queueItems.reduce((max, i) => Math.max(max, i.priority), 1),
    [queueItems]
  );

  const filterCounts = useMemo(() => {
    const counts = { all: queueItems.length, critical: 0, requested: 0, occupied: 0 };
    queueItems.forEach((i) => {
      const room = roomById.get(i.item);
      if (i.priority >= CRITICAL_URGENCY) counts.critical += 1;
      if (room?.studentRequestBoost) counts.requested += 1;
      if (room?.occupancyStatus) counts.occupied += 1;
    });
    return counts;
  }, [queueItems, roomById]);

  const visibleQueue = useMemo(() => {
    const base = heapOrder ? queueItems : [...queueItems].sort((a, b) => b.priority - a.priority);
    const q = search.trim().toLowerCase();

    return base.filter((i) => {
      const room = roomById.get(i.item);
      if (!room) return false;
      if (q && !room.id.toLowerCase().includes(q)) return false;
      if (filter === 'critical') return i.priority >= CRITICAL_URGENCY;
      if (filter === 'requested') return Boolean(room.studentRequestBoost);
      if (filter === 'occupied') return Boolean(room.occupancyStatus);
      return true;
    });
  }, [queueItems, heapOrder, search, filter, roomById]);

  const displayedQueue = showAll ? visibleQueue : visibleQueue.slice(0, VISIBLE_DEFAULT);
  const canAssign = availableStaff.length > 0 && queueItems.length > 0;
  const allStaffBusy = staff.length > 0 && availableStaff.length === 0;

  const handleRefresh = () => {
    refreshPriorityQueue();
    sync();
  };

  const handleAssign = () => {
    assignTask();
    sync();
  };

  const breakdownFor = (roomId: string) => {
    const room = roomById.get(roomId);
    if (!room) return '';
    const hours = Math.max(0, Math.floor((Date.now() - room.lastCleaned) / 3600000));
    const parts = [
      `Dirtiness ${100 - room.cleanlinessScore}`,
      `Age ${hours * 2}`,
      room.occupancyStatus ? 'Occupied 20' : null,
      room.studentRequestBoost ? 'Request 30' : null,
    ].filter(Boolean);
    return parts.join(' + ');
  };

  const filterChips: { key: QueueFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'critical', label: 'Critical' },
    { key: 'requested', label: 'Requested' },
    { key: 'occupied', label: 'Occupied' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={`inline-block h-2 w-2 rounded-full ${paused ? 'bg-slate-400' : 'bg-green-500 animate-pulse'}`}
          />
          <span>{paused ? 'Live updates paused' : 'Live'}</span>
          <span>• Updated {formatTime(lastUpdated)}</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
          {paused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
          {paused ? 'Resume' : 'Pause'} updates
        </Button>
      </div>

      {criticalCount > 0 && allStaffBusy && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Staff capacity reached</div>
            <div>
              {criticalCount} critical room{criticalCount === 1 ? '' : 's'} waiting and every staff member is busy.
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Rooms"
          icon={Sparkles}
          borderClass="border-blue-200 dark:border-blue-800"
          value={rooms.length}
          caption={`${dirtyRooms} need cleaning`}
        >
          {rooms.length > 0 && (
            <div
              className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
              role="img"
              aria-label={`${distribution.clean} clean, ${distribution.moderate} moderate, ${distribution.dirty} dirty`}
            >
              <div className="bg-green-500" style={{ width: `${(distribution.clean / rooms.length) * 100}%` }} />
              <div className="bg-yellow-500" style={{ width: `${(distribution.moderate / rooms.length) * 100}%` }} />
              <div className="bg-red-500" style={{ width: `${(distribution.dirty / rooms.length) * 100}%` }} />
            </div>
          )}
        </StatCard>

        <StatCard
          title="Avg Cleanliness"
          icon={avgDelta < 0 ? TrendingDown : TrendingUp}
          borderClass="border-purple-200 dark:border-purple-800"
          value={
            <span className="flex items-baseline gap-2">
              {averageCleanliness.toFixed(1)}
              {avgDelta !== 0 && (
                <span className={`text-xs font-medium ${avgDelta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {avgDelta > 0 ? '+' : ''}
                  {avgDelta.toFixed(1)}
                </span>
              )}
            </span>
          }
        >
          <Progress value={averageCleanliness} className="h-2 mt-2" />
        </StatCard>

        <StatCard
          title="Staff Available"
          icon={Users}
          borderClass="border-pink-200 dark:border-pink-800"
          value={`${staff.length - busyStaffList.length}/${staff.length}`}
          caption={`${busyStaffList.length} currently busy`}
        />

        <StatCard
          title="Priority Queue"
          icon={AlertTriangle}
          borderClass="border-green-200 dark:border-green-800"
          value={queueItems.length}
          caption={
            criticalCount > 0 ? (
              <span className="text-red-600 font-medium">{criticalCount} critical</span>
            ) : (
              'Pending tasks'
            )
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl border-blue-200 dark:border-blue-800">
          <CardHeader className="space-y-3">
            <div className="flex flex-row items-center justify-between">
              <CardTitle>Priority Queue (Max Heap)</CardTitle>
              <Button onClick={handleRefresh} variant="outline" size="sm" className="backdrop-blur-sm">
                <Sparkles className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-32">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search room"
                  aria-label="Search queue by room"
                  className="h-8 w-full rounded-md border bg-background pl-8 pr-2 text-sm"
                />
              </div>
              <Button
                size="sm"
                variant={heapOrder ? 'default' : 'outline'}
                onClick={() => setHeapOrder((v) => !v)}
                aria-pressed={heapOrder}
                title="Toggle between sorted order and raw heap array order"
              >
                <ArrowUpDown className="h-4 w-4 mr-1" />
                {heapOrder ? 'Heap order' : 'Sorted'}
              </Button>
            </div>

            <div className="flex flex-wrap gap-1" role="group" aria-label="Filter queue">
              {filterChips.map((chip) => (
                <Button
                  key={chip.key}
                  size="sm"
                  variant={filter === chip.key ? 'default' : 'outline'}
                  onClick={() => setFilter(chip.key)}
                  className="h-7 px-2 text-xs"
                >
                  {chip.label}
                  <span className="ml-1 opacity-70">{filterCounts[chip.key]}</span>
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
              {queueItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>All rooms are clean!</p>
                </div>
              ) : visibleQueue.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No tasks match this filter</div>
              ) : (
                displayedQueue.map((item, index) => {
                  const room = roomById.get(item.item);
                  if (!room) return null;
                  const isNext = !heapOrder && filter === 'all' && !search && index === 0;

                  return (
                    <div
                      key={item.item}
                      title={breakdownFor(item.item)}
                      className={`p-3 border rounded-lg hover:bg-accent backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 hover:scale-[1.01] transition-all duration-200 ${
                        isNext ? 'ring-2 ring-primary/50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-5 text-xs text-muted-foreground tabular-nums">{index + 1}</span>
                          <div className="flex flex-col">
                            <span className="font-mono font-semibold flex items-center gap-1">
                              Room {room.id}
                              {item.priority >= CRITICAL_URGENCY && <Flame className="h-3.5 w-3.5 text-red-500" />}
                            </span>
                            <span className="text-xs text-muted-foreground">Floor {room.floor}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {isNext && <Badge>Next up</Badge>}
                            <Badge variant={room.occupancyStatus ? 'default' : 'secondary'}>
                              {room.occupancyStatus ? 'Occupied' : 'Vacant'}
                            </Badge>
                            {room.studentRequestBoost && <Badge variant="destructive">Requested</Badge>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className={`font-bold ${urgencyColor(item.priority)}`}>
                              U: {item.priority.toFixed(1)}
                            </div>
                            <div className="text-xs text-muted-foreground">Score: {room.cleanlinessScore}</div>
                          </div>
                          <div className={`w-3 h-3 rounded-full ${cleanlinessColor(room.cleanlinessScore)}`} />
                        </div>
                      </div>
                      <div className="mt-2 h-1 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/70 transition-all duration-500"
                          style={{ width: `${Math.min(100, (item.priority / maxPriority) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {visibleQueue.length > VISIBLE_DEFAULT && (
              <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Show fewer' : `Show all ${visibleQueue.length} tasks`}
                <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${showAll ? 'rotate-90' : ''}`} />
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl border-pink-200 dark:border-pink-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Staff Queue (FIFO)</CardTitle>
            <Button onClick={handleAssign} disabled={!canAssign} size="sm" className="backdrop-blur-sm">
              <Play className="h-4 w-4 mr-2" />
              Assign Task
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[440px] overflow-y-auto pr-1">
              <div>
                <h4 className="text-sm font-semibold mb-2 text-green-600">Available ({availableStaff.length})</h4>
                {availableStaff.length === 0 && (
                  <div className="text-sm text-muted-foreground py-2">No staff free right now</div>
                )}
                {availableStaff.map((member, index) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg mb-2 bg-green-50 dark:bg-green-950 backdrop-blur-sm hover:scale-[1.01] transition-all duration-200"
                  >
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        {member.name}
                        {index === 0 && <Badge variant="outline">Next in line</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">ID: {member.id}</div>
                    </div>
                    <div className="text-right w-28">
                      <div className="text-sm font-semibold">{member.tasksCompleted} tasks</div>
                      <Progress value={member.efficiency} className="h-1.5 my-1" />
                      <div className="text-xs text-muted-foreground">{member.efficiency}% efficiency</div>
                    </div>
                  </div>
                ))}
              </div>

              {busyStaffList.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-orange-600">Busy ({busyStaffList.length})</h4>
                  {busyStaffList.map((member) => {
                    const room = member.currentTask ? roomById.get(String(member.currentTask)) : undefined;
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 border rounded-lg mb-2 bg-orange-50 dark:bg-orange-950 backdrop-blur-sm hover:scale-[1.01] transition-all duration-200"
                      >
                        <div>
                          <div className="font-semibold">{member.name}</div>
                          <div className="text-xs text-muted-foreground">ID: {member.id}</div>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            Room {member.currentTask}
                          </Badge>
                          {room && (
                            <div className="text-xs text-muted-foreground">Score {room.cleanlinessScore}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Floor Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {floorHealth.length === 0 ? (
              <div className="text-sm text-muted-foreground">No rooms loaded</div>
            ) : (
              floorHealth.map(({ floor, average, count }) => (
                <div key={floor} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Floor {floor}</span>
                    <span className="text-xs text-muted-foreground">
                      {count} rooms • avg {average}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${cleanlinessColor(average)}`}
                      style={{ width: `${Math.max(0, Math.min(100, average))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">
                Assignments and completions will appear here as they happen.
              </div>
            ) : (
              <ul className="space-y-2" aria-live="polite">
                {activity.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-2 text-sm">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        entry.kind === 'assigned' ? 'bg-orange-500' : 'bg-green-500'
                      }`}
                    />
                    <span className="flex-1">{entry.text}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{formatTime(entry.time)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle>DSA Implementation Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-orange-500" />
            <div>
              <strong>Priority Queue (Max Heap):</strong> Urgency = (100 - cleanliness) + (hours × 2) + (occupied
              bonus: 20) + (request boost: 30). Hover a task to see its breakdown.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 mt-0.5 text-blue-500" />
            <div>
              <strong>Staff Queue (FIFO):</strong> Available staff are assigned in order. After completing a task,
              they re-enter the queue.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 mt-0.5 text-purple-500" />
            <div>
              <strong>Graph Structure:</strong> Rooms are nodes with adjacency relationships. BFS/Dijkstra finds
              optimal cleaning paths.
            </div>
          </div>
        </CardContent>
      </Card>

      <SimulationControls />
    </div>
  );
}

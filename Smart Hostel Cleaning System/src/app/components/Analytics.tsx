import React, { useMemo, useState, useCallback } from 'react';
import { useHostel } from '../context/HostelContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  History,
  AlertTriangle,
  Award,
  Download,
  Lightbulb,
  Search,
  Timer,
  Users,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface HistoryEntry {
  timestamp: number;
  staffId: string;
  duration: number;
  scoreBefore: number;
  scoreAfter: number;
}

type RangeKey = '7d' | '30d' | 'all';

const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: 'all', label: 'All time', days: null },
];

const AT_RISK_RATE = 5;
const CRITICAL_SCORE = 60;
const HOUR_MS = 3600000;
const DAY_MS = 86400000;
const HISTORY_PAGE = 12;

const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.92)',
  border: 'none',
  borderRadius: 8,
  color: '#f8fafc',
  fontSize: 12,
};

const surface = 'backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl animate-in fade-in duration-500';
const tile =
  'border rounded-lg backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 hover:scale-[1.01] transition-all duration-200';

const average = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;

const round1 = (value: number) => Math.round(value * 10) / 10;

const scoreTextClass = (score: number) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

const csvCell = (value: unknown) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

interface MetricProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  borderClass: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
}

function Metric({ title, icon: Icon, borderClass, value, caption }: MetricProps) {
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
      </CardContent>
    </Card>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="text-center py-10 text-sm text-muted-foreground">{children}</div>;
}

export function Analytics() {
  const { rooms, historyMap, staff } = useHostel();

  const [range, setRange] = useState<RangeKey>('30d');
  const [floorFilter, setFloorFilter] = useState<string>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE);

  const floors = useMemo(
    () => Array.from(new Set(rooms.map((r) => String(r.floor)))).sort((a, b) => Number(a) - Number(b)),
    [rooms]
  );

  const filteredRooms = useMemo(
    () => rooms.filter((r) => floorFilter === 'all' || String(r.floor) === floorFilter),
    [rooms, floorFilter]
  );

  const data = useMemo(() => {
    const rangeDays = RANGES.find((r) => r.key === range)?.days ?? null;
    const cutoff = rangeDays === null ? 0 : Date.now() - rangeDays * DAY_MS;

    const entriesByRoom = new Map<string, HistoryEntry[]>();
    filteredRooms.forEach((room) => {
      const all = (historyMap.getHistory(room.id) ?? []) as HistoryEntry[];
      entriesByRoom.set(
        room.id,
        all.filter((e) => e.timestamp >= cutoff)
      );
    });

    const roomStats = filteredRooms.map((room) => {
      const entries = entriesByRoom.get(room.id) ?? [];
      const degradationRate = Number(historyMap.getDegradationRate(room.id)) || 0;
      const hoursToCritical =
        degradationRate > 0 ? Math.max(0, (room.cleanlinessScore - CRITICAL_SCORE) / degradationRate) : null;

      return {
        roomId: room.id,
        floor: room.floor,
        currentScore: room.cleanlinessScore,
        avgScore: Number(historyMap.getAverageCleanlinessScore(room.id)) || 0,
        degradationRate,
        frequency: Number(historyMap.getCleaningFrequency(room.id, 30)) || 0,
        cleaningCount: entries.length,
        hoursToCritical,
      };
    });

    const floorBuckets = new Map<string, { floor: string; sum: number; count: number; dirty: number }>();
    filteredRooms.forEach((room) => {
      const key = String(room.floor);
      const bucket = floorBuckets.get(key) ?? { floor: key, sum: 0, count: 0, dirty: 0 };
      bucket.sum += room.cleanlinessScore;
      bucket.count += 1;
      if (room.cleanlinessScore < 70) bucket.dirty += 1;
      floorBuckets.set(key, bucket);
    });
    const floorData = Array.from(floorBuckets.values())
      .sort((a, b) => Number(a.floor) - Number(b.floor))
      .map((b) => ({
        floor: `Floor ${b.floor}`,
        avgCleanliness: round1(b.sum / b.count),
        dirtyRooms: b.dirty,
      }));

    const buckets = [
      { name: 'Excellent (90-100)', min: 90, max: 101, color: '#22c55e' },
      { name: 'Good (80-89)', min: 80, max: 90, color: '#84cc16' },
      { name: 'Fair (70-79)', min: 70, max: 80, color: '#eab308' },
      { name: 'Poor (60-69)', min: 60, max: 70, color: '#f97316' },
      { name: 'Critical (<60)', min: -Infinity, max: 60, color: '#ef4444' },
    ];
    const distribution = buckets.map((b) => ({
      name: b.name,
      color: b.color,
      value: filteredRooms.filter((r) => r.cleanlinessScore >= b.min && r.cleanlinessScore < b.max).length,
    }));

    const atRiskRooms = roomStats
      .filter((r) => r.degradationRate > AT_RISK_RATE)
      .sort((a, b) => b.degradationRate - a.degradationRate)
      .slice(0, 10);

    const mostCleanedRooms = [...roomStats].sort((a, b) => b.cleaningCount - a.cleaningCount).slice(0, 10);

    const allEntries: (HistoryEntry & { roomId: string })[] = [];
    entriesByRoom.forEach((entries, roomId) => {
      entries.forEach((e) => allEntries.push({ ...e, roomId }));
    });
    allEntries.sort((a, b) => a.timestamp - b.timestamp);

    const days = new Map<
      string,
      { stamp: number; count: number; before: number; after: number; duration: number }
    >();
    allEntries.forEach((entry) => {
      const key = new Date(entry.timestamp).toISOString().slice(0, 10);
      const day = days.get(key) ?? { stamp: entry.timestamp, count: 0, before: 0, after: 0, duration: 0 };
      day.count += 1;
      day.before += entry.scoreBefore;
      day.after += entry.scoreAfter;
      day.duration += entry.duration;
      days.set(key, day);
    });
    const trendData = Array.from(days.entries()).map(([, day]) => ({
      date: new Date(day.stamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      cleanings: day.count,
      avgBefore: round1(day.before / day.count),
      avgAfter: round1(day.after / day.count),
      avgDuration: round1(day.duration / day.count),
    }));

    const staffBuckets = new Map<string, { count: number; duration: number; gain: number }>();
    allEntries.forEach((entry) => {
      const bucket = staffBuckets.get(entry.staffId) ?? { count: 0, duration: 0, gain: 0 };
      bucket.count += 1;
      bucket.duration += entry.duration;
      bucket.gain += entry.scoreAfter - entry.scoreBefore;
      staffBuckets.set(entry.staffId, bucket);
    });

    const totalCleanings = allEntries.length;
    const avgGain = average(allEntries.map((e) => e.scoreAfter - e.scoreBefore));
    const avgDuration = average(allEntries.map((e) => e.duration));
    const avgCleanliness = average(filteredRooms.map((r) => r.cleanlinessScore));
    const topPerformer = roomStats.length
      ? roomStats.reduce((best, r) => (r.avgScore > best.avgScore ? r : best), roomStats[0])
      : null;

    const insights: string[] = [];
    if (floorData.length > 1) {
      const worst = floorData.reduce((a, b) => (b.avgCleanliness < a.avgCleanliness ? b : a));
      const best = floorData.reduce((a, b) => (b.avgCleanliness > a.avgCleanliness ? b : a));
      insights.push(`${worst.floor} has the lowest average cleanliness (${worst.avgCleanliness}), ${round1(best.avgCleanliness - worst.avgCleanliness)} points behind ${best.floor}.`);
    }
    if (atRiskRooms.length > 0) {
      const soonest = atRiskRooms
        .filter((r) => r.hoursToCritical !== null)
        .sort((a, b) => (a.hoursToCritical ?? 0) - (b.hoursToCritical ?? 0))[0];
      if (soonest) {
        insights.push(
          `Room ${soonest.roomId} is projected to reach a critical score in about ${Math.round(soonest.hoursToCritical ?? 0)}h at its current degradation rate.`
        );
      }
    }
    if (totalCleanings > 0) {
      insights.push(`Each cleaning raises a room by ${round1(avgGain)} points on average and takes ${round1(avgDuration)} minutes.`);
    }
    const neverCleaned = roomStats.filter((r) => r.cleaningCount === 0 && r.currentScore < 70).length;
    if (neverCleaned > 0) {
      insights.push(`${neverCleaned} dirty room${neverCleaned === 1 ? ' has' : 's have'} no cleaning recorded in this period.`);
    }

    return {
      roomStats,
      floorData,
      distribution,
      atRiskRooms,
      mostCleanedRooms,
      trendData,
      staffStats: staffBuckets,
      totalCleanings,
      avgGain,
      avgDuration,
      avgCleanliness,
      topPerformer,
      insights,
      entriesByRoom,
    };
  }, [filteredRooms, historyMap, range]);

  const cleanRooms = useMemo(
    () => filteredRooms.filter((r) => r.cleanlinessScore >= 80).sort((a, b) => b.cleanlinessScore - a.cleanlinessScore),
    [filteredRooms]
  );

  const staffRows = useMemo(
    () =>
      staff
        .map((member) => {
          const stats = data.staffStats.get(member.id);
          return {
            id: member.id,
            name: member.name,
            status: member.status,
            tasksCompleted: member.tasksCompleted,
            efficiency: member.efficiency,
            periodCleanings: stats?.count ?? 0,
            avgDuration: stats ? round1(stats.duration / stats.count) : 0,
            avgGain: stats ? round1(stats.gain / stats.count) : 0,
          };
        })
        .sort((a, b) => b.periodCleanings - a.periodCleanings),
    [staff, data.staffStats]
  );

  const historyRooms = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return filteredRooms.filter((room) => {
      if ((data.entriesByRoom.get(room.id)?.length ?? 0) === 0) return false;
      return !q || room.id.toLowerCase().includes(q);
    });
  }, [filteredRooms, data.entriesByRoom, historySearch]);

  const activeTasks = useMemo(
    () => staff.filter((s) => s.status === 'busy' && s.currentTask),
    [staff]
  );

  const exportCsv = useCallback(() => {
    const header = ['Room', 'Floor', 'Current score', 'Average score', 'Degradation rate', 'Cleanings (period)', 'Hours to critical'];
    const rows = data.roomStats.map((r) => [
      r.roomId,
      r.floor,
      r.currentScore,
      round1(r.avgScore),
      round1(r.degradationRate),
      r.cleaningCount,
      r.hoursToCritical === null ? '' : Math.round(r.hoursToCritical),
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `room-analytics-${range}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data.roomStats, range]);

  const gainPositive = data.avgGain >= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border backdrop-blur-sm bg-white/50 dark:bg-slate-800/50">
        <div className="flex gap-1" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <Button
              key={r.key}
              size="sm"
              variant={range === r.key ? 'default' : 'outline'}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </Button>
          ))}
        </div>
        <select
          value={floorFilter}
          onChange={(e) => setFloorFilter(e.target.value)}
          aria-label="Filter by floor"
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          <option value="all">All floors</option>
          {floors.map((floor) => (
            <option key={floor} value={floor}>
              Floor {floor}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">{filteredRooms.length} rooms in view</span>
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={data.roomStats.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 animate-in fade-in duration-500">
        <Metric
          title="Total Cleanings"
          icon={History}
          borderClass="border-blue-200 dark:border-blue-800"
          value={data.totalCleanings}
          caption={data.totalCleanings > 0 ? `${round1(data.avgDuration)} min average` : 'No cleanings in range'}
        />
        <Metric
          title="Avg Cleanliness"
          icon={TrendingUp}
          borderClass="border-purple-200 dark:border-purple-800"
          value={<span className={scoreTextClass(data.avgCleanliness)}>{data.avgCleanliness.toFixed(1)}</span>}
          caption="Current score"
        />
        <Metric
          title="Avg Improvement"
          icon={gainPositive ? TrendingUp : TrendingDown}
          borderClass="border-emerald-200 dark:border-emerald-800"
          value={`${gainPositive ? '+' : ''}${data.avgGain.toFixed(1)}`}
          caption="Points per cleaning"
        />
        <Metric
          title="Rooms at Risk"
          icon={AlertTriangle}
          borderClass="border-orange-200 dark:border-orange-800"
          value={<span className="text-red-600">{data.atRiskRooms.length}</span>}
          caption="High degradation rate"
        />
        <Metric
          title="Top Performer"
          icon={Award}
          borderClass="border-green-200 dark:border-green-800"
          value={data.topPerformer?.roomId ?? 'N/A'}
          caption="Best avg score"
        />
      </div>

      {data.insights.length > 0 && (
        <Card className={`${surface} border-yellow-200 dark:border-yellow-800`}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {data.insights.map((insight) => (
                <li key={insight}>• {insight}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="predictive">Predictive</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card className={surface}>
            <CardHeader>
              <CardTitle>Floor-wise Cleanliness</CardTitle>
              <CardDescription>Average cleanliness score and dirty room count by floor</CardDescription>
            </CardHeader>
            <CardContent>
              {data.floorData.length === 0 ? (
                <EmptyState>No rooms to show</EmptyState>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.floorData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                    <XAxis dataKey="floor" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar dataKey="avgCleanliness" fill="#3b82f6" name="Avg Cleanliness" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="dirtyRooms" fill="#ef4444" name="Dirty Rooms" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className={surface}>
            <CardHeader>
              <CardTitle>Cleaning Trend Over Time</CardTitle>
              <CardDescription>Daily cleanings with average score before and after</CardDescription>
            </CardHeader>
            <CardContent>
              {data.trendData.length === 0 ? (
                <EmptyState>No cleanings recorded in this period</EmptyState>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.trendData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Line type="monotone" dataKey="cleanings" stroke="#8b5cf6" name="# of Cleanings" strokeWidth={2} />
                    <Line type="monotone" dataKey="avgBefore" stroke="#ef4444" name="Avg Before" strokeWidth={2} />
                    <Line type="monotone" dataKey="avgAfter" stroke="#22c55e" name="Avg After" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className={surface}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Cleaning Duration
              </CardTitle>
              <CardDescription>Average minutes per cleaning each day</CardDescription>
            </CardHeader>
            <CardContent>
              {data.trendData.length === 0 ? (
                <EmptyState>No cleanings recorded in this period</EmptyState>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.trendData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="avgDuration" fill="#f59e0b" name="Avg minutes" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className={surface}>
              <CardHeader>
                <CardTitle>Cleanliness Distribution</CardTitle>
                <CardDescription>Share of rooms in each score band</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredRooms.length === 0 ? (
                  <EmptyState>No rooms to show</EmptyState>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.distribution.filter((d) => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                      >
                        {data.distribution
                          .filter((d) => d.value > 0)
                          .map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend verticalAlign="bottom" iconSize={10} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className={surface}>
              <CardHeader>
                <CardTitle>Cleanliness Breakdown</CardTitle>
                <CardDescription>Number of rooms in each category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.distribution}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                    <XAxis dataKey="name" angle={-35} textAnchor="end" height={90} interval={0} tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" name="Rooms" radius={[4, 4, 0, 0]}>
                      {data.distribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className={surface}>
            <CardHeader>
              <CardTitle>Most Cleaned Rooms</CardTitle>
              <CardDescription>Rooms with the most cleanings in this period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {data.mostCleanedRooms.filter((r) => r.cleaningCount > 0).length === 0 ? (
                  <EmptyState>No cleanings recorded in this period</EmptyState>
                ) : (
                  data.mostCleanedRooms
                    .filter((r) => r.cleaningCount > 0)
                    .map((room, index) => (
                      <div key={room.roomId} className={`flex items-center justify-between p-2 ${tile}`}>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{index + 1}</Badge>
                          <span className="font-semibold">Room {room.roomId}</span>
                          <span className="text-xs text-muted-foreground">Floor {room.floor}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">{room.cleaningCount} cleanings</div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictive" className="space-y-4">
          <Card className={`${surface} border-orange-200 dark:border-orange-800`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Rooms Likely to Degrade
              </CardTitle>
              <CardDescription>
                Rooms losing cleanliness faster than {AT_RISK_RATE} points per hour, with the time left before they drop
                below {CRITICAL_SCORE}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.atRiskRooms.length === 0 ? (
                <EmptyState>No rooms are degrading quickly right now</EmptyState>
              ) : (
                <div className="space-y-2">
                  {data.atRiskRooms.map((room, index) => {
                    const hours = room.hoursToCritical;
                    const severity =
                      hours === null ? 'secondary' : hours < 12 ? 'destructive' : hours < 48 ? 'default' : 'secondary';

                    return (
                      <div key={room.roomId} className={`flex items-center justify-between p-3 ${tile}`}>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{index + 1}</Badge>
                          <div>
                            <div className="font-semibold">Room {room.roomId}</div>
                            <div className="text-xs text-muted-foreground">
                              Floor {room.floor} • Score <span className={scoreTextClass(room.currentScore)}>{room.currentScore}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="text-sm font-semibold text-red-600">
                            -{round1(room.degradationRate)} / h
                          </div>
                          <Badge variant={severity}>
                            {hours === null
                              ? 'Stable'
                              : hours === 0
                                ? 'Already critical'
                                : `Critical in ~${Math.round(hours)}h`}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={surface}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-500" />
                Clean & Green Rooms
              </CardTitle>
              <CardDescription>Rooms maintaining excellent cleanliness (score of 80 or more)</CardDescription>
            </CardHeader>
            <CardContent>
              {cleanRooms.length === 0 ? (
                <EmptyState>No clean rooms found</EmptyState>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto">
                  {cleanRooms.map((room, index) => (
                    <div
                      key={room.id}
                      className="flex items-center justify-between p-4 border rounded-lg backdrop-blur-sm bg-green-50/80 dark:bg-green-950/80 hover:scale-[1.01] transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className="bg-green-600">{index + 1}</Badge>
                        <div>
                          <div className="font-semibold">Room {room.id}</div>
                          <div className="text-xs text-muted-foreground">
                            Floor {room.floor} • {room.occupancyStatus ? 'Occupied' : 'Vacant'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">{room.cleanlinessScore}/100</div>
                        <div className="text-xs text-muted-foreground">
                          {Math.floor((Date.now() - room.lastCleaned) / HOUR_MS)}h since cleaned
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 p-4 backdrop-blur-sm bg-green-50/80 dark:bg-green-950/80 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-semibold text-sm mb-2 text-green-900 dark:text-green-100">Summary</h4>
                <ul className="text-sm space-y-1 text-green-800 dark:text-green-200">
                  <li>
                    • {cleanRooms.length} of {filteredRooms.length} rooms are clean (
                    {filteredRooms.length === 0 ? '0.0' : ((cleanRooms.length / filteredRooms.length) * 100).toFixed(1)}%)
                  </li>
                  <li>• These rooms are maintaining excellent standards</li>
                  <li>• Continue the current cleaning schedule for these rooms</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <Card className={surface}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Staff Performance
              </CardTitle>
              <CardDescription>Cleanings recorded in this period alongside lifetime totals</CardDescription>
            </CardHeader>
            <CardContent>
              {staffRows.length === 0 ? (
                <EmptyState>No staff loaded</EmptyState>
              ) : (
                <>
                  <div className="h-64 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={staffRows}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                        <Bar dataKey="periodCleanings" fill="#8b5cf6" name="In period" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="tasksCompleted" fill="#3b82f6" name="Lifetime" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-left">
                        <tr>
                          <th className="p-2">Staff</th>
                          <th className="p-2">Status</th>
                          <th className="p-2 text-right">In period</th>
                          <th className="p-2 text-right">Avg minutes</th>
                          <th className="p-2 text-right">Avg gain</th>
                          <th className="p-2 text-right">Efficiency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffRows.map((row) => (
                          <tr key={row.id} className="border-t">
                            <td className="p-2">
                              <div className="font-medium">{row.name}</div>
                              <div className="text-xs text-muted-foreground">{row.id}</div>
                            </td>
                            <td className="p-2">
                              <Badge variant={row.status === 'busy' ? 'default' : 'secondary'}>
                                {row.status ?? 'available'}
                              </Badge>
                            </td>
                            <td className="p-2 text-right tabular-nums">{row.periodCleanings}</td>
                            <td className="p-2 text-right tabular-nums">{row.periodCleanings ? row.avgDuration : '-'}</td>
                            <td className="p-2 text-right tabular-nums">
                              {row.periodCleanings ? `${row.avgGain > 0 ? '+' : ''}${row.avgGain}` : '-'}
                            </td>
                            <td className="p-2 text-right tabular-nums">{row.efficiency}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {activeTasks.length > 0 && (
            <Card className={`${surface} border-orange-200 dark:border-orange-800`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  Active Cleaning Tasks
                </CardTitle>
                <CardDescription>Rooms currently being cleaned by staff</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeTasks.map((member) => {
                    const room = rooms.find((r) => r.id === member.currentTask);
                    if (!room) return null;

                    return (
                      <div
                        key={member.id}
                        className="border rounded-lg p-4 backdrop-blur-sm bg-orange-50/80 dark:bg-orange-950/80 hover:scale-[1.01] transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">Room {room.id}</h4>
                            <p className="text-xs text-muted-foreground">
                              Floor {room.floor} • Current Score: {room.cleanlinessScore}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Staff: {member.name} ({member.id})
                            </p>
                          </div>
                          <Badge className="bg-orange-600">In Progress</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className={surface}>
            <CardHeader className="space-y-3">
              <div>
                <CardTitle>Cleaned Rooms History</CardTitle>
                <CardDescription>Detailed cleaning records for the selected period</CardDescription>
              </div>
              <div className="relative max-w-xs">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryLimit(HISTORY_PAGE);
                  }}
                  placeholder="Search room"
                  aria-label="Search history by room"
                  className="h-8 w-full rounded-md border bg-background pl-8 pr-2 text-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              {historyRooms.length === 0 ? (
                <EmptyState>No cleaning records match this view</EmptyState>
              ) : (
                <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
                  {historyRooms.slice(0, historyLimit).map((room) => {
                    const entries = [...(data.entriesByRoom.get(room.id) ?? [])].sort(
                      (a, b) => b.timestamp - a.timestamp
                    );

                    return (
                      <div key={room.id} className={`p-4 ${tile}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">Room {room.id}</h4>
                            <p className="text-xs text-muted-foreground">
                              Floor {room.floor} • Current Score: {room.cleanlinessScore}
                            </p>
                          </div>
                          <Badge>{entries.length} cleanings</Badge>
                        </div>
                        <div className="space-y-2">
                          {entries.slice(0, 3).map((entry) => (
                            <HistoryRow key={`${entry.timestamp}-${entry.staffId}`} entry={entry} />
                          ))}
                          {entries.length > 3 && (
                            <details className="group">
                              <summary className="cursor-pointer text-xs text-primary list-none">
                                <span className="group-open:hidden">Show {entries.length - 3} more</span>
                                <span className="hidden group-open:inline">Show fewer</span>
                              </summary>
                              <div className="space-y-2 mt-2">
                                {entries.slice(3).map((entry) => (
                                  <HistoryRow key={`${entry.timestamp}-${entry.staffId}`} entry={entry} />
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {historyRooms.length > historyLimit && (
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => setHistoryLimit((n) => n + HISTORY_PAGE)}>
                      Show {Math.min(HISTORY_PAGE, historyRooms.length - historyLimit)} more rooms
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const gain = entry.scoreAfter - entry.scoreBefore;

  return (
    <div className="text-sm p-2 bg-muted/80 backdrop-blur-sm rounded flex justify-between items-center">
      <div>
        <div className="font-medium">
          {new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString()}
        </div>
        <div className="text-xs text-muted-foreground">
          Staff: {entry.staffId} • Duration: {entry.duration}min
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs text-muted-foreground">Score</div>
        <div className="font-semibold">
          {entry.scoreBefore} → {entry.scoreAfter}
          <span className={`ml-1 text-xs ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ({gain >= 0 ? '+' : ''}
            {gain})
          </span>
        </div>
      </div>
    </div>
  );
}

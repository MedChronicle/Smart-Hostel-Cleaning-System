import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useHostel } from '../context/HostelContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, History, AlertTriangle, Award } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

export function Analytics() {
  const { rooms, historyMap, staff } = useHostel();
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections(prev => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('[data-animate]');
    elements.forEach(el => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, []);

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    const roomStats = rooms.map(room => {
      const history = historyMap.getHistory(room.id);
      const avgScore = historyMap.getAverageCleanlinessScore(room.id);
      const degradationRate = historyMap.getDegradationRate(room.id);
      const frequency = historyMap.getCleaningFrequency(room.id, 30);

      return {
        roomId: room.id,
        currentScore: room.cleanlinessScore,
        avgScore,
        degradationRate,
        frequency,
        cleaningCount: history.length,
        floor: room.floor
      };
    });

    // Floor-wise statistics
    const floorStats = rooms.reduce((acc, room) => {
      if (!acc[room.floor]) {
        acc[room.floor] = {
          floor: room.floor,
          avgCleanliness: 0,
          roomCount: 0,
          dirtyRooms: 0
        };
      }
      acc[room.floor].avgCleanliness += room.cleanlinessScore;
      acc[room.floor].roomCount++;
      if (room.cleanlinessScore < 70) {
        acc[room.floor].dirtyRooms++;
      }
      return acc;
    }, {} as Record<number, any>);

    const floorData = Object.values(floorStats).map((stat: any) => ({
      ...stat,
      avgCleanliness: (stat.avgCleanliness / stat.roomCount).toFixed(1)
    }));

    // Cleanliness distribution
    const distribution = [
      { name: 'Excellent (90-100)', value: rooms.filter(r => r.cleanlinessScore >= 90).length, color: '#22c55e' },
      { name: 'Good (80-89)', value: rooms.filter(r => r.cleanlinessScore >= 80 && r.cleanlinessScore < 90).length, color: '#84cc16' },
      { name: 'Fair (70-79)', value: rooms.filter(r => r.cleanlinessScore >= 70 && r.cleanlinessScore < 80).length, color: '#eab308' },
      { name: 'Poor (60-69)', value: rooms.filter(r => r.cleanlinessScore >= 60 && r.cleanlinessScore < 70).length, color: '#f97316' },
      { name: 'Critical (<60)', value: rooms.filter(r => r.cleanlinessScore < 60).length, color: '#ef4444' }
    ];

    // High degradation rooms (predictive analysis)
    const highDegradationRooms = roomStats
      .filter(r => r.degradationRate > 5)
      .sort((a, b) => b.degradationRate - a.degradationRate)
      .slice(0, 10);

    // Most cleaned rooms
    const mostCleanedRooms = roomStats
      .sort((a, b) => b.cleaningCount - a.cleaningCount)
      .slice(0, 10);

    // Cleaning trend over time
    const allHistory = Array.from(historyMap.getAllHistory().entries())
      .flatMap(([roomId, entries]) => 
        entries.map(e => ({ ...e, roomId }))
      )
      .sort((a, b) => a.timestamp - b.timestamp);

    // Group by day
    const dailyStats = allHistory.reduce((acc, entry) => {
      const date = new Date(entry.timestamp).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = {
          date,
          count: 0,
          avgScoreBefore: 0,
          avgScoreAfter: 0,
          totalDuration: 0
        };
      }
      acc[date].count++;
      acc[date].avgScoreBefore += entry.scoreBefore;
      acc[date].avgScoreAfter += entry.scoreAfter;
      acc[date].totalDuration += entry.duration;
      return acc;
    }, {} as Record<string, any>);

    const trendData = Object.values(dailyStats).map((stat: any) => ({
      date: stat.date,
      cleanings: stat.count,
      avgBefore: (stat.avgScoreBefore / stat.count).toFixed(1),
      avgAfter: (stat.avgScoreAfter / stat.count).toFixed(1),
      avgDuration: (stat.totalDuration / stat.count).toFixed(1)
    }));

    return {
      roomStats,
      floorData,
      distribution,
      highDegradationRooms,
      mostCleanedRooms,
      trendData
    };
  }, [rooms, historyMap]);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div
        id="metrics"
        data-animate
        className={`grid grid-cols-1 md:grid-cols-4 gap-4 transition-all duration-700 ${
          visibleSections.has('metrics') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border-blue-200 dark:border-blue-800 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cleanings</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.roomStats.reduce((acc, r) => acc + r.cleaningCount, 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border-purple-200 dark:border-purple-800 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cleanliness</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(rooms.reduce((acc, r) => acc + r.cleanlinessScore, 0) / rooms.length).toFixed(1)}
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border-orange-200 dark:border-orange-800 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rooms at Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analyticsData.highDegradationRooms.length}
            </div>
            <p className="text-xs text-muted-foreground">High degradation rate</p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border-green-200 dark:border-green-800 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.roomStats.reduce((max, r) => r.avgScore > max.avgScore ? r : max, analyticsData.roomStats[0])?.roomId || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Best avg score</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="predictive">Predictive</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          {/* Floor-wise Statistics */}
          <Card
            id="floor-stats"
            data-animate
            className={`backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl transition-all duration-700 ${
              visibleSections.has('floor-stats') ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
            }`}
          >
            <CardHeader>
              <CardTitle>Floor-wise Cleanliness</CardTitle>
              <CardDescription>Average cleanliness score by floor</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.floorData}>
                  <CartesianGrid key="floor-grid" strokeDasharray="3 3" />
                  <XAxis key="floor-xaxis" dataKey="floor" label={{ value: 'Floor', position: 'insideBottom', offset: -5 }} />
                  <YAxis key="floor-yaxis" label={{ value: 'Avg Cleanliness', angle: -90, position: 'insideLeft' }} />
                  <Tooltip key="floor-tooltip" />
                  <Legend key="floor-legend" />
                  <Bar key="floor-avg" dataKey="avgCleanliness" fill="#3b82f6" name="Avg Cleanliness" />
                  <Bar key="floor-dirty" dataKey="dirtyRooms" fill="#ef4444" name="Dirty Rooms" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cleaning Trend */}
          <Card
            id="cleaning-trend"
            data-animate
            className={`backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl transition-all duration-700 ${
              visibleSections.has('cleaning-trend') ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
            }`}
          >
            <CardHeader>
              <CardTitle>Cleaning Trend Over Time</CardTitle>
              <CardDescription>Daily cleaning activities and score improvements</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.trendData}>
                  <CartesianGrid key="trend-grid" strokeDasharray="3 3" />
                  <XAxis key="trend-xaxis" dataKey="date" />
                  <YAxis key="trend-yaxis" />
                  <Tooltip key="trend-tooltip" />
                  <Legend key="trend-legend" />
                  <Line key="trend-cleanings" type="monotone" dataKey="cleanings" stroke="#8b5cf6" name="# of Cleanings" />
                  <Line key="trend-before" type="monotone" dataKey="avgBefore" stroke="#ef4444" name="Avg Before" />
                  <Line key="trend-after" type="monotone" dataKey="avgAfter" stroke="#22c55e" name="Avg After" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card
              id="distribution-pie"
              data-animate
              className={`backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl transition-all duration-700 ${
                visibleSections.has('distribution-pie') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
            >
              <CardHeader>
                <CardTitle>Cleanliness Distribution</CardTitle>
                <CardDescription>Room distribution by cleanliness score</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      key="distribution-pie"
                      data={analyticsData.distribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analyticsData.distribution.map((entry, index) => (
                        <Cell key={`pie-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip key="dist-pie-tooltip" />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card
              id="distribution-bar"
              data-animate
              className={`backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl transition-all duration-700 ${
                visibleSections.has('distribution-bar') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
            >
              <CardHeader>
                <CardTitle>Cleanliness Breakdown</CardTitle>
                <CardDescription>Number of rooms in each category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.distribution}>
                    <CartesianGrid key="dist-bar-grid" strokeDasharray="3 3" />
                    <XAxis
                      key="dist-bar-xaxis"
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis key="dist-bar-yaxis" />
                    <Tooltip key="dist-bar-tooltip" />
                    <Bar key="distribution-bar" dataKey="value" name="Rooms">
                      {analyticsData.distribution.map((entry, index) => (
                        <Cell key={`bar-cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card
            id="most-cleaned"
            data-animate
            className={`backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl transition-all duration-700 ${
              visibleSections.has('most-cleaned') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            <CardHeader>
              <CardTitle>Most Cleaned Rooms</CardTitle>
              <CardDescription>Rooms with highest cleaning frequency</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {analyticsData.mostCleanedRooms.map((room, index) => (
                  <div key={room.roomId} className="flex items-center justify-between p-2 border rounded backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 hover:scale-102 transition-all">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="font-semibold">Room {room.roomId}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {room.cleaningCount} cleanings
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictive" className="space-y-4">
          <Card
            id="predictive-analysis"
            data-animate
            className={`backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl transition-all duration-700 ${
              visibleSections.has('predictive-analysis') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-500" />
                Clean & Green Rooms
              </CardTitle>
              <CardDescription>
                Rooms maintaining excellent cleanliness (score ≥ 80)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  const cleanRooms = rooms.filter(room => room.cleanlinessScore >= 80);

                  if (cleanRooms.length === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No clean rooms found</p>
                      </div>
                    );
                  }

                  return cleanRooms
                    .sort((a, b) => b.cleanlinessScore - a.cleanlinessScore)
                    .map((room, index) => (
                      <div
                        key={room.id}
                        className="flex items-center justify-between p-4 border rounded-lg backdrop-blur-sm bg-green-50/80 dark:bg-green-950/80 hover:scale-102 transition-all duration-200"
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
                          <div className="font-bold text-green-600">
                            {room.cleanlinessScore}/100
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {Math.floor((Date.now() - room.lastCleaned) / (1000 * 60 * 60))}h since cleaned
                          </div>
                        </div>
                      </div>
                    ));
                })()}
              </div>

              <div className="mt-6 p-4 backdrop-blur-sm bg-green-50/80 dark:bg-green-950/80 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-semibold text-sm mb-2 text-green-900 dark:text-green-100">
                  Summary:
                </h4>
                <ul className="text-sm space-y-1 text-green-800 dark:text-green-200">
                  <li>• Total clean rooms: {rooms.filter(r => r.cleanlinessScore >= 80).length} out of {rooms.length}</li>
                  <li>• Percentage: {((rooms.filter(r => r.cleanlinessScore >= 80).length / rooms.length) * 100).toFixed(1)}% of all rooms</li>
                  <li>• These rooms are maintaining excellent standards</li>
                  <li>• Continue current cleaning schedule for these rooms</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {/* Active Cleaning Tasks */}
          {staff.some(s => s.status === 'busy' && s.currentTask) && (
            <Card
              id="active-tasks"
              data-animate
              className={`backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl transition-all duration-700 border-orange-200 dark:border-orange-800 ${
                visibleSections.has('active-tasks') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  Active Cleaning Tasks
                </CardTitle>
                <CardDescription>Rooms currently being cleaned by staff</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {staff
                    .filter(s => s.status === 'busy' && s.currentTask)
                    .map(staffMember => {
                      const room = rooms.find(r => r.id === staffMember.currentTask);
                      if (!room) return null;

                      return (
                        <div
                          key={staffMember.id}
                          className="border rounded-lg p-4 backdrop-blur-sm bg-orange-50/80 dark:bg-orange-950/80 hover:scale-102 transition-all duration-200"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold">Room {room.id}</h4>
                              <p className="text-xs text-muted-foreground">
                                Floor {room.floor} • Current Score: {room.cleanlinessScore}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Staff: {staffMember.name} ({staffMember.id})
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

          {/* Cleaned Rooms History */}
          <Card
            id="history-hashmap"
            data-animate
            className={`backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl transition-all duration-700 ${
              visibleSections.has('history-hashmap') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <CardHeader>
              <CardTitle>Cleaned Rooms History</CardTitle>
              <CardDescription>Rooms that have been cleaned with their detailed records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {rooms
                  .filter(room => {
                    const history = historyMap.getHistory(room.id);
                    return history.length > 0;
                  })
                  .map(room => {
                    const history = historyMap.getHistory(room.id);
                    return (
                      <div key={room.id} className="border rounded-lg p-4 backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 hover:scale-102 transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">Room {room.id}</h4>
                            <p className="text-xs text-muted-foreground">Floor {room.floor} • Current Score: {room.cleanlinessScore}</p>
                          </div>
                          <Badge>{history.length} cleanings</Badge>
                        </div>
                        <div className="space-y-2">
                          {history.slice(-3).reverse().map((entry, index) => (
                            <div key={index} className="text-sm p-2 bg-muted/80 backdrop-blur-sm rounded flex justify-between items-center">
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
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                {rooms.filter(room => historyMap.getHistory(room.id).length > 0).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No rooms have been cleaned yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

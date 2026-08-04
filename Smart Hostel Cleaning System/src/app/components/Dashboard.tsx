import React, { useState, useEffect } from 'react';
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
  Play
} from 'lucide-react';
import { calculateUrgency } from '../utils/data-structures';
import { SimulationControls } from './SimulationControls';

export function Dashboard() {
  const { 
    priorityQueue, 
    staffQueue, 
    rooms, 
    staff, 
    assignTask,
    refreshPriorityQueue 
  } = useHostel();

  const [queueItems, setQueueItems] = useState<Array<{ priority: number; item: string }>>([]);
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setQueueItems(priorityQueue.getAll());
      setAvailableStaff(staffQueue.getAll());
    }, 1000);

    return () => clearInterval(interval);
  }, [priorityQueue, staffQueue]);

  const getCleanlinessColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getUrgencyColor = (urgency: number) => {
    if (urgency >= 100) return 'text-red-600';
    if (urgency >= 70) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const dirtyRooms = rooms.filter(r => r.cleanlinessScore < 70).length;
  const averageCleanliness = rooms.reduce((acc, r) => acc + r.cleanlinessScore, 0) / rooms.length;
  const busyStaff = staff.filter(s => s.status === 'busy').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border-blue-200 dark:border-blue-800 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rooms.length}</div>
            <p className="text-xs text-muted-foreground">
              {dirtyRooms} need cleaning
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border-purple-200 dark:border-purple-800 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cleanliness</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageCleanliness.toFixed(1)}</div>
            <Progress value={averageCleanliness} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border-pink-200 dark:border-pink-800 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Available</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staff.length - busyStaff}/{staff.length}</div>
            <p className="text-xs text-muted-foreground">
              {busyStaff} currently busy
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border-green-200 dark:border-green-800 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Priority Queue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueItems.length}</div>
            <p className="text-xs text-muted-foreground">
              Pending tasks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Priority Queue and Staff Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Queue */}
        <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Priority Queue (Max Heap)</CardTitle>
            <Button onClick={refreshPriorityQueue} variant="outline" size="sm" className="backdrop-blur-sm">
              <Sparkles className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {queueItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>All rooms are clean!</p>
                </div>
              ) : (
                queueItems.map((item, index) => {
                  const room = rooms.find(r => r.id === item.item);
                  if (!room) return null;

                  return (
                    <div
                      key={`${item.item}-${index}`}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 hover:scale-102 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="font-mono font-semibold">Room {room.id}</span>
                          <span className="text-xs text-muted-foreground">
                            Floor {room.floor}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={room.occupancyStatus ? "default" : "secondary"}>
                            {room.occupancyStatus ? 'Occupied' : 'Vacant'}
                          </Badge>
                          {room.studentRequestBoost && (
                            <Badge variant="destructive">Requested</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className={`font-bold ${getUrgencyColor(item.priority)}`}>
                            U: {item.priority.toFixed(1)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Score: {room.cleanlinessScore}
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${getCleanlinessColor(room.cleanlinessScore)}`} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Staff Queue */}
        <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl border-pink-200 dark:border-pink-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Staff Queue (FIFO)</CardTitle>
            <Button
              onClick={assignTask}
              disabled={availableStaff.length === 0 || queueItems.length === 0}
              size="sm"
              className="backdrop-blur-sm"
            >
              <Play className="h-4 w-4 mr-2" />
              Assign Task
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {/* Available Staff */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-green-600">Available ({availableStaff.length})</h4>
                {availableStaff.map((member, index) => (
                  <div
                    key={`${member.id}-${index}`}
                    className="flex items-center justify-between p-3 border rounded-lg mb-2 bg-green-50 dark:bg-green-950 backdrop-blur-sm hover:scale-102 transition-all duration-200"
                  >
                    <div>
                      <div className="font-semibold">{member.name}</div>
                      <div className="text-xs text-muted-foreground">
                        ID: {member.id}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">
                        {member.tasksCompleted} tasks
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {member.efficiency}% efficiency
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Busy Staff */}
              {staff.filter(s => s.status === 'busy').length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-orange-600">
                    Busy ({staff.filter(s => s.status === 'busy').length})
                  </h4>
                  {staff.filter(s => s.status === 'busy').map(member => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-lg mb-2 bg-orange-50 dark:bg-orange-950 backdrop-blur-sm hover:scale-102 transition-all duration-200"
                    >
                      <div>
                        <div className="font-semibold">{member.name}</div>
                        <div className="text-xs text-muted-foreground">
                          ID: {member.id}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          Room {member.currentTask}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle>DSA Implementation Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-orange-500" />
            <div>
              <strong>Priority Queue (Max Heap):</strong> Urgency = (100 - cleanliness) + (hours × 2) + (occupied bonus: 20) + (request boost: 30)
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 mt-0.5 text-blue-500" />
            <div>
              <strong>Staff Queue (FIFO):</strong> Available staff are assigned in order. After completing a task, they re-enter the queue.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 mt-0.5 text-purple-500" />
            <div>
              <strong>Graph Structure:</strong> Rooms are nodes with adjacency relationships. BFS/Dijkstra finds optimal cleaning paths.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simulation Controls */}
      <SimulationControls />
    </div>
  );
}
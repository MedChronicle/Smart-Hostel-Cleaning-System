import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  BookOpen, 
  Activity, 
  Network, 
  Users, 
  Database,
  TrendingUp,
  Zap
} from 'lucide-react';

export function QuickGuide() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            System Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            This system demonstrates how Data Structures & Algorithms solve real-world hostel cleaning 
            and resource optimization challenges. Navigate through different sections to explore each DSA concept.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold">Priority Queue</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Max heap implementation schedules tasks by urgency score. Automatically prioritizes 
                dirty rooms, student requests, and occupied spaces.
              </p>
              <Badge variant="outline">O(log n) operations</Badge>
            </div>

            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Network className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">Graph Structure</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Rooms as nodes with adjacency edges. BFS finds optimal cleaning paths. Dijkstra 
                calculates shortest routes between any two rooms.
              </p>
              <Badge variant="outline">O(V + E) traversal</Badge>
            </div>

            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold">Staff Queue</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                FIFO queue ensures fair task distribution. Staff members are assigned in order 
                and re-enter the queue after completing tasks.
              </p>
              <Badge variant="outline">O(1) enqueue/dequeue</Badge>
            </div>

            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold">History HashMap</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Tracks complete cleaning history per room. Enables analytics, degradation rate 
                calculation, and predictive insights.
              </p>
              <Badge variant="outline">O(1) lookup</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-6 w-6" />
            Quick Start Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold">Dashboard - View Live System State</h4>
                <p className="text-sm text-muted-foreground">
                  Monitor the priority queue (max heap) and staff queue (FIFO). Use the simulation 
                  mode to auto-run the system and watch DSA concepts in action.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold">Room Graph - Explore Spatial Relationships</h4>
                <p className="text-sm text-muted-foreground">
                  Click on rooms to see their adjacency relationships. BFS algorithm calculates 
                  optimal cleaning paths through dirty adjacent rooms.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold">Student Request - Submit Priority Tasks</h4>
                <p className="text-sm text-muted-foreground">
                  Test the priority queue by submitting cleaning requests. Room urgency is 
                  recalculated with +30 boost and re-inserted into the heap.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                4
              </div>
              <div>
                <h4 className="font-semibold">Staff View - Complete Tasks</h4>
                <p className="text-sm text-muted-foreground">
                  Mark tasks as complete with QR verification. Updates room scores, logs to 
                  HashMap, and returns staff to the queue.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                5
              </div>
              <div>
                <h4 className="font-semibold">Analytics - Historical Insights</h4>
                <p className="text-sm text-muted-foreground">
                  View HashMap data visualizations. Predictive analysis identifies high-risk rooms 
                  using degradation rate calculations.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Key Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
              <div>
                <strong>Real-time Updates:</strong> Live priority queue and staff status changes
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
              <div>
                <strong>BFS Pathfinding:</strong> Optimal traversal through adjacent dirty rooms
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-purple-500 mt-2" />
              <div>
                <strong>QR Verification:</strong> Scan codes to complete tasks and update scores
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2" />
              <div>
                <strong>Predictive Analysis:</strong> Identify high-risk rooms before they degrade
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />
              <div>
                <strong>LocalStorage Persistence:</strong> State survives page refreshes
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2" />
              <div>
                <strong>Auto-Simulation:</strong> Watch the system operate autonomously
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-2 border-primary/20">
        <CardHeader>
          <CardTitle>Educational Value</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            This project demonstrates how theoretical DSA concepts solve practical problems:
          </p>
          <ul className="space-y-1 ml-4">
            <li>• <strong>Priority Queues</strong> optimize task scheduling in resource-constrained environments</li>
            <li>• <strong>Graph Algorithms</strong> minimize travel distance and optimize routing</li>
            <li>• <strong>FIFO Queues</strong> ensure fairness in workload distribution</li>
            <li>• <strong>HashMaps</strong> enable O(1) data retrieval for analytics and predictions</li>
            <li>• <strong>Time Complexity</strong> matters in real-time systems with performance requirements</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

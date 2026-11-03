import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import {
  BookOpen,
  Activity,
  Network,
  Users,
  Database,
  TrendingUp,
  Zap,
  Search,
  ChevronDown,
  Check,
  RotateCcw,
  ArrowRight,
  Code2,
  Timer,
  HelpCircle,
  X,
} from 'lucide-react';

type GuideTab = 'concepts' | 'start' | 'complexity' | 'faq';

interface Operation {
  name: string;
  complexity: string;
  note: string;
}

interface Concept {
  id: string;
  title: string;
  structure: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  summary: string;
  badge: string;
  usedFor: string[];
  operations: Operation[];
  snippet: string;
}

interface Step {
  id: string;
  title: string;
  target: string;
  description: string;
}

interface QuickGuideProps {
  onNavigate?: (target: string) => void;
}

const STORAGE_KEY = 'hostel-quick-guide-progress';

const CONCEPTS: Concept[] = [
  {
    id: 'priority-queue',
    title: 'Priority Queue',
    structure: 'Max heap',
    icon: Activity,
    iconClass: 'text-orange-500',
    summary:
      'A max heap schedules tasks by urgency score. Dirty rooms, student requests and occupied spaces rise to the top automatically.',
    badge: 'O(log n) operations',
    usedFor: ['Choosing the next room to clean', 'Re-ranking a room after a student request', 'Draining the queue as staff become free'],
    operations: [
      { name: 'Insert', complexity: 'O(log n)', note: 'Append, then sift up' },
      { name: 'Extract max', complexity: 'O(log n)', note: 'Swap root with last, sift down' },
      { name: 'Peek', complexity: 'O(1)', note: 'Read the root' },
      { name: 'Build from n rooms', complexity: 'O(n)', note: 'Bottom-up heapify' },
    ],
    snippet: `function siftUp(heap, i) {
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (heap[parent].urgency >= heap[i].urgency) break;
    [heap[parent], heap[i]] = [heap[i], heap[parent]];
    i = parent;
  }
}`,
  },
  {
    id: 'graph',
    title: 'Graph Structure',
    structure: 'Adjacency list',
    icon: Network,
    iconClass: 'text-blue-500',
    summary:
      'Rooms are nodes and adjacency is an edge. BFS finds cleaning paths through nearby dirty rooms and Dijkstra gives the shortest route between any two rooms.',
    badge: 'O(V + E) traversal',
    usedFor: ['Grouping nearby dirty rooms into one trip', 'Minimizing walking distance for staff', 'Exploring neighbours of a selected room'],
    operations: [
      { name: 'Add edge', complexity: 'O(1)', note: 'Push onto both adjacency lists' },
      { name: 'BFS', complexity: 'O(V + E)', note: 'Level by level from the start room' },
      { name: 'Dijkstra (binary heap)', complexity: 'O((V + E) log V)', note: 'Shortest weighted route' },
      { name: 'Neighbour lookup', complexity: 'O(deg)', note: 'Read one adjacency list' },
    ],
    snippet: `function bfs(graph, start, limit) {
  const seen = new Set([start]);
  const queue = [start];
  const order = [];
  while (queue.length && order.length < limit) {
    const id = queue.shift();
    order.push(id);
    for (const next of graph.get(id)) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return order;
}`,
  },
  {
    id: 'staff-queue',
    title: 'Staff Queue',
    structure: 'FIFO queue',
    icon: Users,
    iconClass: 'text-green-500',
    summary:
      'A FIFO queue keeps workload fair. Staff are assigned in order and rejoin the back of the queue after finishing a task.',
    badge: 'O(1) enqueue/dequeue',
    usedFor: ['Rotating tasks evenly across staff', 'Returning staff to the pool after completion', 'Showing who is next in line'],
    operations: [
      { name: 'Enqueue', complexity: 'O(1)', note: 'Add to the tail' },
      { name: 'Dequeue', complexity: 'O(1)', note: 'Remove from the head with a linked list or ring buffer' },
      { name: 'Peek front', complexity: 'O(1)', note: 'Who is next' },
      { name: 'Size', complexity: 'O(1)', note: 'Tracked counter' },
    ],
    snippet: `class StaffQueue {
  constructor() {
    this.items = [];
    this.head = 0;
  }
  enqueue(staff) {
    this.items.push(staff);
  }
  dequeue() {
    if (this.head >= this.items.length) return undefined;
    return this.items[this.head++];
  }
}`,
  },
  {
    id: 'hashmap',
    title: 'History HashMap',
    structure: 'Hash table',
    icon: Database,
    iconClass: 'text-purple-500',
    summary:
      'Each room id maps to its cleaning history. This powers analytics, degradation rates and predictions of which rooms will need attention next.',
    badge: 'O(1) lookup',
    usedFor: ['Reading a room history instantly', 'Computing how fast a room gets dirty', 'Ranking high-risk rooms'],
    operations: [
      { name: 'Get / Set by room id', complexity: 'O(1) average', note: 'O(n) worst case with heavy collisions' },
      { name: 'Append a record', complexity: 'O(1) amortized', note: 'Push onto the room array' },
      { name: 'Degradation rate', complexity: 'O(k)', note: 'k = records for that room' },
      { name: 'Scan all rooms', complexity: 'O(n)', note: 'Used for analytics dashboards' },
    ],
    snippet: `function degradationRate(history) {
  if (history.length < 2) return 0;
  const first = history[0];
  const last = history[history.length - 1];
  const hours = (last.time - first.time) / 3600000;
  return hours === 0 ? 0 : (first.score - last.score) / hours;
}`,
  },
];

const STEPS: Step[] = [
  {
    id: 'dashboard',
    title: 'Dashboard: view live system state',
    target: 'dashboard',
    description:
      'Monitor the priority queue (max heap) and the staff queue (FIFO). Use Quick Actions and auto-assign to run the system and watch each structure change.',
  },
  {
    id: 'graph',
    title: 'Room Graph: explore spatial relationships',
    target: 'graph',
    description:
      'Select a room to see its neighbours. BFS builds a cleaning path through adjacent dirty rooms, drawn in purple with the visit order.',
  },
  {
    id: 'request',
    title: 'Student Request: submit a priority task',
    target: 'request',
    description:
      'Submit a request and watch the room urgency get a +30 boost and re-enter the heap, moving it toward the front of the queue.',
  },
  {
    id: 'staff',
    title: 'Staff View: complete tasks',
    target: 'staff',
    description:
      'Complete a task with QR verification. The room score updates, the event is logged to the HashMap and the staff member returns to the queue.',
  },
  {
    id: 'analytics',
    title: 'Analytics: historical insights',
    target: 'analytics',
    description:
      'Review HashMap-backed charts. Predictive analysis uses degradation rates to flag rooms likely to get dirty first.',
  },
];

const FEATURES = [
  { dot: 'bg-green-500', title: 'Real-time Updates', text: 'Live priority queue and staff status changes' },
  { dot: 'bg-blue-500', title: 'BFS Pathfinding', text: 'Optimal traversal through adjacent dirty rooms' },
  { dot: 'bg-purple-500', title: 'QR Verification', text: 'Scan codes to complete tasks and update scores' },
  { dot: 'bg-orange-500', title: 'Predictive Analysis', text: 'Identify high-risk rooms before they degrade' },
  { dot: 'bg-red-500', title: 'LocalStorage Persistence', text: 'State survives page refreshes' },
  { dot: 'bg-yellow-500', title: 'Auto-Simulation', text: 'Watch the system operate autonomously' },
];

const FAQ = [
  {
    q: 'Why a max heap and not a sorted array?',
    a: 'A sorted array makes every insert O(n) because elements shift. A heap keeps insert and extract at O(log n), which matters when urgency changes often.',
  },
  {
    q: 'What happens when a student submits a request?',
    a: 'The room urgency is recalculated with a +30 boost and the room is re-inserted into the heap, so it can jump ahead of rooms that were waiting longer.',
  },
  {
    q: 'Why does BFS give a good cleaning path?',
    a: 'BFS visits the closest rooms first, so each hop stays short. It does not guarantee the minimum total walking distance across all rooms, which would be a travelling-salesman problem.',
  },
  {
    q: 'When would Dijkstra beat BFS here?',
    a: 'When edges have different costs, such as stairs versus a corridor. BFS counts hops only, while Dijkstra minimizes total weight.',
  },
  {
    q: 'Is the FIFO staff queue really fair?',
    a: 'It equalizes how often each person is picked, not how heavy each task is. A weighted or load-aware queue would be the next step.',
  },
  {
    q: 'Where is my data stored?',
    a: 'In your browser LocalStorage. Clearing site data resets rooms, history and progress.',
  },
];

const GLOSSARY = [
  { term: 'Urgency score', meaning: 'A number combining dirtiness, occupancy and student requests, used as the heap key.' },
  { term: 'Sift up / down', meaning: 'Swapping a heap element with its parent or child until the heap property holds again.' },
  { term: 'Adjacency list', meaning: 'For each room, the list of rooms directly connected to it.' },
  { term: 'Degradation rate', meaning: 'Average cleanliness points lost per hour since the last cleaning.' },
  { term: 'Amortized cost', meaning: 'Average cost per operation across a long sequence, even if some single steps are expensive.' },
];

const loadProgress = (): string[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

const saveProgress = (ids: string[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    return;
  }
};

export function QuickGuide({ onNavigate }: QuickGuideProps) {
  const [tab, setTab] = useState<GuideTab>('concepts');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['priority-queue']));
  const [completed, setCompleted] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCompleted(loadProgress());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveProgress(completed);
  }, [completed, loaded]);

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleStep = (id: string) => {
    setCompleted((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const filteredConcepts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CONCEPTS;
    return CONCEPTS.filter((c) =>
      [c.title, c.structure, c.summary, c.badge, ...c.usedFor, ...c.operations.map((o) => o.name)]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [query]);

  const progress = Math.round((completed.length / STEPS.length) * 100);
  const nextStep = STEPS.find((s) => !completed.includes(s.id));

  const copySnippet = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              System Overview
            </CardTitle>
            <Tabs value={tab} onValueChange={(v) => setTab(v as GuideTab)}>
              <TabsList>
                <TabsTrigger value="concepts">Concepts</TabsTrigger>
                <TabsTrigger value="start">Quick Start</TabsTrigger>
                <TabsTrigger value="complexity">Complexity</TabsTrigger>
                <TabsTrigger value="faq">FAQ</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            This system demonstrates how Data Structures and Algorithms solve real hostel cleaning and resource
            optimization challenges. Each concept below maps to a part of the app you can try yourself.
          </p>

          {tab === 'concepts' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-48">
                  <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search concepts, operations or complexity"
                    aria-label="Search concepts"
                    className="h-9 w-full rounded-md border bg-background pl-8 pr-8 text-sm"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      aria-label="Clear search"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setExpanded(expanded.size === CONCEPTS.length ? new Set() : new Set(CONCEPTS.map((c) => c.id)))
                  }
                >
                  {expanded.size === CONCEPTS.length ? 'Collapse all' : 'Expand all'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredConcepts.map((concept) => {
                  const Icon = concept.icon;
                  const isOpen = expanded.has(concept.id);

                  return (
                    <div key={concept.id} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleExpanded(concept.id)}
                        aria-expanded={isOpen}
                        aria-controls={`concept-${concept.id}`}
                        className="w-full p-4 space-y-2 text-left hover:bg-accent/40 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-5 w-5 ${concept.iconClass}`} />
                            <h3 className="font-semibold">{concept.title}</h3>
                            <Badge variant="secondary">{concept.structure}</Badge>
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">{concept.summary}</p>
                        <Badge variant="outline">{concept.badge}</Badge>
                      </button>

                      {isOpen && (
                        <div id={`concept-${concept.id}`} className="border-t p-4 space-y-4 bg-muted/30">
                          <div>
                            <div className="text-xs font-semibold mb-1">Used in this app for</div>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {concept.usedFor.map((item) => (
                                <li key={item}>• {item}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <div className="text-xs font-semibold mb-1">Operations</div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <tbody>
                                  {concept.operations.map((op) => (
                                    <tr key={op.name} className="border-b last:border-0">
                                      <td className="py-1 pr-2 font-medium">{op.name}</td>
                                      <td className="py-1 pr-2 font-mono whitespace-nowrap">{op.complexity}</td>
                                      <td className="py-1 text-muted-foreground">{op.note}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs font-semibold flex items-center gap-1">
                                <Code2 className="h-3.5 w-3.5" />
                                Core idea in code
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                                onClick={() => copySnippet(concept.snippet)}
                              >
                                Copy
                              </Button>
                            </div>
                            <pre className="text-xs overflow-x-auto rounded-md border bg-background p-3">
                              <code>{concept.snippet}</code>
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {filteredConcepts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">No concepts match "{query}"</div>
              )}
            </div>
          )}

          {tab === 'start' && (
            <div className="space-y-4">
              <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">
                    {completed.length} of {STEPS.length} steps done
                  </span>
                  <span className="tabular-nums">{progress}%</span>
                </div>
                <div
                  className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Quick start progress"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {nextStep ? `Up next: ${nextStep.title.split(':')[0]}` : 'All steps complete'}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2"
                    onClick={() => setCompleted([])}
                    disabled={completed.length === 0}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Reset
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {STEPS.map((step, index) => {
                  const done = completed.includes(step.id);

                  return (
                    <div
                      key={step.id}
                      className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${done ? 'bg-green-50/60 dark:bg-green-950/30' : ''}`}
                    >
                      <button
                        onClick={() => toggleStep(step.id)}
                        role="checkbox"
                        aria-checked={done}
                        aria-label={`Mark step ${index + 1} as ${done ? 'not done' : 'done'}`}
                        className={`flex items-center justify-center w-6 h-6 shrink-0 rounded-full text-sm font-bold border-2 transition-colors ${
                          done
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'bg-primary border-primary text-primary-foreground'
                        }`}
                      >
                        {done ? <Check className="h-4 w-4" /> : index + 1}
                      </button>
                      <div className="flex-1">
                        <h4 className={`font-semibold ${done ? 'line-through opacity-70' : ''}`}>{step.title}</h4>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                      {onNavigate && (
                        <Button size="sm" variant="outline" onClick={() => onNavigate(step.target)}>
                          Open
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'complexity' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Timer className="h-4 w-4" />
                Operation cost cheat sheet
              </div>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="p-2">Structure</th>
                      <th className="p-2">Operation</th>
                      <th className="p-2">Cost</th>
                      <th className="p-2 hidden md:table-cell">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CONCEPTS.flatMap((concept) =>
                      concept.operations.map((op, i) => (
                        <tr key={`${concept.id}-${op.name}`} className="border-t">
                          <td className="p-2 font-medium whitespace-nowrap">{i === 0 ? concept.title : ''}</td>
                          <td className="p-2">{op.name}</td>
                          <td className="p-2 font-mono whitespace-nowrap">{op.complexity}</td>
                          <td className="p-2 text-muted-foreground hidden md:table-cell">{op.note}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="p-2 border rounded text-center">
                  <div className="font-mono font-bold text-green-600">O(1)</div>
                  <div className="text-muted-foreground">Constant</div>
                </div>
                <div className="p-2 border rounded text-center">
                  <div className="font-mono font-bold text-blue-600">O(log n)</div>
                  <div className="text-muted-foreground">Halves each step</div>
                </div>
                <div className="p-2 border rounded text-center">
                  <div className="font-mono font-bold text-orange-600">O(n)</div>
                  <div className="text-muted-foreground">Touch every item</div>
                </div>
                <div className="p-2 border rounded text-center">
                  <div className="font-mono font-bold text-red-600">O(n log n)</div>
                  <div className="text-muted-foreground">Sorting everything</div>
                </div>
              </div>
            </div>
          )}

          {tab === 'faq' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <HelpCircle className="h-4 w-4" />
                  Frequently asked questions
                </div>
                {FAQ.map((item) => (
                  <details key={item.q} className="group border rounded-lg p-3">
                    <summary className="cursor-pointer font-medium text-sm list-none flex items-center justify-between">
                      {item.q}
                      <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="text-sm text-muted-foreground mt-2">{item.a}</p>
                  </details>
                ))}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold">Glossary</div>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {GLOSSARY.map((entry) => (
                    <div key={entry.term} className="border rounded-lg p-3">
                      <dt className="text-sm font-semibold">{entry.term}</dt>
                      <dd className="text-sm text-muted-foreground">{entry.meaning}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}
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
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-start gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${feature.dot}`} />
                <div>
                  <strong>{feature.title}:</strong> {feature.text}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Educational Value
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>This project demonstrates how theoretical DSA concepts solve practical problems:</p>
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

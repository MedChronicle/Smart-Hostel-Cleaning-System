import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Code,
  Database,
  ListOrdered,
  Layers,
  Network,
  PlayCircle,
  Radio,
  Route,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router';

const STORAGE_KEY = 'welcomeDialog:v2';
const LEGACY_KEY = 'hasSeenWelcome';
const SESSION_KEY = 'welcomeDialog:v2:session';
const OPEN_EVENT = 'welcome-dialog:open';

interface Concept {
  id: string;
  badge: string;
  title: string;
  short: string;
  detail: string;
  complexity: string;
  icon: LucideIcon;
}

interface Highlight {
  id: string;
  lead: string;
  text: string;
}

interface StepDef {
  id: string;
  label: string;
}

const CONCEPTS: Concept[] = [
  {
    id: 'heap',
    badge: 'DSA',
    title: 'Priority Queue (Max Heap)',
    short: 'Urgency-based scheduling',
    detail:
      'Every dirty room gets an urgency score. The heap always keeps the most urgent room at the top so the next task is picked instantly.',
    complexity: 'Insert O(log n) · Extract O(log n) · Peek O(1)',
    icon: Layers,
  },
  {
    id: 'bfs',
    badge: 'DSA',
    title: 'Graph Traversal (BFS)',
    short: 'Adjacent room discovery',
    detail:
      'Rooms are nodes and adjacency are edges. BFS expands level by level to group neighbouring dirty rooms into one efficient cleaning round.',
    complexity: 'O(V + E)',
    icon: Network,
  },
  {
    id: 'dijkstra',
    badge: 'DSA',
    title: "Dijkstra's Algorithm",
    short: 'Shortest cleaning route',
    detail:
      'Weighted edges represent walking cost between rooms and floors. Dijkstra finds the cheapest path so staff waste the least time moving.',
    complexity: 'O((V + E) log V)',
    icon: Route,
  },
  {
    id: 'fifo',
    badge: 'DSA',
    title: 'FIFO Queue',
    short: 'Fair staff rotation',
    detail:
      'Available staff wait in a queue. The staff member who has waited longest receives the next task, keeping workload balanced.',
    complexity: 'Enqueue O(1) · Dequeue O(1)',
    icon: ListOrdered,
  },
  {
    id: 'hashmap',
    badge: 'DSA',
    title: 'HashMap Storage',
    short: 'Instant history lookup',
    detail:
      'Cleaning history is keyed by room ID, enabling constant-time reads for analytics, trends and predictions.',
    complexity: 'Get O(1) · Put O(1) average',
    icon: Database,
  },
  {
    id: 'realtime',
    badge: 'Real-time',
    title: 'Live Updates',
    short: 'Always in sync',
    detail:
      'Every assignment, completion and student request is reflected across the dashboard the moment it happens.',
    complexity: 'Event-driven',
    icon: Radio,
  },
];

const HIGHLIGHTS: Highlight[] = [
  {
    id: 'rooms',
    lead: '32 rooms',
    text: 'across 4 floors modeled as a graph with adjacency relationships',
  },
  {
    id: 'pq',
    lead: 'Priority queue',
    text: 'automatically schedules cleaning tasks by urgency score',
  },
  {
    id: 'bfs',
    lead: 'BFS algorithm',
    text: 'finds optimal cleaning paths through adjacent dirty rooms',
  },
  {
    id: 'fifo',
    lead: 'FIFO staff queue',
    text: 'ensures fair task distribution among 6 cleaning staff',
  },
  {
    id: 'map',
    lead: 'HashMap',
    text: 'tracks complete cleaning history for analytics and predictions',
  },
];

const STEPS: StepDef[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'concepts', label: 'Concepts' },
  { id: 'start', label: 'Get started' },
];

type StoredState = { seen: boolean; at: number };

function readSeen(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (window.sessionStorage.getItem(SESSION_KEY) === '1') return true;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredState>;
      if (parsed && parsed.seen === true) return true;
    }
    if (window.localStorage.getItem(LEGACY_KEY) === 'true') {
      const migrated: StoredState = { seen: true, at: Date.now() };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      window.localStorage.removeItem(LEGACY_KEY);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function persistSeen(permanent: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (permanent) {
      const state: StoredState = { seen: true, at: Date.now() };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      window.sessionStorage.setItem(SESSION_KEY, '1');
    }
  } catch {
    return;
  }
}

export function openWelcomeDialog() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function resetWelcomeDialog() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    return;
  }
}

function StepIndicator({
  steps,
  current,
  onSelect,
}: {
  steps: StepDef[];
  current: number;
  onSelect: (index: number) => void;
}) {
  return (
    <nav aria-label="Welcome steps" className="flex items-center gap-2">
      {steps.map((step, index) => {
        const active = index === current;
        const done = index < current;
        return (
          <React.Fragment key={step.id}>
            <button
              type="button"
              onClick={() => onSelect(index)}
              aria-current={active ? 'step' : undefined}
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : done
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                  active ? 'bg-primary-foreground/20' : 'bg-background/60'
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={`h-px flex-1 ${done ? 'bg-primary/40' : 'bg-border'}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

function OverviewStep() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/20 bg-gradient-to-br from-blue-50 to-purple-50 p-4 dark:from-blue-950 dark:to-purple-950">
        <h3 className="mb-3 font-semibold">What This System Demonstrates</h3>
        <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {CONCEPTS.map((concept) => (
            <li key={concept.id} className="flex items-center gap-2">
              <Badge variant="outline">{concept.badge}</Badge>
              <span>{concept.title}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">Quick Overview</h3>
        <ul className="space-y-2 text-sm">
          {HIGHLIGHTS.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <p>
                <strong>{item.lead}</strong> {item.text}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ConceptsStep() {
  const [activeId, setActiveId] = useState(CONCEPTS[0].id);
  const active = useMemo(
    () => CONCEPTS.find((c) => c.id === activeId) ?? CONCEPTS[0],
    [activeId]
  );
  const ActiveIcon = active.icon;

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div role="tablist" aria-label="Concepts" className="space-y-1.5">
        {CONCEPTS.map((concept) => {
          const Icon = concept.icon;
          const selected = concept.id === activeId;
          return (
            <button
              key={concept.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveId(concept.id)}
              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                selected
                  ? 'border-primary bg-primary/10'
                  : 'border-transparent bg-muted/50 hover:bg-muted'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="min-w-0">
                <span className="block truncate font-medium">{concept.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{concept.short}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        key={active.id}
        className="space-y-3 rounded-lg border border-primary/20 bg-gradient-to-br from-blue-50 to-purple-50 p-4 motion-safe:animate-in motion-safe:fade-in dark:from-blue-950 dark:to-purple-950"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <ActiveIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold leading-tight">{active.title}</h4>
            <Badge variant="outline" className="mt-1">
              {active.badge}
            </Badge>
          </div>
        </div>
        <p className="text-sm leading-relaxed">{active.detail}</p>
        <div className="rounded-md bg-background/70 px-3 py-2 font-mono text-xs">
          {active.complexity}
        </div>
      </div>
    </div>
  );
}

function StartStep({
  onGuide,
  onDashboard,
  onSimulation,
}: {
  onGuide: () => void;
  onDashboard: () => void;
  onSimulation: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
        <h3 className="mb-2 font-semibold text-orange-900 dark:text-orange-100">
          💡 Pro Tip: Try the Auto-Simulation
        </h3>
        <p className="text-sm text-orange-800 dark:text-orange-200">
          Enable simulation mode on the Dashboard to watch the system automatically assign tasks,
          complete cleanings, and handle student requests. It's the best way to see all DSA concepts
          in action!
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Button onClick={onSimulation} className="w-full">
          <PlayCircle className="mr-2 h-4 w-4" />
          Start Simulation
        </Button>
        <Button onClick={onGuide} variant="outline" className="w-full">
          <BookOpen className="mr-2 h-4 w-4" />
          Quick Guide
        </Button>
        <Button onClick={onDashboard} variant="secondary" className="w-full">
          <Code className="mr-2 h-4 w-4" />
          Explore Dashboard
        </Button>
      </div>
    </div>
  );
}

export function WelcomeDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!readSeen()) setOpen(true);
  }, []);

  useEffect(() => {
    const handler = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, []);

  const lastStep = STEPS.length - 1;

  const next = useCallback(() => setStep((s) => Math.min(s + 1, lastStep)), [lastStep]);
  const prev = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const dismiss = useCallback(
    (permanent: boolean) => {
      persistSeen(permanent);
      setOpen(false);
    },
    []
  );

  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (value) {
        setOpen(true);
      } else {
        dismiss(dontShowAgain);
      }
    },
    [dismiss, dontShowAgain]
  );

  const goTo = useCallback(
    (path: string, state?: Record<string, unknown>) => {
      dismiss(true);
      navigate(path, state ? { state } : undefined);
    },
    [dismiss, navigate]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        next();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, next, prev]);

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Welcome to Smart Hostel Cleaning System</DialogTitle>
              <DialogDescription className="text-base">
                A DSA-powered resource optimization platform
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <StepIndicator steps={STEPS} current={step} onSelect={setStep} />

          <div
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={step + 1}
            aria-label="Onboarding progress"
            className="h-1 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300 motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div aria-live="polite" className="min-h-[18rem]">
            {step === 0 && <OverviewStep />}
            {step === 1 && <ConceptsStep />}
            {step === 2 && (
              <StartStep
                onGuide={() => goTo('/guide')}
                onDashboard={() => goTo('/')}
                onSimulation={() => goTo('/', { autoSimulation: true })}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border accent-primary"
              />
              Don't show this again
            </label>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => dismiss(dontShowAgain)}>
                Skip
              </Button>
              <Button variant="outline" size="sm" onClick={prev} disabled={step === 0}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              {step < lastStep ? (
                <Button size="sm" onClick={next}>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button size="sm" onClick={() => goTo('/')}>
                  Finish
                  <Check className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

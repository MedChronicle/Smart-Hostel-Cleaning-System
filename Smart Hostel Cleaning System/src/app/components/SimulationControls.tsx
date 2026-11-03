import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useHostel } from '../context/HostelContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Play, Pause, RotateCcw, Zap, FastForward, Trash2, Activity, Keyboard } from 'lucide-react';
import { toast } from 'sonner';

const SPEEDS = [
  { label: '0.5x', ms: 4000 },
  { label: '1x', ms: 2000 },
  { label: '2x', ms: 1000 },
  { label: '4x', ms: 500 },
];

const MAX_LOG = 50;

const formatTime = (date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function SimulationControls() {
  const { rooms, staff, assignTask, priorityQueue } = useHostel();

  const [autoRunning, setAutoRunning] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [log, setLog] = useState([]);
  const [totalAssigned, setTotalAssigned] = useState(0);
  const [sessionStart, setSessionStart] = useState(null);
  const [now, setNow] = useState(Date.now());

  const availableStaff = staff.filter((s) => s.status === 'available').length;
  const busyStaff = staff.filter((s) => s.status === 'busy').length;
  const totalStaff = staff.length;
  const pendingTasks = priorityQueue.size();
  const utilization = totalStaff === 0 ? 0 : Math.round((busyStaff / totalStaff) * 100);
  const canAssign = pendingTasks > 0 && availableStaff > 0;

  const latest = useRef({ pendingTasks, availableStaff, assignTask });
  useEffect(() => {
    latest.current = { pendingTasks, availableStaff, assignTask };
  }, [pendingTasks, availableStaff, assignTask]);

  const pushLog = useCallback((type, message) => {
    setLog((prev) =>
      [{ id: `${Date.now()}-${Math.random()}`, type, message, time: new Date() }, ...prev].slice(0, MAX_LOG)
    );
  }, []);

  const runAssignment = useCallback(
    (silent = false) => {
      const { pendingTasks: pending, availableStaff: free, assignTask: assign } = latest.current;

      if (pending === 0) {
        if (!silent) toast.error('No pending tasks in queue');
        return false;
      }
      if (free === 0) {
        if (!silent) toast.error('No available staff');
        return false;
      }

      assign();
      latest.current = {
        ...latest.current,
        pendingTasks: pending - 1,
        availableStaff: free - 1,
      };
      setTotalAssigned((n) => n + 1);
      pushLog('success', `Task assigned (${pending - 1} left in queue, ${free - 1} staff free)`);
      if (!silent) toast.success('Task assigned to staff member');
      return true;
    },
    [pushLog]
  );

  const handleQuickAssign = () => {
    runAssignment(false);
  };

  const handleAssignAll = () => {
    const { pendingTasks: pending, availableStaff: free } = latest.current;
    const count = Math.min(pending, free);

    if (count === 0) {
      toast.error(pending === 0 ? 'No pending tasks in queue' : 'No available staff');
      return;
    }

    let done = 0;
    for (let i = 0; i < count; i += 1) {
      if (runAssignment(true)) done += 1;
    }
    toast.success(`Assigned ${done} task${done === 1 ? '' : 's'} in one batch`);
  };

  const toggleAuto = useCallback(() => {
    setAutoRunning((running) => {
      const next = !running;
      if (next) {
        setSessionStart(Date.now());
        pushLog('info', 'Auto-assign started');
      } else {
        pushLog('info', 'Auto-assign paused');
      }
      return next;
    });
  }, [pushLog]);

  const handleReset = () => {
    setAutoRunning(false);
    setLog([]);
    setTotalAssigned(0);
    setSessionStart(null);
    setSpeedIndex(1);
    toast.info('Simulation stats reset');
  };

  useEffect(() => {
    if (!autoRunning) return undefined;
    const id = setInterval(() => {
      const { pendingTasks: pending, availableStaff: free } = latest.current;
      if (pending === 0 || free === 0) return;
      runAssignment(true);
    }, SPEEDS[speedIndex].ms);
    return () => clearInterval(id);
  }, [autoRunning, speedIndex, runAssignment]);

  useEffect(() => {
    if (!autoRunning) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [autoRunning]);

  useEffect(() => {
    if (autoRunning && pendingTasks === 0 && totalAssigned > 0) {
      pushLog('info', 'Queue empty, waiting for new tasks');
    }
  }, [autoRunning, pendingTasks, totalAssigned, pushLog]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === 'n') {
        e.preventDefault();
        runAssignment(false);
      } else if (key === 'a') {
        e.preventDefault();
        toggleAuto();
      } else if (key === 'b') {
        e.preventDefault();
        handleAssignAll();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const elapsedSeconds = sessionStart && autoRunning ? Math.floor((now - sessionStart) / 1000) : 0;
  const throughput = useMemo(() => {
    if (!sessionStart || elapsedSeconds < 5) return null;
    return ((totalAssigned / elapsedSeconds) * 60).toFixed(1);
  }, [sessionStart, elapsedSeconds, totalAssigned]);

  const utilizationColor =
    utilization >= 85 ? 'bg-red-500' : utilization >= 60 ? 'bg-orange-500' : 'bg-green-500';

  const queueStatus =
    pendingTasks === 0
      ? { label: 'Queue clear', variant: 'secondary' }
      : availableStaff === 0
        ? { label: 'Staff saturated', variant: 'destructive' }
        : { label: 'Ready to assign', variant: 'default' };

  return (
    <Card className="backdrop-blur-xl bg-gradient-to-br from-blue-50/80 to-purple-50/80 dark:from-blue-950/80 dark:to-purple-950/80 border-2 border-primary/20 shadow-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Actions
          </span>
          <Badge variant={queueStatus.variant}>{queueStatus.label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 p-3 backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 rounded-lg border">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Available Staff</div>
            <div className="text-lg font-bold text-green-600">{availableStaff}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Busy Staff</div>
            <div className="text-lg font-bold text-orange-600">{busyStaff}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Pending Tasks</div>
            <div className="text-lg font-bold text-blue-600">{pendingTasks}</div>
          </div>
        </div>

        <div className="p-3 backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 rounded-lg border space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Staff utilization</span>
            <span className="font-semibold">{utilization}%</span>
          </div>
          <div
            className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
            role="progressbar"
            aria-valuenow={utilization}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Staff utilization"
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${utilizationColor}`}
              style={{ width: `${utilization}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{rooms.length} rooms tracked</span>
            <span>{totalAssigned} assigned this session</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handleQuickAssign} disabled={!canAssign}>
            <Play className="h-4 w-4 mr-2" />
            Assign Next
          </Button>
          <Button onClick={handleAssignAll} variant="secondary" disabled={!canAssign}>
            <FastForward className="h-4 w-4 mr-2" />
            Assign Batch
          </Button>
        </div>

        <div className="p-3 backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 rounded-lg border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Activity className={`h-4 w-4 ${autoRunning ? 'text-green-600 animate-pulse' : 'text-muted-foreground'}`} />
              Auto-assign
            </div>
            <Button
              size="sm"
              variant={autoRunning ? 'destructive' : 'default'}
              onClick={toggleAuto}
              aria-pressed={autoRunning}
            >
              {autoRunning ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Start
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-1" role="group" aria-label="Simulation speed">
            {SPEEDS.map((speed, index) => (
              <Button
                key={speed.label}
                size="sm"
                variant={index === speedIndex ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setSpeedIndex(index)}
              >
                {speed.label}
              </Button>
            ))}
          </div>

          {autoRunning && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Running for {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s</span>
              <span>{throughput ? `${throughput} tasks/min` : 'Measuring throughput...'}</span>
            </div>
          )}
        </div>

        <div className="p-3 backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 rounded-lg border space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold">Activity log</div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={() => setLog([])}
                disabled={log.length === 0}
                aria-label="Clear activity log"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={handleReset}
                aria-label="Reset simulation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1" aria-live="polite">
            {log.length === 0 ? (
              <div className="text-xs text-muted-foreground py-2 text-center">
                No activity yet. Assign a task or start auto-assign.
              </div>
            ) : (
              log.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 text-xs">
                  <span className="text-muted-foreground tabular-nums shrink-0">{formatTime(entry.time)}</span>
                  <span className={entry.type === 'success' ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}>
                    {entry.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 p-3 backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 rounded border">
          <div className="font-semibold mb-1 flex items-center gap-1">
            <Keyboard className="h-3.5 w-3.5" />
            Shortcuts
          </div>
          <div>• N assigns the next highest-priority task</div>
          <div>• B assigns a batch to every free staff member</div>
          <div>• A starts or pauses auto-assign</div>
          <div>• Complete tasks from the Staff View page</div>
        </div>
      </CardContent>
    </Card>
  );
}

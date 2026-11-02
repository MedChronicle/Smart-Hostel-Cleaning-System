import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHostel } from '../context/HostelContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import {
  AlertTriangle,
  Camera,
  CheckCircle,
  Clock,
  Download,
  Gauge,
  QrCode,
  RefreshCw,
  RotateCcw,
  Scan,
  ShieldCheck,
  Timer,
  Trash2,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';

type StaffMember = ReturnType<typeof useHostel>['staff'][number];
type CompletionSource = 'manual' | 'qr';
type StaffSort = 'efficiency' | 'tasks' | 'name';
type StaffFilter = 'all' | 'available' | 'busy';
type ScanMode = 'idle' | 'simulated' | 'camera';

interface CompletionLog {
  id: string;
  roomId: string;
  staffName: string;
  fromScore: number;
  toScore: number;
  duration: number;
  source: CompletionSource;
  at: number;
}

interface QrPayload {
  roomId: string;
  timestamp: number;
  type: 'cleaning_verification';
}

interface BarcodeResult {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect: (source: HTMLVideoElement) => Promise<BarcodeResult[]>;
}

type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

const MIN_DURATION = 5;
const MAX_DURATION = 120;
const DEFAULT_DURATION = 20;
const DEFAULT_SCORE = 85;
const SCAN_DELAY_MS = 1800;
const QR_MAX_AGE_MS = 10 * 60 * 1000;
const LOG_LIMIT = 6;
const LOG_KEY = 'staffView:log:v1';
const DURATION_PRESETS = [10, 15, 20, 30, 45, 60];

const SORT_OPTIONS: { value: StaffSort; label: string }[] = [
  { value: 'efficiency', label: 'Efficiency' },
  { value: 'tasks', label: 'Tasks done' },
  { value: 'name', label: 'Name' },
];

const FILTER_OPTIONS: { value: StaffFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'busy', label: 'Busy' },
];

const efficiencyTone = (value: number) => {
  if (value >= 85) return 'bg-green-500';
  if (value >= 70) return 'bg-yellow-500';
  return 'bg-red-500';
};

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatCountdown = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const getDetectorCtor = (): BarcodeDetectorCtor | undefined => {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
};

const isLiveScanSupported = () =>
  typeof navigator !== 'undefined' && !!getDetectorCtor() && !!navigator.mediaDevices?.getUserMedia;

const loadLog = (): CompletionLog[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CompletionLog[]).slice(0, LOG_LIMIT) : [];
  } catch {
    return [];
  }
};

const saveLog = (entries: CompletionLog[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(LOG_KEY, JSON.stringify(entries));
  } catch {
    return;
  }
};

type VerifyResult = { ok: true } | { ok: false; reason: string };

const verifyPayload = (raw: string, expectedRoom: string): VerifyResult => {
  try {
    const parsed = JSON.parse(raw) as Partial<QrPayload>;
    if (parsed.type !== 'cleaning_verification' || typeof parsed.roomId !== 'string') {
      return { ok: false, reason: 'Unrecognized QR code' };
    }
    if (parsed.roomId !== expectedRoom) {
      return { ok: false, reason: `QR code is for Room ${parsed.roomId}, not Room ${expectedRoom}` };
    }
    if (typeof parsed.timestamp !== 'number' || Date.now() - parsed.timestamp > QR_MAX_AGE_MS) {
      return { ok: false, reason: 'QR code expired, refresh it and scan again' };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'Unreadable QR code' };
  }
};

function useRoomQr(roomId: string) {
  const [state, setState] = useState<{ url: string; payload: string; issuedAt: number } | null>(null);
  const [nonce, setNonce] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setState(null);
    if (!roomId) return;
    let cancelled = false;
    const issuedAt = Date.now();
    const payload: QrPayload = { roomId, timestamp: issuedAt, type: 'cleaning_verification' };
    const serialized = JSON.stringify(payload);
    QRCode.toDataURL(serialized, { width: 300, margin: 1 })
      .then((url) => {
        if (cancelled) return;
        setState({ url, payload: serialized, issuedAt });
        setNow(Date.now());
      })
      .catch(() => {
        if (cancelled) return;
        toast.error('Could not generate QR code');
      });
    return () => {
      cancelled = true;
    };
  }, [roomId, nonce]);

  useEffect(() => {
    if (!state) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state]);

  const secondsLeft = state
    ? Math.max(0, Math.ceil((state.issuedAt + QR_MAX_AGE_MS - now) / 1000))
    : 0;

  return {
    dataUrl: state?.url ?? '',
    payload: state?.payload ?? '',
    ready: !!state,
    secondsLeft,
    expired: !!state && secondsLeft === 0,
    refresh: useCallback(() => setNonce((n) => n + 1), []),
  };
}

function useCameraScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number>();
  const [error, setError] = useState('');

  const stop = useCallback(() => {
    if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    frameRef.current = undefined;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(
    async (onResult: (raw: string) => void): Promise<boolean> => {
      const Detector = getDetectorCtor();
      if (!Detector || !navigator.mediaDevices?.getUserMedia) {
        setError('Camera scanning is not supported in this browser');
        return false;
      }
      try {
        setError('');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stop();
          return false;
        }
        video.srcObject = stream;
        await video.play();
        const detector = new Detector({ formats: ['qr_code'] });
        let last = 0;
        const tick = async (time: number) => {
          if (!streamRef.current) return;
          if (time - last > 250) {
            last = time;
            try {
              const codes = await detector.detect(video);
              if (codes.length > 0 && streamRef.current) {
                stop();
                onResult(codes[0].rawValue);
                return;
              }
            } catch {
              last = time;
            }
          }
          frameRef.current = requestAnimationFrame(tick);
        };
        frameRef.current = requestAnimationFrame(tick);
        return true;
      } catch (err) {
        stop();
        setError(
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Camera permission was denied'
            : 'Could not start the camera'
        );
        return false;
      }
    },
    [stop]
  );

  useEffect(() => stop, [stop]);

  return { videoRef, error, start, stop };
}

const StatCard = memo(function StatCard({
  icon: Icon,
  iconClass,
  value,
  label,
}: {
  icon: LucideIcon;
  iconClass: string;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={`h-5 w-5 ${iconClass}`} />
        <div>
          <div className="text-xl font-bold leading-none">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
});

const ActiveTaskCard = memo(function ActiveTaskCard({
  member,
  room,
  selected,
  disabled,
  onSelect,
}: {
  member: StaffMember;
  room?: { id: string | number; cleanlinessScore: number; floor: string | number };
  selected: boolean;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(member.id)}
      aria-pressed={selected}
      disabled={disabled}
      className={`rounded-lg border bg-orange-50 p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 dark:bg-orange-950 ${
        selected ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50'
      }`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="font-semibold">{member.name}</div>
          <div className="text-xs text-muted-foreground">{member.id}</div>
        </div>
        <Badge variant="secondary">In Progress</Badge>
      </div>
      {room && (
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Room:</span>
            <span className="font-semibold">{room.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Score:</span>
            <span>{room.cleanlinessScore}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Floor:</span>
            <span>{room.floor}</span>
          </div>
        </div>
      )}
    </button>
  );
});

const StaffCard = memo(function StaffCard({
  member,
  isTop,
}: {
  member: StaffMember;
  isTop: boolean;
}) {
  const pct = Math.min(100, Math.max(0, member.efficiency));
  return (
    <div
      className={`rounded-lg border p-4 ${
        member.status === 'busy'
          ? 'bg-orange-50 dark:bg-orange-950'
          : 'bg-green-50 dark:bg-green-950'
      }`}
    >
      <div className="mb-2 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 font-semibold">
            {member.name}
            {isTop && <Trophy className="h-3.5 w-3.5 text-yellow-600" aria-label="Top performer" />}
          </div>
          <div className="text-xs text-muted-foreground">{member.id}</div>
        </div>
        <Badge variant={member.status === 'available' ? 'default' : 'secondary'}>
          {member.status}
        </Badge>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tasks Completed:</span>
          <span className="font-semibold">{member.tasksCompleted}</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Efficiency:</span>
            <span className="font-semibold">{member.efficiency}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label={`${member.name} efficiency`}
            className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
          >
            <div
              className={`h-full rounded-full transition-all motion-reduce:transition-none ${efficiencyTone(
                member.efficiency
              )}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export function StaffView() {
  const { staff, rooms, completeTask } = useHostel();
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [newScore, setNewScore] = useState([DEFAULT_SCORE]);
  const [scoreTouched, setScoreTouched] = useState(false);
  const [duration, setDuration] = useState(String(DEFAULT_DURATION));
  const [scanMode, setScanMode] = useState<ScanMode>('idle');
  const [log, setLog] = useState<CompletionLog[]>(loadLog);
  const [sortBy, setSortBy] = useState<StaffSort>('efficiency');
  const [filter, setFilter] = useState<StaffFilter>('all');

  const scanTimer = useRef<ReturnType<typeof setTimeout>>();
  const selectedRoomRef = useRef('');
  const finalizeRef = useRef<(source: CompletionSource) => boolean>(() => false);

  const qr = useRoomQr(selectedRoom);
  const { videoRef, error: cameraError, start: startCamera, stop: stopCamera } = useCameraScanner();
  const liveScanSupported = useMemo(isLiveScanSupported, []);

  const scanning = scanMode !== 'idle';
  selectedRoomRef.current = selectedRoom;

  useEffect(() => () => clearTimeout(scanTimer.current), []);

  useEffect(() => {
    saveLog(log);
  }, [log]);

  const busyStaff = useMemo(() => staff.filter((s) => s.status === 'busy'), [staff]);

  const busyRooms = useMemo(
    () => rooms.filter((r) => busyStaff.some((s) => s.currentTask === r.id)),
    [rooms, busyStaff]
  );

  const roomById = useMemo(() => new Map(rooms.map((r) => [String(r.id), r])), [rooms]);

  const activeStaff = useMemo(
    () => busyStaff.find((s) => s.id === selectedStaff),
    [busyStaff, selectedStaff]
  );

  const activeRoom = useMemo(() => roomById.get(selectedRoom), [roomById, selectedRoom]);

  const durationNumber = Number(duration);
  const durationValid =
    Number.isInteger(durationNumber) &&
    durationNumber >= MIN_DURATION &&
    durationNumber <= MAX_DURATION;

  const scoreDelta = activeRoom ? newScore[0] - activeRoom.cleanlinessScore : 0;
  const selectionConsistent =
    !!activeStaff && !!activeRoom && String(activeStaff.currentTask) === String(activeRoom.id);
  const canComplete = selectionConsistent && durationValid && !scanning;
  const canScan = canComplete && qr.ready && !qr.expired;

  useEffect(() => {
    if (selectedStaff && !busyStaff.some((s) => s.id === selectedStaff)) {
      clearTimeout(scanTimer.current);
      stopCamera();
      setScanMode('idle');
      setSelectedStaff('');
      setSelectedRoom('');
    }
  }, [busyStaff, selectedStaff, stopCamera]);

  const handleStaffChange = useCallback(
    (staffId: string) => {
      setSelectedStaff(staffId);
      const member = busyStaff.find((s) => s.id === staffId);
      setSelectedRoom(member?.currentTask ? String(member.currentTask) : '');
    },
    [busyStaff]
  );

  const handleRoomChange = useCallback(
    (roomId: string) => {
      setSelectedRoom(roomId);
      const member = busyStaff.find((s) => String(s.currentTask) === roomId);
      setSelectedStaff(member ? member.id : '');
    },
    [busyStaff]
  );

  const cancelScan = useCallback(() => {
    clearTimeout(scanTimer.current);
    stopCamera();
    setScanMode('idle');
  }, [stopCamera]);

  const resetForm = useCallback(() => {
    cancelScan();
    setSelectedStaff('');
    setSelectedRoom('');
    setNewScore([DEFAULT_SCORE]);
    setScoreTouched(false);
    setDuration(String(DEFAULT_DURATION));
  }, [cancelScan]);

  const finalize = useCallback(
    (source: CompletionSource) => {
      if (!activeStaff || !activeRoom || !selectionConsistent) {
        toast.error('Selected staff member is no longer assigned to this room');
        return false;
      }
      if (!durationValid) {
        toast.error(`Duration must be between ${MIN_DURATION} and ${MAX_DURATION} minutes`);
        return false;
      }

      completeTask(activeRoom.id, activeStaff.id, newScore[0], durationNumber);

      setLog((prev) =>
        [
          {
            id: `${activeRoom.id}-${Date.now()}`,
            roomId: String(activeRoom.id),
            staffName: activeStaff.name,
            fromScore: activeRoom.cleanlinessScore,
            toScore: newScore[0],
            duration: durationNumber,
            source,
            at: Date.now(),
          },
          ...prev,
        ].slice(0, LOG_LIMIT)
      );

      toast.success('Task completed successfully!', {
        description: `Room ${activeRoom.id} cleaned by ${activeStaff.name} • ${activeRoom.cleanlinessScore} → ${newScore[0]}`,
      });

      resetForm();
      return true;
    },
    [
      activeStaff,
      activeRoom,
      selectionConsistent,
      durationValid,
      durationNumber,
      newScore,
      completeTask,
      resetForm,
    ]
  );

  finalizeRef.current = finalize;

  const handleScanResult = (raw: string) => {
    setScanMode('idle');
    const result = verifyPayload(raw, selectedRoomRef.current);
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    toast.success('QR Code scanned successfully!');
    finalizeRef.current('qr');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !selectedRoom) {
      toast.error('Please select both staff and room');
      return;
    }
    finalize('manual');
  };

  const startSimulatedScan = () => {
    if (!canScan) {
      toast.error('Select a staff member, a valid duration and a fresh QR code first');
      return;
    }
    setScanMode('simulated');
    const payloadAtScan = qr.payload;
    scanTimer.current = setTimeout(() => handleScanResult(payloadAtScan), SCAN_DELAY_MS);
  };

  const startCameraScan = async () => {
    if (!canScan) {
      toast.error('Select a staff member, a valid duration and a fresh QR code first');
      return;
    }
    setScanMode('camera');
    const started = await startCamera(handleScanResult);
    if (!started) setScanMode('idle');
  };

  const downloadQR = () => {
    if (!qr.dataUrl) return;
    const anchor = document.createElement('a');
    anchor.href = qr.dataUrl;
    anchor.download = `room-${selectedRoom}-qr.png`;
    anchor.click();
  };

  const clearLog = () => setLog([]);

  const stats = useMemo(() => {
    const total = staff.reduce((sum, s) => sum + s.tasksCompleted, 0);
    const avg = staff.length
      ? Math.round(staff.reduce((sum, s) => sum + s.efficiency, 0) / staff.length)
      : 0;
    const available = staff.filter((s) => s.status === 'available').length;
    const top = staff.length
      ? staff.reduce((best, s) => (s.efficiency > best.efficiency ? s : best), staff[0])
      : undefined;
    return { total, avg, available, top };
  }, [staff]);

  const visibleStaff = useMemo(() => {
    const filtered = staff.filter((s) => filter === 'all' || s.status === filter);
    return [...filtered].sort((a, b) => {
      if (sortBy === 'efficiency') return b.efficiency - a.efficiency;
      if (sortBy === 'tasks') return b.tasksCompleted - a.tasksCompleted;
      return a.name.localeCompare(b.name);
    });
  }, [staff, filter, sortBy]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={Users}
          iconClass="text-primary"
          value={`${stats.available}/${staff.length}`}
          label="Available"
        />
        <StatCard icon={Clock} iconClass="text-orange-600" value={busyStaff.length} label="Active tasks" />
        <StatCard icon={CheckCircle} iconClass="text-green-600" value={stats.total} label="Tasks completed" />
        <StatCard icon={Gauge} iconClass="text-blue-600" value={`${stats.avg}%`} label="Avg efficiency" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Cleaning Tasks</CardTitle>
          <CardDescription>Staff members currently assigned to rooms. Select one to complete it.</CardDescription>
        </CardHeader>
        <CardContent>
          {busyStaff.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>No active tasks</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {busyStaff.map((member) => (
                <ActiveTaskCard
                  key={member.id}
                  member={member}
                  room={roomById.get(String(member.currentTask))}
                  selected={member.id === selectedStaff}
                  disabled={scanning}
                  onSelect={handleStaffChange}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Complete Cleaning Task</CardTitle>
            <CardDescription>Mark a task as complete and update room status</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label>Select Staff Member</Label>
                <Select value={selectedStaff} onValueChange={handleStaffChange} disabled={scanning}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {busyStaff.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} - Room {member.currentTask}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Room Number</Label>
                <Select value={selectedRoom} onValueChange={handleRoomChange} disabled={scanning}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose room" />
                  </SelectTrigger>
                  <SelectContent>
                    {busyRooms.map((room) => (
                      <SelectItem key={room.id} value={String(room.id)}>
                        Room {room.id} (Floor {room.floor})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Staff and room stay linked to the assignment automatically
                </p>
              </div>

              <div className="space-y-2">
                <Label>New Cleanliness Score: {newScore[0]}</Label>
                <Slider
                  value={newScore}
                  onValueChange={(value) => {
                    setNewScore(value);
                    setScoreTouched(true);
                  }}
                  min={60}
                  max={100}
                  step={5}
                  disabled={scanning}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>60</span>
                  <span>80</span>
                  <span>100</span>
                </div>
                {activeRoom && (
                  <div
                    aria-live="polite"
                    className={`flex items-center gap-1 text-xs ${
                      scoreDelta > 0
                        ? 'text-green-600'
                        : scoreDelta === 0
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}
                  >
                    {scoreDelta <= 0 && <AlertTriangle className="h-3 w-3" />}
                    {scoreDelta > 0
                      ? `+${scoreDelta} improvement from ${activeRoom.cleanlinessScore}`
                      : scoreDelta === 0
                      ? `No change from current score ${activeRoom.cleanlinessScore}`
                      : `${scoreDelta} below current score ${activeRoom.cleanlinessScore}`}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  inputMode="numeric"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min={MIN_DURATION}
                  max={MAX_DURATION}
                  disabled={scanning}
                  aria-invalid={!durationValid}
                  aria-describedby="duration-help"
                  className={!durationValid ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                <div className="flex flex-wrap gap-1.5">
                  {DURATION_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDuration(String(preset))}
                      disabled={scanning}
                      aria-pressed={duration === String(preset)}
                      className={`rounded-full px-2.5 py-0.5 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        duration === String(preset)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/70'
                      }`}
                    >
                      {preset}m
                    </button>
                  ))}
                </div>
                <p
                  id="duration-help"
                  className={`text-xs ${durationValid ? 'text-muted-foreground' : 'text-red-600'}`}
                >
                  {durationValid
                    ? `Between ${MIN_DURATION} and ${MAX_DURATION} minutes`
                    : `Enter a whole number from ${MIN_DURATION} to ${MAX_DURATION}`}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={!canComplete} className="flex-1">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Complete
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={!selectedStaff && !selectedRoom && !scoreTouched}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code Verification
            </CardTitle>
            <CardDescription>Scan QR code to verify room cleaning completion</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedRoom ? (
              <>
                <div className="flex min-h-[150px] items-center justify-center rounded-lg border-2 border-dashed bg-white p-4">
                  {qr.dataUrl ? (
                    <img
                      src={qr.dataUrl}
                      alt={`QR Code for Room ${selectedRoom}`}
                      className={`mx-auto w-full max-w-[250px] ${qr.expired ? 'opacity-30' : ''}`}
                    />
                  ) : (
                    <QrCode className="h-10 w-10 animate-pulse text-slate-300" />
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Room {selectedRoom} Verification Code</span>
                  {qr.ready && (
                    <Badge variant={qr.expired ? 'destructive' : 'outline'} className="gap-1">
                      <Timer className="h-3 w-3" />
                      {qr.expired ? 'Expired' : formatCountdown(qr.secondsLeft)}
                    </Badge>
                  )}
                </div>

                <div className={scanMode === 'camera' ? 'relative overflow-hidden rounded-lg bg-black' : 'hidden'}>
                  <video ref={videoRef} muted playsInline className="max-h-64 w-full object-cover" />
                  <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-white/70" />
                </div>

                {cameraError && (
                  <p role="alert" className="flex items-center gap-1 text-xs text-red-600">
                    <AlertTriangle className="h-3 w-3" />
                    {cameraError}
                  </p>
                )}

                {scanMode === 'simulated' && (
                  <div
                    role="status"
                    className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center dark:border-blue-800 dark:bg-blue-950"
                  >
                    <Camera className="mx-auto mb-2 h-8 w-8 text-blue-600 motion-safe:animate-pulse" />
                    <p className="text-sm text-blue-900 dark:text-blue-100">Scanning QR code...</p>
                  </div>
                )}

                {scanning ? (
                  <Button type="button" variant="destructive" onClick={cancelScan} className="w-full">
                    Cancel Scan
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {liveScanSupported && (
                      <Button type="button" onClick={startCameraScan} disabled={!canScan}>
                        <Camera className="mr-2 h-4 w-4" />
                        Scan with Camera
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={startSimulatedScan}
                      disabled={!canScan}
                      className={liveScanSupported ? '' : 'col-span-2'}
                    >
                      <Scan className="mr-2 h-4 w-4" />
                      Simulate Scan
                    </Button>
                    <Button type="button" variant="outline" onClick={downloadQR} disabled={!qr.dataUrl}>
                      <Download className="mr-2 h-4 w-4" />
                      Save QR
                    </Button>
                    <Button type="button" variant="outline" onClick={qr.refresh} disabled={!selectedRoom}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh Code
                    </Button>
                  </div>
                )}

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-green-600" />
                    Verifies the code matches the room and is under 10 minutes old
                  </p>
                  <p>✓ Auto-updates cleanliness score</p>
                  <p>✓ Logs completion timestamp</p>
                  <p>✓ Returns staff to available queue</p>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <QrCode className="mx-auto mb-2 h-12 w-12 opacity-50" />
                <p>Select a room to generate QR code</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {log.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Recent Completions</CardTitle>
                <CardDescription>Tasks completed during this session</CardDescription>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={clearLog}>
                <Trash2 className="mr-1 h-4 w-4" />
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {log.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-green-50 p-3 dark:bg-green-950"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">
                      Room {entry.roomId} • {entry.staffName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.fromScore} → {entry.toScore} • {entry.duration} min
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline">{entry.source === 'qr' ? 'QR' : 'Manual'}</Badge>
                    <span className="text-xs text-muted-foreground">{formatTime(entry.at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Staff Performance Overview</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <div role="group" aria-label="Filter staff" className="flex gap-1.5">
                {FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={filter === option.value}
                    onClick={() => setFilter(option.value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      filter === option.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as StaffSort)}>
                <SelectTrigger className="h-8 w-[140px] text-xs" aria-label="Sort staff">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      Sort: {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {visibleStaff.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>No staff match this filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visibleStaff.map((member) => (
                <StaffCard
                  key={member.id}
                  member={member}
                  isTop={stats.top?.id === member.id && staff.length > 1}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

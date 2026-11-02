import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  RotateCcw,
  Scan,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';

type CompletionSource = 'manual' | 'qr';
type StaffSort = 'efficiency' | 'tasks' | 'name';
type StaffFilter = 'all' | 'available' | 'busy';

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

const MIN_DURATION = 5;
const MAX_DURATION = 120;
const DEFAULT_DURATION = 20;
const DEFAULT_SCORE = 85;
const SCAN_DELAY_MS = 1800;
const QR_MAX_AGE_MS = 10 * 60 * 1000;
const LOG_LIMIT = 6;
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

interface QrPayload {
  roomId: string;
  timestamp: number;
  type: 'cleaning_verification';
}

export function StaffView() {
  const { staff, rooms, completeTask } = useHostel();
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [newScore, setNewScore] = useState([DEFAULT_SCORE]);
  const [scoreTouched, setScoreTouched] = useState(false);
  const [duration, setDuration] = useState(String(DEFAULT_DURATION));
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrPayload, setQrPayload] = useState('');
  const [scanning, setScanning] = useState(false);
  const [log, setLog] = useState<CompletionLog[]>([]);
  const [sortBy, setSortBy] = useState<StaffSort>('efficiency');
  const [filter, setFilter] = useState<StaffFilter>('all');

  const scanTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(scanTimer.current), []);

  const busyStaff = useMemo(() => staff.filter((s) => s.status === 'busy'), [staff]);

  const busyRooms = useMemo(
    () => rooms.filter((r) => busyStaff.some((s) => s.currentTask === r.id)),
    [rooms, busyStaff]
  );

  const activeStaff = useMemo(
    () => busyStaff.find((s) => s.id === selectedStaff),
    [busyStaff, selectedStaff]
  );

  const activeRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoom),
    [rooms, selectedRoom]
  );

  const durationNumber = Number(duration);
  const durationValid =
    Number.isInteger(durationNumber) &&
    durationNumber >= MIN_DURATION &&
    durationNumber <= MAX_DURATION;

  const scoreDelta = activeRoom ? newScore[0] - activeRoom.cleanlinessScore : 0;
  const selectionConsistent = !!activeStaff && !!activeRoom && activeStaff.currentTask === activeRoom.id;
  const canComplete = selectionConsistent && durationValid && !scanning;

  useEffect(() => {
    if (selectedStaff && !busyStaff.some((s) => s.id === selectedStaff)) {
      setSelectedStaff('');
      setSelectedRoom('');
    }
  }, [busyStaff, selectedStaff]);

  useEffect(() => {
    if (!selectedRoom) {
      setQrDataUrl('');
      setQrPayload('');
      return;
    }
    let cancelled = false;
    const payload: QrPayload = {
      roomId: selectedRoom,
      timestamp: Date.now(),
      type: 'cleaning_verification',
    };
    const serialized = JSON.stringify(payload);
    QRCode.toDataURL(serialized, { width: 300, margin: 1 })
      .then((url) => {
        if (cancelled) return;
        setQrDataUrl(url);
        setQrPayload(serialized);
      })
      .catch(() => {
        if (cancelled) return;
        setQrDataUrl('');
        setQrPayload('');
        toast.error('Could not generate QR code');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRoom]);

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

  const resetForm = useCallback(() => {
    clearTimeout(scanTimer.current);
    setScanning(false);
    setSelectedStaff('');
    setSelectedRoom('');
    setNewScore([DEFAULT_SCORE]);
    setScoreTouched(false);
    setDuration(String(DEFAULT_DURATION));
    setQrDataUrl('');
    setQrPayload('');
  }, []);

  const finalize = useCallback(
    (source: CompletionSource) => {
      if (!activeStaff || !activeRoom || !durationValid) return false;

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
    [activeStaff, activeRoom, durationValid, durationNumber, newScore, completeTask, resetForm]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !selectedRoom) {
      toast.error('Please select both staff and room');
      return;
    }
    if (!selectionConsistent) {
      toast.error('Selected staff member is not assigned to this room');
      return;
    }
    if (!durationValid) {
      toast.error(`Duration must be between ${MIN_DURATION} and ${MAX_DURATION} minutes`);
      return;
    }
    finalize('manual');
  };

  const handleQRScan = () => {
    if (!canComplete || !qrPayload) {
      toast.error('Select a staff member and a valid duration before scanning');
      return;
    }
    setScanning(true);
    const expectedRoom = selectedRoom;
    const payloadAtScan = qrPayload;
    scanTimer.current = setTimeout(() => {
      setScanning(false);
      try {
        const parsed = JSON.parse(payloadAtScan) as QrPayload;
        const fresh = Date.now() - parsed.timestamp <= QR_MAX_AGE_MS;
        if (parsed.type !== 'cleaning_verification' || parsed.roomId !== expectedRoom) {
          toast.error('QR code does not match the selected room');
          return;
        }
        if (!fresh) {
          toast.error('QR code expired, reselect the room to refresh it');
          return;
        }
        toast.success('QR Code scanned successfully!');
        finalize('qr');
      } catch {
        toast.error('Unreadable QR code');
      }
    }, SCAN_DELAY_MS);
  };

  const cancelScan = () => {
    clearTimeout(scanTimer.current);
    setScanning(false);
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const anchor = document.createElement('a');
    anchor.href = qrDataUrl;
    anchor.download = `room-${selectedRoom}-qr.png`;
    anchor.click();
  };

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
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <div className="text-xl font-bold leading-none">
                {stats.available}/{staff.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Available</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-5 w-5 text-orange-600" />
            <div>
              <div className="text-xl font-bold leading-none">{busyStaff.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Active tasks</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <div className="text-xl font-bold leading-none">{stats.total}</div>
              <div className="text-xs text-muted-foreground mt-1">Tasks completed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Gauge className="h-5 w-5 text-blue-600" />
            <div>
              <div className="text-xl font-bold leading-none">{stats.avg}%</div>
              <div className="text-xs text-muted-foreground mt-1">Avg efficiency</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Cleaning Tasks</CardTitle>
          <CardDescription>Staff members currently assigned to rooms</CardDescription>
        </CardHeader>
        <CardContent>
          {busyStaff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No active tasks</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {busyStaff.map((member) => {
                const room = rooms.find((r) => r.id === member.currentTask);
                const selected = member.id === selectedStaff;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleStaffChange(member.id)}
                    aria-pressed={selected}
                    disabled={scanning}
                    className={`p-4 border rounded-lg bg-orange-50 dark:bg-orange-950 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 ${
                      selected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
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
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      <SelectItem key={room.id} value={room.id}>
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
                <div className="bg-white p-4 rounded-lg border-2 border-dashed min-h-[150px] flex items-center justify-center">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code for Room ${selectedRoom}`}
                      className="w-full max-w-[250px] mx-auto"
                    />
                  ) : (
                    <QrCode className="h-10 w-10 text-slate-300 animate-pulse" />
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-center text-muted-foreground">
                    Room {selectedRoom} Verification Code
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {scanning ? (
                      <Button type="button" variant="destructive" onClick={cancelScan}>
                        Cancel Scan
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleQRScan}
                        variant="outline"
                        disabled={!canComplete || !qrDataUrl}
                      >
                        <Scan className="mr-2 h-4 w-4" />
                        Scan QR Code
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={downloadQR}
                      disabled={!qrDataUrl || scanning}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Save QR
                    </Button>
                  </div>
                </div>

                {scanning && (
                  <div
                    role="status"
                    className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 text-center"
                  >
                    <Camera className="h-8 w-8 mx-auto mb-2 text-blue-600 motion-safe:animate-pulse" />
                    <p className="text-sm text-blue-900 dark:text-blue-100">Scanning QR code...</p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-green-600" />
                    Verifies the code matches the selected room
                  </p>
                  <p>✓ Auto-updates cleanliness score</p>
                  <p>✓ Logs completion timestamp</p>
                  <p>✓ Returns staff to available queue</p>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Select a room to generate QR code</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {log.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Completions</CardTitle>
            <CardDescription>Tasks you completed during this session</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {log.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 bg-green-50 dark:bg-green-950"
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
            <div className="text-center py-8 text-muted-foreground">
              <p>No staff match this filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleStaff.map((member) => {
                const isTop = stats.top?.id === member.id && staff.length > 1;
                return (
                  <div
                    key={member.id}
                    className={`p-4 border rounded-lg ${
                      member.status === 'busy'
                        ? 'bg-orange-50 dark:bg-orange-950'
                        : 'bg-green-50 dark:bg-green-950'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-1.5 font-semibold">
                          {member.name}
                          {isTop && (
                            <Trophy className="h-3.5 w-3.5 text-yellow-600" aria-label="Top performer" />
                          )}
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
                          aria-valuenow={member.efficiency}
                          aria-label={`${member.name} efficiency`}
                          className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
                        >
                          <div
                            className={`h-full rounded-full transition-all motion-reduce:transition-none ${efficiencyTone(
                              member.efficiency
                            )}`}
                            style={{ width: `${Math.min(100, Math.max(0, member.efficiency))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

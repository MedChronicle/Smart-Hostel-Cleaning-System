import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHostel } from '../context/HostelContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Droplets,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';

type CleaningType = 'cleaning' | 'wiping' | 'washing';
type NeatnessLevel = 'very-dirty' | 'dirty' | 'moderate' | 'clean';
type RoomFilter = 'all' | 'attention' | 'requested';

interface ServiceOption {
  value: CleaningType;
  label: string;
  icon: LucideIcon;
  description: string;
}

interface NeatnessOption {
  value: NeatnessLevel;
  label: string;
  color: string;
  bgColor: string;
}

interface SubmittedRequest {
  id: string;
  roomId: string;
  floor: string | number;
  cleaningType: CleaningType;
  neatnessLevel: NeatnessLevel;
  details: string;
  at: number;
}

const PRIORITY_BOOST = 30;
const MAX_DETAILS = 300;
const SUCCESS_RESET_MS = 2500;
const HISTORY_LIMIT = 5;

const SERVICE_OPTIONS: ServiceOption[] = [
  { value: 'cleaning', label: 'General Cleaning', icon: Sparkles, description: 'Full room cleaning service' },
  { value: 'wiping', label: 'Wiping', icon: Droplets, description: 'Surface wiping and dusting' },
  { value: 'washing', label: 'Washing', icon: Trash2, description: 'Deep washing and sanitization' },
];

const NEATNESS_OPTIONS: NeatnessOption[] = [
  { value: 'very-dirty', label: 'Very Dirty', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-950' },
  { value: 'dirty', label: 'Dirty', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-950' },
  { value: 'moderate', label: 'Moderate', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-950' },
  { value: 'clean', label: 'Clean', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-950' },
];

const FILTER_OPTIONS: { value: RoomFilter; label: string }[] = [
  { value: 'all', label: 'All rooms' },
  { value: 'attention', label: 'Needs attention' },
  { value: 'requested', label: 'Requested' },
];

const serviceLabel = (type: CleaningType) =>
  SERVICE_OPTIONS.find((o) => o.value === type)?.label ?? type;

const neatnessLabel = (level: NeatnessLevel) =>
  NEATNESS_OPTIONS.find((o) => o.value === level)?.label ?? level;

const neatnessFromScore = (score: number): NeatnessLevel => {
  if (score >= 80) return 'clean';
  if (score >= 60) return 'moderate';
  if (score >= 40) return 'dirty';
  return 'very-dirty';
};

const scoreTone = (score: number) => {
  if (score >= 80) {
    return 'bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-900';
  }
  if (score >= 60) {
    return 'bg-yellow-100 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-800 hover:bg-yellow-200 dark:hover:bg-yellow-900';
  }
  return 'bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-900';
};

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function StudentRequest() {
  const { rooms, requestCleaning } = useHostel();
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [cleaningType, setCleaningType] = useState<CleaningType>('cleaning');
  const [neatnessLevel, setNeatnessLevel] = useState<NeatnessLevel>('moderate');
  const [neatnessTouched, setNeatnessTouched] = useState(false);
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RoomFilter>('all');
  const [history, setHistory] = useState<SubmittedRequest[]>([]);

  const formRef = useRef<HTMLDivElement>(null);
  const roomInputRef = useRef<HTMLInputElement>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const normalizedRoomId = selectedRoomId.trim().toUpperCase();

  const selectedRoom = useMemo(
    () => rooms.find((r) => String(r.id).toUpperCase() === normalizedRoomId),
    [rooms, normalizedRoomId]
  );

  const floors = useMemo(
    () => Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => Number(a) - Number(b)),
    [rooms]
  );

  const requestedRooms = useMemo(
    () =>
      rooms
        .filter((r) => r.studentRequestBoost)
        .sort((a, b) => a.cleanlinessScore - b.cleanlinessScore),
    [rooms]
  );

  const visibleRoomsByFloor = useMemo(() => {
    const query = search.trim().toUpperCase();
    return floors
      .map((floor) => ({
        floor,
        rooms: rooms.filter((room) => {
          if (room.floor !== floor) return false;
          if (query && !String(room.id).toUpperCase().includes(query)) return false;
          if (filter === 'attention' && room.cleanlinessScore >= 60) return false;
          if (filter === 'requested' && !room.studentRequestBoost) return false;
          return true;
        }),
      }))
      .filter((group) => group.rooms.length > 0);
  }, [floors, rooms, search, filter]);

  const roomError = useMemo(() => {
    if (!touched) return '';
    if (!normalizedRoomId) return 'Enter your room number to continue';
    if (!selectedRoom) return `Room ${normalizedRoomId} does not exist`;
    if (selectedRoom.studentRequestBoost) return `Room ${selectedRoom.id} already has an active request`;
    return '';
  }, [touched, normalizedRoomId, selectedRoom]);

  const canSubmit = !submitted && !!selectedRoom && !selectedRoom.studentRequestBoost;

  const pickRoom = useCallback(
    (roomId: string, score: number) => {
      setSelectedRoomId(roomId);
      setTouched(false);
      if (!neatnessTouched) setNeatnessLevel(neatnessFromScore(score));
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [neatnessTouched]
  );

  const handleRoomInput = (value: string) => {
    setSelectedRoomId(value.toUpperCase());
    const match = rooms.find((r) => String(r.id).toUpperCase() === value.trim().toUpperCase());
    if (match && !neatnessTouched) setNeatnessLevel(neatnessFromScore(match.cleanlinessScore));
  };

  const resetForm = useCallback(() => {
    clearTimeout(resetTimer.current);
    setSubmitted(false);
    setSelectedRoomId('');
    setCleaningType('cleaning');
    setNeatnessLevel('moderate');
    setNeatnessTouched(false);
    setAdditionalDetails('');
    setTouched(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!selectedRoom) {
      toast.error(normalizedRoomId ? `Room ${normalizedRoomId} does not exist` : 'Enter a room number');
      roomInputRef.current?.focus();
      return;
    }

    if (selectedRoom.studentRequestBoost) {
      toast.warning(`Room ${selectedRoom.id} already has an active request`);
      return;
    }

    requestCleaning(selectedRoom.id);
    setSubmitted(true);

    setHistory((prev) =>
      [
        {
          id: `${selectedRoom.id}-${Date.now()}`,
          roomId: String(selectedRoom.id),
          floor: selectedRoom.floor,
          cleaningType,
          neatnessLevel,
          details: additionalDetails.trim(),
          at: Date.now(),
        },
        ...prev,
      ].slice(0, HISTORY_LIMIT)
    );

    toast.success(`${serviceLabel(cleaningType)} request submitted for Room ${selectedRoom.id}`, {
      description: `Neatness: ${neatnessLabel(neatnessLevel)} • Priority boost applied (+${PRIORITY_BOOST})`,
    });

    resetTimer.current = setTimeout(resetForm, SUCCESS_RESET_MS);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && selectedRoomId) {
      e.preventDefault();
      setSelectedRoomId('');
      setTouched(false);
    }
  };

  const detailsRemaining = MAX_DETAILS - additionalDetails.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div ref={formRef} className="scroll-mt-24">
        <Card className="backdrop-blur-xl bg-gradient-to-br from-blue-50/80 to-purple-50/80 dark:from-blue-950/80 dark:to-purple-950/80 border-2 border-primary/20 shadow-2xl">
          <CardHeader>
            <CardTitle>Submit Cleaning Request</CardTitle>
            <CardDescription>
              Tell us about your room's condition and the type of service you need
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div className="space-y-2">
                <Label htmlFor="roomId">Room Number</Label>
                <div className="relative">
                  <Input
                    id="roomId"
                    ref={roomInputRef}
                    placeholder="e.g., 101, 205"
                    value={selectedRoomId}
                    onChange={(e) => handleRoomInput(e.target.value)}
                    onBlur={() => setTouched(true)}
                    onKeyDown={handleKeyDown}
                    disabled={submitted}
                    autoComplete="off"
                    aria-invalid={!!roomError}
                    aria-describedby="roomId-feedback"
                    className={`backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 pr-9 ${
                      roomError ? 'border-red-500 focus-visible:ring-red-500' : ''
                    }`}
                  />
                  {selectedRoomId && !submitted && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoomId('');
                        setTouched(false);
                        roomInputRef.current?.focus();
                      }}
                      aria-label="Clear room number"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div id="roomId-feedback" aria-live="polite" className="min-h-[1.25rem] text-xs">
                  {roomError ? (
                    <span className="flex items-center gap-1 text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      {roomError}
                    </span>
                  ) : selectedRoom ? (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      Floor {selectedRoom.floor} • Cleanliness score {selectedRoom.cleanlinessScore}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <Label id="service-label">Type of Service Needed</Label>
                <div
                  role="radiogroup"
                  aria-labelledby="service-label"
                  className="grid grid-cols-1 md:grid-cols-3 gap-3"
                >
                  {SERVICE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const active = cleaningType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setCleaningType(option.value)}
                        disabled={submitted}
                        className={`p-4 rounded-lg border-2 text-left backdrop-blur-sm transition-all motion-safe:hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 ${
                          active
                            ? 'border-primary bg-primary/10 shadow-lg'
                            : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:border-primary/50'
                        }`}
                      >
                        <Icon className={`h-5 w-5 mb-2 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="font-semibold text-sm">{option.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{option.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Current Room Neatness Level</Label>
                  {selectedRoom && !neatnessTouched && (
                    <span className="text-xs text-muted-foreground">Suggested from room score</span>
                  )}
                </div>
                <RadioGroup
                  value={neatnessLevel}
                  onValueChange={(value) => {
                    setNeatnessLevel(value as NeatnessLevel);
                    setNeatnessTouched(true);
                  }}
                  disabled={submitted}
                  className="grid grid-cols-2 md:grid-cols-4 gap-3"
                >
                  {NEATNESS_OPTIONS.map((option) => {
                    const active = neatnessLevel === option.value;
                    return (
                      <label
                        key={option.value}
                        className={`relative flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer backdrop-blur-sm transition-all motion-safe:hover:scale-[1.03] focus-within:ring-2 focus-within:ring-primary ${
                          active
                            ? `border-primary ${option.bgColor} shadow-lg`
                            : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:border-primary/50'
                        }`}
                      >
                        <RadioGroupItem value={option.value} className="sr-only" />
                        <div className={`font-semibold text-sm text-center ${active ? option.color : ''}`}>
                          {option.label}
                        </div>
                        {active && <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-primary" />}
                      </label>
                    );
                  })}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="details">Additional Details (Optional)</Label>
                <Textarea
                  id="details"
                  placeholder="Any specific areas or concerns you'd like to mention..."
                  value={additionalDetails}
                  maxLength={MAX_DETAILS}
                  onChange={(e) => setAdditionalDetails(e.target.value)}
                  disabled={submitted}
                  className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 min-h-[100px]"
                />
                <div
                  className={`text-xs text-right ${
                    detailsRemaining <= 30 ? 'text-orange-600' : 'text-muted-foreground'
                  }`}
                >
                  {additionalDetails.length}/{MAX_DETAILS}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" disabled={!canSubmit && !(touched && !submitted)} className="flex-1">
                  {submitted ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Request Submitted Successfully!
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Cleaning Request
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={!selectedRoomId && !additionalDetails && !neatnessTouched && cleaningType === 'cleaning'}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </form>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 backdrop-blur-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">How it works:</p>
                  <ul className="mt-2 space-y-1 text-blue-800 dark:text-blue-200">
                    <li>• Your request is added to the priority queue with +{PRIORITY_BOOST} urgency boost</li>
                    <li>• Staff will be assigned based on availability and priority</li>
                    <li>• The cleaning type and neatness level help optimize service</li>
                    <li>• Track your request status in the Active Requests section below</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl">
        <CardHeader>
          <CardTitle>Browse Available Rooms</CardTitle>
          <CardDescription>Click on your room to quickly fill in the form above</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative md:max-w-xs md:flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search rooms"
                aria-label="Search rooms"
                className="pl-9 bg-white/80 dark:bg-slate-900/80"
              />
            </div>
            <div role="group" aria-label="Filter rooms" className="flex flex-wrap gap-2">
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
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-green-300 bg-green-100 dark:border-green-800 dark:bg-green-950" />
              80+ clean
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-yellow-300 bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-950" />
              60–79 fair
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-red-300 bg-red-100 dark:border-red-800 dark:bg-red-950" />
              Below 60
            </span>
          </div>

          {visibleRoomsByFloor.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>No rooms match your search</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setSearch('');
                  setFilter('all');
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {visibleRoomsByFloor.map((group) => (
                <div key={group.floor} className="space-y-2">
                  <h3 className="font-semibold text-sm">Floor {group.floor}</h3>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {group.rooms.map((room) => {
                      const isSelected = normalizedRoomId === String(room.id).toUpperCase();
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => pickRoom(String(room.id), room.cleanlinessScore)}
                          disabled={submitted}
                          aria-pressed={isSelected}
                          aria-label={`Room ${room.id}, cleanliness score ${room.cleanlinessScore}${
                            room.studentRequestBoost ? ', request pending' : ''
                          }`}
                          className={`p-3 rounded-lg border-2 transition-all motion-safe:hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 ${scoreTone(
                            room.cleanlinessScore
                          )} ${isSelected ? 'ring-2 ring-primary motion-safe:scale-105' : ''}`}
                        >
                          <div className="font-bold text-sm">{room.id}</div>
                          <div className="text-xs opacity-75">{room.cleanlinessScore}</div>
                          {room.studentRequestBoost && (
                            <Badge variant="secondary" className="text-[8px] px-1 py-0 mt-1">
                              Requested
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Active Requests</CardTitle>
              <CardDescription>Rooms with pending cleaning requests, dirtiest first</CardDescription>
            </div>
            <Badge variant={requestedRooms.length ? 'destructive' : 'secondary'}>
              {requestedRooms.length} pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2" aria-live="polite">
            {requestedRooms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No active requests</p>
              </div>
            ) : (
              requestedRooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-orange-50 dark:bg-orange-950 backdrop-blur-sm transition-all motion-safe:hover:scale-[1.01]"
                >
                  <div>
                    <div className="font-semibold">Room {room.id}</div>
                    <div className="text-xs text-muted-foreground">
                      Floor {room.floor} • Score: {room.cleanlinessScore}
                    </div>
                  </div>
                  <Badge variant="destructive">Priority</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl">
          <CardHeader>
            <CardTitle>Your Recent Submissions</CardTitle>
            <CardDescription>Requests you submitted during this session</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {history.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-lg border bg-white/50 p-3 dark:bg-slate-800/50"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">
                      Room {item.roomId} • {serviceLabel(item.cleaningType)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Floor {item.floor} • {neatnessLabel(item.neatnessLevel)}
                    </div>
                    {item.details && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">{item.details}</p>
                    )}
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatTime(item.at)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

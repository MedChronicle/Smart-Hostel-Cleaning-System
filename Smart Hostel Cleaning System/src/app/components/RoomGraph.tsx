import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useHostel } from '../context/HostelContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import {
  Network,
  MapPin,
  Route,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  Download,
  Flame,
  Shuffle,
  X,
} from 'lucide-react';
import { calculateUrgency } from '../utils/data-structures';

interface GraphNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  cleanlinessScore: number;
  adjacentRooms: string[];
}

type StatusFilter = 'all' | 'clean' | 'moderate' | 'dirty';
type FloorFilter = 'all' | string;

interface HoverInfo {
  id: string;
  sx: number;
  sy: number;
}

const WIDTH = 800;
const HEIGHT = 600;
const MIN_SCALE = 0.4;
const MAX_SCALE = 3;
const NODE_RADIUS = 15;

const statusOf = (score: number): Exclude<StatusFilter, 'all'> => {
  if (score >= 80) return 'clean';
  if (score >= 60) return 'moderate';
  return 'dirty';
};

const colorHex = (score: number) => {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  return '#ef4444';
};

const colorClass = (score: number) => {
  if (score >= 80) return 'bg-green-500 border-green-600';
  if (score >= 60) return 'bg-yellow-500 border-yellow-600';
  return 'bg-red-500 border-red-600';
};

const textClass = (score: number) => {
  if (score >= 80) return 'text-green-700 dark:text-green-400';
  if (score >= 60) return 'text-yellow-700 dark:text-yellow-400';
  return 'text-red-700 dark:text-red-400';
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function RoomGraph() {
  const { rooms, roomGraph } = useHostel();

  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [cleaningPath, setCleaningPath] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'graph'>('grid');
  const [zoomDisplay, setZoomDisplay] = useState(1);
  const [search, setSearch] = useState('');
  const [floorFilter, setFloorFilter] = useState<FloorFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const nodeMapRef = useRef<Map<string, GraphNode>>(new Map());
  const alphaRef = useRef(1);
  const viewRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const dragRef = useRef<{
    mode: 'none' | 'node' | 'pan';
    nodeId: string | null;
    lastX: number;
    lastY: number;
    moved: boolean;
  }>({ mode: 'none', nodeId: null, lastX: 0, lastY: 0, moved: false });

  const liveRef = useRef({
    rooms,
    selectedRoom,
    cleaningPath,
    hoverId: null as string | null,
    matches: (_id: string) => true,
  });

  const floors = useMemo(
    () => Array.from(new Set(rooms.map((r) => String(r.floor)))).sort((a, b) => Number(a) - Number(b)),
    [rooms]
  );

  const roomMatches = useCallback(
    (room: (typeof rooms)[number]) => {
      if (search.trim() && !room.id.toLowerCase().includes(search.trim().toLowerCase())) return false;
      if (floorFilter !== 'all' && String(room.floor) !== floorFilter) return false;
      if (statusFilter !== 'all' && statusOf(room.cleanlinessScore) !== statusFilter) return false;
      return true;
    },
    [search, floorFilter, statusFilter]
  );

  const matchingIds = useMemo(
    () => new Set(rooms.filter(roomMatches).map((r) => r.id)),
    [rooms, roomMatches]
  );

  liveRef.current.rooms = rooms;
  liveRef.current.selectedRoom = selectedRoom;
  liveRef.current.cleaningPath = cleaningPath;
  liveRef.current.matches = (id: string) => matchingIds.has(id);

  const stats = useMemo(() => {
    const total = rooms.length;
    const counts = { clean: 0, moderate: 0, dirty: 0 };
    let sum = 0;
    let requests = 0;
    rooms.forEach((room) => {
      counts[statusOf(room.cleanlinessScore)] += 1;
      sum += room.cleanlinessScore;
      if (room.studentRequestBoost) requests += 1;
    });
    return {
      total,
      ...counts,
      average: total === 0 ? 0 : Math.round(sum / total),
      requests,
    };
  }, [rooms]);

  const handleRoomClick = useCallback(
    (roomId: string) => {
      setSelectedRoom(roomId);
      setCleaningPath(roomGraph.bfsCleaningPath(roomId, 8));
    },
    [roomGraph]
  );

  const clearSelection = () => {
    setSelectedRoom(null);
    setCleaningPath([]);
  };

  const selectMostUrgent = () => {
    const pool = rooms.filter(roomMatches);
    if (pool.length === 0) return;
    const top = pool.reduce((best, room) =>
      calculateUrgency(room) > calculateUrgency(best) ? room : best
    );
    handleRoomClick(top.id);
  };

  const resetFilters = () => {
    setSearch('');
    setFloorFilter('all');
    setStatusFilter('all');
  };

  const filtersActive = search !== '' || floorFilter !== 'all' || statusFilter !== 'all';

  const applyZoom = useCallback((factor: number, cx = WIDTH / 2, cy = HEIGHT / 2) => {
    const view = viewRef.current;
    const next = clamp(view.scale * factor, MIN_SCALE, MAX_SCALE);
    const ratio = next / view.scale;
    view.offsetX = cx - (cx - view.offsetX) * ratio;
    view.offsetY = cy - (cy - view.offsetY) * ratio;
    view.scale = next;
    setZoomDisplay(next);
  }, []);

  const resetView = () => {
    viewRef.current = { scale: 1, offsetX: 0, offsetY: 0 };
    setZoomDisplay(1);
  };

  const reheat = (value = 1) => {
    alphaRef.current = Math.max(alphaRef.current, value);
  };

  const shuffleLayout = () => {
    nodesRef.current.forEach((node) => {
      node.x = 60 + Math.random() * (WIDTH - 120);
      node.y = 60 + Math.random() * (HEIGHT - 120);
      node.vx = 0;
      node.vy = 0;
    });
    reheat(1);
  };

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'room-graph.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  useEffect(() => {
    if (viewMode !== 'graph') return;

    const existing = nodeMapRef.current;
    const next = new Map<string, GraphNode>();
    let added = false;

    rooms.forEach((room, index) => {
      const prev = existing.get(room.id);
      if (prev) {
        prev.cleanlinessScore = room.cleanlinessScore;
        if (prev.adjacentRooms.join('|') !== room.adjacentRooms.join('|')) added = true;
        prev.adjacentRooms = room.adjacentRooms;
        next.set(room.id, prev);
        return;
      }
      added = true;
      const angle = (index / Math.max(rooms.length, 1)) * Math.PI * 2;
      const radius = Math.min(WIDTH, HEIGHT) * 0.35;
      next.set(room.id, {
        id: room.id,
        x: WIDTH / 2 + Math.cos(angle) * radius,
        y: HEIGHT / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        cleanlinessScore: room.cleanlinessScore,
        adjacentRooms: room.adjacentRooms,
      });
    });

    if (next.size !== existing.size) added = true;

    nodeMapRef.current = next;
    nodesRef.current = Array.from(next.values());
    if (added) reheat(1);
  }, [rooms, viewMode]);

  useEffect(() => {
    if (viewMode !== 'graph') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;

    const step = () => {
      const alpha = alphaRef.current;
      const nodes = nodesRef.current;
      const map = nodeMapRef.current;
      const dragId = dragRef.current.mode === 'node' ? dragRef.current.nodeId : null;

      if (alpha > 0.005) {
        for (let i = 0; i < nodes.length; i += 1) {
          const node = nodes[i];
          let fx = (WIDTH / 2 - node.x) * 0.012;
          let fy = (HEIGHT / 2 - node.y) * 0.012;

          for (let j = 0; j < nodes.length; j += 1) {
            if (i === j) continue;
            const other = nodes[j];
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const distSq = dx * dx + dy * dy + 1;
            const dist = Math.sqrt(distSq);
            const force = 2600 / distSq;
            fx += (dx / dist) * force * 10;
            fy += (dy / dist) * force * 10;
          }

          for (let k = 0; k < node.adjacentRooms.length; k += 1) {
            const other = map.get(node.adjacentRooms[k]);
            if (!other) continue;
            const dx = other.x - node.x;
            const dy = other.y - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const pull = (dist - 90) * 0.02;
            fx += (dx / dist) * pull * 10;
            fy += (dy / dist) * pull * 10;
          }

          node.vx = clamp((node.vx + fx * alpha * 0.1) * 0.82, -12, 12);
          node.vy = clamp((node.vy + fy * alpha * 0.1) * 0.82, -12, 12);
        }

        nodes.forEach((node) => {
          if (node.id === dragId) return;
          node.x = clamp(node.x + node.vx, 30, WIDTH - 30);
          node.y = clamp(node.y + node.vy, 30, HEIGHT - 30);
        });

        alphaRef.current = alpha * 0.985;
      }

      const live = liveRef.current;
      const view = viewRef.current;
      const highlight = new Set<string>(live.cleaningPath);
      if (live.selectedRoom) highlight.add(live.selectedRoom);
      const roomIndex = new Map(live.rooms.map((r) => [r.id, r]));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.translate(view.offsetX, view.offsetY);
      ctx.scale(view.scale, view.scale);

      nodes.forEach((node) => {
        node.adjacentRooms.forEach((adjId) => {
          const other = map.get(adjId);
          if (!other || adjId < node.id) return;
          const onPath = highlight.has(node.id) && highlight.has(adjId);
          const visible = live.matches(node.id) && live.matches(adjId);
          ctx.globalAlpha = visible ? 1 : 0.12;
          ctx.strokeStyle = onPath ? '#a855f7' : '#94a3b8';
          ctx.lineWidth = onPath ? 3 : 1;
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(other.x, other.y);
          ctx.stroke();
        });
      });

      nodes.forEach((node) => {
        const room = roomIndex.get(node.id);
        if (!room) return;

        const isSelected = live.selectedRoom === node.id;
        const isInPath = live.cleaningPath.includes(node.id);
        const isHover = live.hoverId === node.id;
        const radius = isSelected ? 20 : isHover ? 18 : NODE_RADIUS;

        ctx.globalAlpha = live.matches(node.id) ? 1 : 0.18;

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = colorHex(node.cleanlinessScore);
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 4;
          ctx.stroke();
        } else if (isInPath) {
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 3;
          ctx.stroke();
        } else if (isHover) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.id, node.x, node.y);

        if (isInPath) {
          const order = live.cleaningPath.indexOf(node.id) + 1;
          ctx.beginPath();
          ctx.arc(node.x - radius * 0.7, node.y - radius * 0.7, 7, 0, Math.PI * 2);
          ctx.fillStyle = '#7c3aed';
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText(String(order), node.x - radius * 0.7, node.y - radius * 0.7);
        }

        if (room.studentRequestBoost) {
          ctx.beginPath();
          ctx.arc(node.x + radius * 0.7, node.y - radius * 0.7, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#f97316';
          ctx.fill();
        }
      });

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== 'graph') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (WIDTH / rect.width);
      const cy = (e.clientY - rect.top) * (HEIGHT / rect.height);
      applyZoom(e.deltaY < 0 ? 1.1 : 1 / 1.1, cx, cy);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [viewMode, applyZoom]);

  const toCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      cx: (e.clientX - rect.left) * (WIDTH / rect.width),
      cy: (e.clientY - rect.top) * (HEIGHT / rect.height),
      rect,
    };
  };

  const toWorld = (cx: number, cy: number) => {
    const view = viewRef.current;
    return { wx: (cx - view.offsetX) / view.scale, wy: (cy - view.offsetY) / view.scale };
  };

  const findNodeAt = (wx: number, wy: number) => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i -= 1) {
      const node = nodes[i];
      const dx = node.x - wx;
      const dy = node.y - wy;
      if (dx * dx + dy * dy <= 22 * 22) return node;
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { cx, cy } = toCanvasPoint(e);
    const { wx, wy } = toWorld(cx, cy);
    const node = findNodeAt(wx, wy);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      mode: node ? 'node' : 'pan',
      nodeId: node ? node.id : null,
      lastX: cx,
      lastY: cy,
      moved: false,
    };
    setHover(null);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { cx, cy, rect } = toCanvasPoint(e);
    const drag = dragRef.current;
    const view = viewRef.current;

    if (drag.mode === 'pan') {
      view.offsetX += cx - drag.lastX;
      view.offsetY += cy - drag.lastY;
      if (Math.abs(cx - drag.lastX) + Math.abs(cy - drag.lastY) > 1) drag.moved = true;
      drag.lastX = cx;
      drag.lastY = cy;
      e.currentTarget.style.cursor = 'grabbing';
      return;
    }

    if (drag.mode === 'node' && drag.nodeId) {
      const node = nodeMapRef.current.get(drag.nodeId);
      if (node) {
        const { wx, wy } = toWorld(cx, cy);
        if (Math.abs(cx - drag.lastX) + Math.abs(cy - drag.lastY) > 2) drag.moved = true;
        node.x = clamp(wx, 30, WIDTH - 30);
        node.y = clamp(wy, 30, HEIGHT - 30);
        node.vx = 0;
        node.vy = 0;
        reheat(0.3);
      }
      e.currentTarget.style.cursor = 'grabbing';
      return;
    }

    const { wx, wy } = toWorld(cx, cy);
    const node = findNodeAt(wx, wy);
    const nextId = node ? node.id : null;
    e.currentTarget.style.cursor = node ? 'pointer' : 'grab';

    if (nextId !== liveRef.current.hoverId) {
      liveRef.current.hoverId = nextId;
      if (node) {
        const ratio = rect.width / WIDTH;
        setHover({
          id: node.id,
          sx: (node.x * view.scale + view.offsetX) * ratio,
          sy: (node.y * view.scale + view.offsetY) * ratio,
        });
      } else {
        setHover(null);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (drag.mode === 'node' && drag.nodeId && !drag.moved) {
      handleRoomClick(drag.nodeId);
    }
    dragRef.current = { mode: 'none', nodeId: null, lastX: 0, lastY: 0, moved: false };
    e.currentTarget.releasePointerCapture(e.pointerId);
    e.currentTarget.style.cursor = 'grab';
  };

  const handlePointerLeave = () => {
    liveRef.current.hoverId = null;
    setHover(null);
  };

  const hoverRoom = hover ? rooms.find((r) => r.id === hover.id) : null;
  const selected = selectedRoom ? rooms.find((r) => r.id === selectedRoom) : null;

  const pathAverage = useMemo(() => {
    const items = cleaningPath
      .map((id) => rooms.find((r) => r.id === id))
      .filter((r): r is (typeof rooms)[number] => Boolean(r));
    if (items.length === 0) return null;
    return Math.round(items.reduce((sum, r) => sum + r.cleanlinessScore, 0) / items.length);
  }, [cleaningPath, rooms]);

  const statusButtons: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'clean', label: 'Clean' },
    { key: 'moderate', label: 'Moderate' },
    { key: 'dirty', label: 'Dirty' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-lg">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Average score</div>
            <div className={`text-xl font-bold ${textClass(stats.average)}`}>{stats.average}</div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-lg">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Clean</div>
            <div className="text-xl font-bold text-green-600">{stats.clean}</div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-lg">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Moderate</div>
            <div className="text-xl font-bold text-yellow-600">{stats.moderate}</div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-lg">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Dirty</div>
            <div className="text-xl font-bold text-red-600">{stats.dirty}</div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-lg col-span-2 md:col-span-1">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Student requests</div>
            <div className="text-xl font-bold text-orange-600">{stats.requests}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Room Graph Visualization
            </CardTitle>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'graph')}>
              <TabsList>
                <TabsTrigger value="grid">Grid View</TabsTrigger>
                <TabsTrigger value="graph">Graph View</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 p-3 backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 rounded-lg border">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search room"
                aria-label="Search room"
                className="h-8 w-36 rounded-md border bg-background pl-8 pr-2 text-sm"
              />
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

            <div className="flex gap-1" role="group" aria-label="Filter by cleanliness">
              {statusButtons.map((item) => (
                <Button
                  key={item.key}
                  size="sm"
                  variant={statusFilter === item.key ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(item.key)}
                >
                  {item.label}
                </Button>
              ))}
            </div>

            <div className="flex-1" />

            <span className="text-xs text-muted-foreground">
              {matchingIds.size} of {rooms.length} rooms
            </span>
            {filtersActive && (
              <Button size="sm" variant="ghost" onClick={resetFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={selectMostUrgent} disabled={matchingIds.size === 0}>
              <Flame className="h-4 w-4 mr-1" />
              Most urgent
            </Button>
          </div>

          {viewMode === 'grid' ? (
            <div className="space-y-6">
              {floors
                .filter((floor) => floorFilter === 'all' || floor === floorFilter)
                .map((floor) => {
                  const floorRooms = rooms.filter((r) => String(r.floor) === floor);
                  const floorAverage = Math.round(
                    floorRooms.reduce((sum, r) => sum + r.cleanlinessScore, 0) / Math.max(floorRooms.length, 1)
                  );

                  return (
                    <div key={floor} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <h3 className="font-semibold">Floor {floor}</h3>
                        <Badge variant="outline" className={textClass(floorAverage)}>
                          avg {floorAverage}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                        {floorRooms.map((room) => {
                          const isSelected = room.id === selectedRoom;
                          const isInPath = cleaningPath.includes(room.id);
                          const urgency = calculateUrgency(room);
                          const dimmed = !matchingIds.has(room.id);

                          return (
                            <button
                              key={room.id}
                              onClick={() => handleRoomClick(room.id)}
                              aria-label={`Room ${room.id}, cleanliness ${room.cleanlinessScore}, urgency ${urgency.toFixed(1)}`}
                              aria-pressed={isSelected}
                              title={`Urgency ${urgency.toFixed(1)}`}
                              className={`
                                relative p-3 rounded-lg border-2 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400
                                ${colorClass(room.cleanlinessScore)}
                                ${isSelected ? 'ring-4 ring-blue-500 scale-110' : ''}
                                ${isInPath && !isSelected ? 'ring-2 ring-purple-500' : ''}
                                ${dimmed ? 'opacity-20' : 'hover:scale-105'}
                              `}
                            >
                              <div className="text-white font-bold text-sm">{room.id}</div>
                              <div className="text-white text-xs opacity-90">{room.cleanlinessScore}</div>
                              {isInPath && (
                                <div className="absolute -top-1 -left-1 min-w-4 h-4 px-1 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">
                                  {cleaningPath.indexOf(room.id) + 1}
                                </div>
                              )}
                              {room.studentRequestBoost && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border border-white" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              {rooms.length > 0 && matchingIds.size === 0 && (
                <div className="text-center py-8 text-muted-foreground">No rooms match these filters</div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-muted-foreground">
                  Drag nodes to rearrange, drag the background to pan, scroll to zoom
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                    {Math.round(zoomDisplay * 100)}%
                  </span>
                  <Button variant="outline" size="sm" onClick={() => applyZoom(1 / 1.2)} aria-label="Zoom out">
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => applyZoom(1.2)} aria-label="Zoom in">
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={resetView} aria-label="Reset view">
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={shuffleLayout} aria-label="Shuffle layout">
                    <Shuffle className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportImage} aria-label="Export as PNG">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="relative border rounded-lg overflow-hidden backdrop-blur-sm bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <canvas
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerLeave}
                  className="block w-full touch-none cursor-grab"
                  style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
                />
                {hover && hoverRoom && (
                  <div
                    className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2 py-1 text-xs shadow-lg"
                    style={{ left: hover.sx, top: hover.sy - 26 }}
                  >
                    <div className="font-semibold">Room {hoverRoom.id}</div>
                    <div className={textClass(hoverRoom.cleanlinessScore)}>
                      Score {hoverRoom.cleanlinessScore} • Urgency {calculateUrgency(hoverRoom).toFixed(1)}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground p-3 backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 rounded border">
                <div className="font-semibold mb-1">Graph Features:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>• Node color shows cleanliness</div>
                  <div>• Lines show adjacency; purple lines trace the BFS path</div>
                  <div>• Numbered purple badges show cleaning order</div>
                  <div>• Orange dots indicate student requests</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Room {selected.id} Details</CardTitle>
                <Button size="sm" variant="ghost" onClick={clearSelection} aria-label="Clear selection">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const urgency = calculateUrgency(selected);
                const hoursSinceCleaning = Math.floor((Date.now() - selected.lastCleaned) / (1000 * 60 * 60));

                return (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Cleanliness Score</span>
                        <span className={`font-bold text-lg ${textClass(selected.cleanlinessScore)}`}>
                          {selected.cleanlinessScore}/100
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${clamp(selected.cleanlinessScore, 0, 100)}%`,
                            backgroundColor: colorHex(selected.cleanlinessScore),
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Urgency Score</span>
                      <span className="font-bold">{urgency.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant={selected.occupancyStatus ? 'default' : 'secondary'}>
                        {selected.occupancyStatus ? 'Occupied' : 'Vacant'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Last Cleaned</span>
                      <span className="text-sm">{hoursSinceCleaning}h ago</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Floor</span>
                      <span className="text-sm">{selected.floor}</span>
                    </div>
                    {selected.studentRequestBoost && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Student request</span>
                        <Badge className="bg-orange-500 text-white">Active</Badge>
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      <div className="text-sm text-muted-foreground mb-2">Adjacent Rooms</div>
                      <div className="flex flex-wrap gap-2">
                        {selected.adjacentRooms.map((adjId) => (
                          <Badge
                            key={adjId}
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => handleRoomClick(adjId)}
                          >
                            {adjId}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                BFS Cleaning Path
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Optimal traversal path through adjacent dirty rooms starting from Room {selected.id}
              </p>
              {cleaningPath.length > 0 ? (
                <div className="space-y-2">
                  {cleaningPath.map((roomId, index) => {
                    const room = rooms.find((r) => r.id === roomId);
                    if (!room) return null;

                    return (
                      <button
                        key={roomId}
                        onClick={() => handleRoomClick(roomId)}
                        className="w-full flex items-center gap-3 p-2 border rounded-lg backdrop-blur-sm hover:bg-accent transition-all text-left"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">Room {roomId}</div>
                          <div className="text-xs text-muted-foreground">
                            Score: {room.cleanlinessScore} • Floor {room.floor}
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${colorClass(room.cleanlinessScore)}`} />
                      </button>
                    );
                  })}
                  <div className="pt-2 flex justify-between text-xs text-muted-foreground">
                    <span>Total rooms in path: {cleaningPath.length}</span>
                    {pathAverage !== null && <span>Average score: {pathAverage}</span>}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No dirty adjacent rooms found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl">
        <CardHeader>
          <CardTitle>Color Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-green-500 border-2 border-green-600" />
              <span className="text-sm">Clean (80-100)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-yellow-500 border-2 border-yellow-600" />
              <span className="text-sm">Moderate (60-79)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-red-500 border-2 border-red-600" />
              <span className="text-sm">Dirty (&lt;60)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border-2 border-blue-500 ring-4 ring-blue-500" />
              <span className="text-sm">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border-2 border-purple-500 ring-2 ring-purple-500" />
              <span className="text-sm">In BFS Path</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-sm">Student request</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

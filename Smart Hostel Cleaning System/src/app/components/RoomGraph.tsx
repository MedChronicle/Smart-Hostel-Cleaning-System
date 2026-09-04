import React, { useState, useEffect, useRef } from 'react';
import { useHostel } from '../context/HostelContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Network, MapPin, Route, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
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

export function RoomGraph() {
  const { rooms, roomGraph } = useHostel();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [cleaningPath, setCleaningPath] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'graph'>('grid');
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const nodesRef = useRef<GraphNode[]>([]);

  const getCleanlinessColor = (score: number) => {
    if (score >= 80) return 'bg-green-500 border-green-600';
    if (score >= 60) return 'bg-yellow-500 border-yellow-600';
    return 'bg-red-500 border-red-600';
  };

  const getCleanlinessColorHex = (score: number) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    return '#ef4444';
  };

  const getCleanlinessTextColor = (score: number) => {
    if (score >= 80) return 'text-green-700 dark:text-green-400';
    if (score >= 60) return 'text-yellow-700 dark:text-yellow-400';
    return 'text-red-700 dark:text-red-400';
  };

  const handleRoomClick = (roomId: string) => {
    setSelectedRoom(roomId);
    // Calculate BFS cleaning path from this room
    const path = roomGraph.bfsCleaningPath(roomId, 8);
    setCleaningPath(path);
  };

  // Initialize force-directed graph
  useEffect(() => {
    if (viewMode !== 'graph' || rooms.length === 0) return;

    const width = 800;
    const height = 600;
    const centerX = width / 2;
    const centerY = height / 2;

    // Initialize nodes with physics properties
    const nodes: GraphNode[] = rooms.map((room, index) => {
      const angle = (index / rooms.length) * Math.PI * 2;
      const radius = Math.min(width, height) * 0.35;
      
      return {
        id: room.id,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        cleanlinessScore: room.cleanlinessScore,
        adjacentRooms: room.adjacentRooms
      };
    });

    setGraphNodes(nodes);
    nodesRef.current = nodes;
  }, [rooms, viewMode]);

  // Physics simulation
  useEffect(() => {
    if (viewMode !== 'graph' || !canvasRef.current || nodesRef.current.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const simulate = () => {
      // Apply forces
      const alpha = 0.3;
      const centerForce = 0.01;
      const repelForce = 3000;
      const attractForce = 0.01;
      const damping = 0.8;

      const currentNodes = nodesRef.current;
      const newNodes = currentNodes.map(node => {
        let fx = 0;
        let fy = 0;

        // Center force
        fx += (width / 2 - node.x) * centerForce;
        fy += (height / 2 - node.y) * centerForce;

        // Repel from other nodes
        currentNodes.forEach(other => {
          if (other.id === node.id) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const distSq = dx * dx + dy * dy + 1;
          const force = repelForce / distSq;
          fx += dx * force;
          fy += dy * force;
        });

        // Attract to connected nodes
        node.adjacentRooms.forEach(adjId => {
          const other = currentNodes.find(n => n.id === adjId);
          if (!other) return;
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          fx += dx * attractForce;
          fy += dy * attractForce;
        });

        // Update velocity and position
        const newVx = (node.vx + fx * alpha) * damping;
        const newVy = (node.vy + fy * alpha) * damping;
        const newX = Math.max(50, Math.min(width - 50, node.x + newVx));
        const newY = Math.max(50, Math.min(height - 50, node.y + newVy));

        return { ...node, x: newX, y: newY, vx: newVx, vy: newVy };
      });

      nodesRef.current = newNodes;
      setGraphNodes(newNodes);

      // Draw
      ctx.clearRect(0, 0, width, height);

      // Draw edges
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      newNodes.forEach(node => {
        node.adjacentRooms.forEach(adjId => {
          const other = newNodes.find(n => n.id === adjId);
          if (!other || adjId < node.id) return; // Draw each edge once

          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(other.x, other.y);
          ctx.stroke();
        });
      });

      // Draw nodes
      newNodes.forEach(node => {
        const room = rooms.find(r => r.id === node.id);
        if (!room) return;

        const isSelected = selectedRoom === node.id;
        const isInPath = cleaningPath.includes(node.id);
        const radius = isSelected ? 20 : 15;

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = getCleanlinessColorHex(node.cleanlinessScore);
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 4;
          ctx.stroke();
        } else if (isInPath) {
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Room label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.id, node.x, node.y);

        // Student request indicator
        if (room.studentRequestBoost) {
          ctx.beginPath();
          ctx.arc(node.x + radius * 0.7, node.y - radius * 0.7, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#f97316';
          ctx.fill();
        }
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    simulate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [rooms, selectedRoom, cleaningPath, viewMode]);

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find clicked node
    const clickedNode = graphNodes.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= 20;
    });

    if (clickedNode) {
      handleRoomClick(clickedNode.id);
    }
  };

  const floors = Array.from(new Set(rooms.map(r => r.floor))).sort();

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Room Graph Visualization
            </CardTitle>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList>
                <TabsTrigger value="grid">Grid View</TabsTrigger>
                <TabsTrigger value="graph">Graph View</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'grid' ? (
            <div className="space-y-6">
              {floors.map(floor => (
                <div key={floor} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <h3 className="font-semibold">Floor {floor}</h3>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {rooms
                      .filter(r => r.floor === floor)
                      .map(room => {
                        const isSelected = room.id === selectedRoom;
                        const isInPath = cleaningPath.includes(room.id);
                        const urgency = calculateUrgency(room);
                        
                        return (
                          <button
                            key={room.id}
                            onClick={() => handleRoomClick(room.id)}
                            className={`
                              relative p-3 rounded-lg border-2 transition-all
                              ${getCleanlinessColor(room.cleanlinessScore)}
                              ${isSelected ? 'ring-4 ring-blue-500 scale-110' : ''}
                              ${isInPath && !isSelected ? 'ring-2 ring-purple-500' : ''}
                              hover:scale-105
                            `}
                          >
                            <div className="text-white font-bold text-sm">
                              {room.id}
                            </div>
                            <div className="text-white text-xs opacity-90">
                              {room.cleanlinessScore}
                            </div>
                            {room.studentRequestBoost && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border border-white" />
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-muted-foreground">
                  Interactive force-directed graph • Click on nodes to explore
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setZoom(1)}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="border rounded-lg overflow-auto backdrop-blur-sm bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.2s' }}>
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    onClick={handleCanvasClick}
                    className="cursor-pointer mx-auto"
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground p-3 backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 rounded border">
                <div className="font-semibold mb-1">Graph Features:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>• Nodes represent rooms (color = cleanliness)</div>
                  <div>• Lines show adjacency relationships</div>
                  <div>• Click nodes to select and view BFS path</div>
                  <div>• Orange dots indicate student requests</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Room Details and Path */}
      {selectedRoom && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl">
            <CardHeader>
              <CardTitle>Room {selectedRoom} Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const room = rooms.find(r => r.id === selectedRoom);
                if (!room) return null;
                
                const urgency = calculateUrgency(room);
                const hoursSinceCleaning = Math.floor((Date.now() - room.lastCleaned) / (1000 * 60 * 60));

                return (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Cleanliness Score</span>
                      <span className={`font-bold text-lg ${getCleanlinessTextColor(room.cleanlinessScore)}`}>
                        {room.cleanlinessScore}/100
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Urgency Score</span>
                      <span className="font-bold">{urgency.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant={room.occupancyStatus ? "default" : "secondary"}>
                        {room.occupancyStatus ? 'Occupied' : 'Vacant'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Last Cleaned</span>
                      <span className="text-sm">{hoursSinceCleaning}h ago</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Floor</span>
                      <span className="text-sm">{room.floor}</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="text-sm text-muted-foreground mb-2">Adjacent Rooms</div>
                      <div className="flex flex-wrap gap-2">
                        {room.adjacentRooms.map(adjId => (
                          <Badge key={adjId} variant="outline" className="cursor-pointer" onClick={() => handleRoomClick(adjId)}>
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
                Optimal traversal path through adjacent dirty rooms starting from Room {selectedRoom}
              </p>
              {cleaningPath.length > 0 ? (
                <div className="space-y-2">
                  {cleaningPath.map((roomId, index) => {
                    const room = rooms.find(r => r.id === roomId);
                    if (!room) return null;

                    return (
                      <div
                        key={roomId}
                        className="flex items-center gap-3 p-2 border rounded-lg backdrop-blur-sm hover:bg-accent transition-all"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">Room {roomId}</div>
                          <div className="text-xs text-muted-foreground">
                            Score: {room.cleanlinessScore}
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${getCleanlinessColor(room.cleanlinessScore)}`} />
                      </div>
                    );
                  })}
                  <div className="pt-2 text-xs text-muted-foreground">
                    Total rooms in path: {cleaningPath.length}
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

      {/* Legend */}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
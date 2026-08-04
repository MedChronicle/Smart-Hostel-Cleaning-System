// Priority Queue Implementation (Max Heap)
export class PriorityQueue<T> {
  private heap: Array<{ priority: number; item: T }> = [];

  enqueue(item: T, priority: number): void {
    this.heap.push({ priority, item });
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue(): T | undefined {
    if (this.isEmpty()) return undefined;
    
    const max = this.heap[0];
    const end = this.heap.pop();
    
    if (this.heap.length > 0 && end) {
      this.heap[0] = end;
      this.bubbleDown(0);
    }
    
    return max.item;
  }

  peek(): { priority: number; item: T } | undefined {
    return this.heap[0];
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  size(): number {
    return this.heap.length;
  }

  getAll(): Array<{ priority: number; item: T }> {
    return [...this.heap].sort((a, b) => b.priority - a.priority);
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].priority <= this.heap[parentIndex].priority) break;
      
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let largest = index;

      if (leftChild < this.heap.length && this.heap[leftChild].priority > this.heap[largest].priority) {
        largest = leftChild;
      }

      if (rightChild < this.heap.length && this.heap[rightChild].priority > this.heap[largest].priority) {
        largest = rightChild;
      }

      if (largest === index) break;

      [this.heap[index], this.heap[largest]] = [this.heap[largest], this.heap[index]];
      index = largest;
    }
  }
}

// Queue Implementation
export class Queue<T> {
  private items: T[] = [];

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  peek(): T | undefined {
    return this.items[0];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  getAll(): T[] {
    return [...this.items];
  }
}

// Graph Node
export interface RoomNode {
  id: string;
  occupancyStatus: boolean;
  lastCleaned: number; // timestamp
  cleanlinessScore: number; // 0-100
  floor: number;
  adjacentRooms: string[]; // room IDs
  studentRequestBoost: boolean;
}

// Graph Implementation
export class RoomGraph {
  private nodes: Map<string, RoomNode> = new Map();

  addNode(room: RoomNode): void {
    this.nodes.set(room.id, room);
  }

  getNode(id: string): RoomNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): RoomNode[] {
    return Array.from(this.nodes.values());
  }

  updateNode(id: string, updates: Partial<RoomNode>): void {
    const node = this.nodes.get(id);
    if (node) {
      this.nodes.set(id, { ...node, ...updates });
    }
  }

  // BFS to find optimal cleaning path
  bfsCleaningPath(startRoomId: string, maxRooms: number = 5): string[] {
    const visited = new Set<string>();
    const queue: string[] = [startRoomId];
    const path: string[] = [];
    
    visited.add(startRoomId);
    
    while (queue.length > 0 && path.length < maxRooms) {
      const roomId = queue.shift()!;
      const room = this.nodes.get(roomId);
      
      if (!room) continue;
      
      // Only include dirty rooms (cleanliness < 70)
      if (room.cleanlinessScore < 70) {
        path.push(roomId);
      }
      
      // Add adjacent rooms to queue
      for (const adjId of room.adjacentRooms) {
        if (!visited.has(adjId)) {
          visited.add(adjId);
          queue.push(adjId);
        }
      }
    }
    
    return path;
  }

  // Dijkstra's algorithm for shortest path
  dijkstraPath(startRoomId: string, targetRoomId: string): string[] {
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set(this.nodes.keys());
    
    // Initialize distances
    for (const id of this.nodes.keys()) {
      distances.set(id, Infinity);
      previous.set(id, null);
    }
    distances.set(startRoomId, 0);
    
    while (unvisited.size > 0) {
      // Find node with minimum distance
      let current: string | null = null;
      let minDist = Infinity;
      for (const id of unvisited) {
        const dist = distances.get(id)!;
        if (dist < minDist) {
          minDist = dist;
          current = id;
        }
      }
      
      if (current === null || current === targetRoomId) break;
      
      unvisited.delete(current);
      const currentNode = this.nodes.get(current)!;
      
      // Update distances to neighbors
      for (const neighbor of currentNode.adjacentRooms) {
        if (unvisited.has(neighbor)) {
          const alt = distances.get(current)! + 1; // Edge weight = 1
          if (alt < distances.get(neighbor)!) {
            distances.set(neighbor, alt);
            previous.set(neighbor, current);
          }
        }
      }
    }
    
    // Reconstruct path
    const path: string[] = [];
    let curr: string | null = targetRoomId;
    while (curr !== null) {
      path.unshift(curr);
      curr = previous.get(curr) || null;
    }
    
    return path[0] === startRoomId ? path : [];
  }
}

// Cleaning History Entry
export interface CleaningHistoryEntry {
  timestamp: number;
  staffId: string;
  scoreBefore: number;
  scoreAfter: number;
  duration: number; // minutes
}

// HashMap for Historical Tracking
export class CleaningHistoryMap {
  private history: Map<string, CleaningHistoryEntry[]> = new Map();

  addEntry(roomId: string, entry: CleaningHistoryEntry): void {
    if (!this.history.has(roomId)) {
      this.history.set(roomId, []);
    }
    this.history.get(roomId)!.push(entry);
  }

  getHistory(roomId: string): CleaningHistoryEntry[] {
    return this.history.get(roomId) || [];
  }

  getAllHistory(): Map<string, CleaningHistoryEntry[]> {
    return new Map(this.history);
  }

  getAverageCleanlinessScore(roomId: string): number {
    const entries = this.history.get(roomId);
    if (!entries || entries.length === 0) return 0;
    
    const sum = entries.reduce((acc, entry) => acc + entry.scoreAfter, 0);
    return sum / entries.length;
  }

  getDegradationRate(roomId: string): number {
    const entries = this.history.get(roomId);
    if (!entries || entries.length < 2) return 0;
    
    // Calculate average score drop per day
    let totalDegradation = 0;
    let count = 0;
    
    for (let i = 1; i < entries.length; i++) {
      const timeDiff = (entries[i].timestamp - entries[i - 1].timestamp) / (1000 * 60 * 60 * 24);
      const scoreDiff = entries[i - 1].scoreAfter - entries[i].scoreBefore;
      
      if (timeDiff > 0) {
        totalDegradation += scoreDiff / timeDiff;
        count++;
      }
    }
    
    return count > 0 ? totalDegradation / count : 0;
  }

  getCleaningFrequency(roomId: string, days: number = 30): number {
    const entries = this.history.get(roomId);
    if (!entries || entries.length === 0) return 0;
    
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    const recentEntries = entries.filter(e => e.timestamp >= cutoffTime);
    
    return recentEntries.length / days;
  }
}

// Staff Member
export interface StaffMember {
  id: string;
  name: string;
  status: 'available' | 'busy';
  currentTask?: string; // room ID
  tasksCompleted: number;
  efficiency: number; // 0-100
}

// Calculate urgency score
export function calculateUrgency(
  room: RoomNode,
  requestBoost: boolean = false
): number {
  const hoursSinceLastCleaned = (Date.now() - room.lastCleaned) / (1000 * 60 * 60);
  
  let urgency = 
    (100 - room.cleanlinessScore) + 
    (hoursSinceLastCleaned * 2) + 
    (room.occupancyStatus ? 20 : 0);
  
  if (requestBoost || room.studentRequestBoost) {
    urgency += 30;
  }
  
  return urgency;
}

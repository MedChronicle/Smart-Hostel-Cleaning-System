# Smart Hostel Cleaning & Resource Optimization System
## Data Structures & Algorithms Implementation Guide

This document details all DSA concepts implemented in the system and how they solve real-world hostel management problems.

---

## 🔧 Core Data Structures

### 1. Priority Queue (Max Heap)
**Location:** `/src/app/utils/data-structures.ts` - `PriorityQueue<T>` class

**Purpose:** Schedules cleaning tasks ranked by urgency score

**Implementation:**
- Binary max heap using array representation
- Parent at index `i`, children at `2i+1` and `2i+2`
- O(log n) insertion and extraction
- O(1) peek operation

**Urgency Score Formula:**
```typescript
urgency = (100 - cleanlinessScore) 
        + (hoursSinceLastCleaned × 2) 
        + (occupancyBonus: 20 if occupied)
        + (requestBoost: 30 if student requested)
```

**Operations:**
- `enqueue(item, priority)` - Insert with O(log n) bubble-up
- `dequeue()` - Extract max with O(log n) bubble-down
- `peek()` - View highest priority without removal
- `getAll()` - Return sorted array of all items

**Real-world Application:**
- Automatically prioritizes dirtiest rooms
- Accounts for time since last cleaning
- Boosts priority for occupied rooms
- Handles student emergency requests

---

### 2. Graph Structure
**Location:** `/src/app/utils/data-structures.ts` - `RoomGraph` class

**Purpose:** Models hostel rooms as nodes with adjacency relationships

**Node Structure:**
```typescript
interface RoomNode {
  id: string;
  occupancyStatus: boolean;
  lastCleaned: number;
  cleanlinessScore: number;
  floor: number;
  adjacentRooms: string[]; // Edge list
  studentRequestBoost: boolean;
}
```

**Graph Type:** Undirected, unweighted graph (adjacency list representation)

**Adjacency Rules:**
- Horizontal neighbors (same floor)
- Vertical neighbors (same room number, different floors)
- Typical node has 2-4 edges

---

### 3. BFS (Breadth-First Search)
**Location:** `RoomGraph.bfsCleaningPath()` method

**Purpose:** Find optimal traversal path through adjacent dirty rooms

**Algorithm:**
```
1. Start from assigned room
2. Use queue for level-order traversal
3. Visit adjacent rooms in breadth-first order
4. Only include rooms with cleanlinessScore < 70
5. Limit path to maxRooms (default: 5-8)
```

**Time Complexity:** O(V + E) where V = vertices, E = edges
**Space Complexity:** O(V) for visited set and queue

**Real-world Application:**
- Minimizes staff walking distance
- Groups nearby dirty rooms
- Creates efficient cleaning routes
- Reduces context switching

---

### 4. Dijkstra's Algorithm
**Location:** `RoomGraph.dijkstraPath()` method

**Purpose:** Find shortest path between any two rooms

**Implementation:**
- Unweighted graph (edge weight = 1)
- Priority-based node selection
- Reconstructs path using previous pointers

**Time Complexity:** O((V + E) log V) with binary heap
**Space Complexity:** O(V) for distance and previous maps

**Use Case:**
- Calculate optimal staff assignment routes
- Estimate time to reach emergency requests
- Plan multi-room cleaning sequences

---

### 5. Queue (FIFO)
**Location:** `/src/app/utils/data-structures.ts` - `Queue<T>` class

**Purpose:** Manage available cleaning staff in fair order

**Operations:**
- `enqueue(staff)` - Add staff to back of queue
- `dequeue()` - Assign front staff to task
- `peek()` - View next available staff

**Fairness Guarantee:**
- Staff assigned in order of availability
- After completing task, staff re-enters queue
- Ensures even task distribution

**Real-world Application:**
- Fair workload distribution
- Prevents staff burnout
- Tracks availability status
- Maintains task completion metrics

---

### 6. HashMap (Historical Tracking)
**Location:** `/src/app/utils/data-structures.ts` - `CleaningHistoryMap` class

**Purpose:** Store complete cleaning history per room

**Data Structure:**
```typescript
Map<string, CleaningHistoryEntry[]>
// roomId → array of history entries
```

**Entry Structure:**
```typescript
interface CleaningHistoryEntry {
  timestamp: number;
  staffId: string;
  scoreBefore: number;
  scoreAfter: number;
  duration: number;
}
```

**Analytics Methods:**
- `getAverageCleanlinessScore(roomId)` - Historical average
- `getDegradationRate(roomId)` - Score drop per day
- `getCleaningFrequency(roomId, days)` - Cleanings per period

**Time Complexity:**
- Insertion: O(1) average
- Retrieval: O(1) average
- Analytics: O(n) where n = history entries

**Real-world Application:**
- Track room maintenance patterns
- Identify problem rooms
- Performance metrics for staff
- Predict future cleaning needs

---

## 🎯 Key Features

### Predictive Analysis
**Algorithm:** Statistical analysis on HashMap data

```typescript
degradationRate = Σ(scoreAfter[i-1] - scoreBefore[i]) / timeDiff
```

**Identifies:**
- Rooms that degrade faster than average
- Rooms needing pre-scheduled cleaning
- Patterns in occupancy vs. cleanliness

**Action:** Auto-boost urgency for high-risk rooms

---

### Student Request System
**Flow:**
1. Student submits room ID
2. System adds +30 urgency boost
3. Room re-evaluated in priority queue
4. Flag set: `studentRequestBoost = true`
5. Staff assigned from queue in FIFO order

**Priority Queue Update:**
- Old urgency score removed
- New score calculated with boost
- Heap property restored via bubble-up

---

### QR Code Verification
**Technology:** `qrcode` library

**Data Encoded:**
```json
{
  "roomId": "101",
  "timestamp": 1680000000000,
  "type": "cleaning_verification"
}
```

**Verification Flow:**
1. Staff completes cleaning
2. Scan room-specific QR code
3. System validates room ID match
4. Auto-updates cleanliness score
5. Logs entry to HashMap
6. Staff returned to available queue

---

## 📊 Complexity Analysis

| Operation | Time | Space | Notes |
|-----------|------|-------|-------|
| Add to priority queue | O(log n) | O(1) | Bubble-up operation |
| Extract max urgency | O(log n) | O(1) | Bubble-down operation |
| BFS traversal | O(V + E) | O(V) | V=rooms, E=adjacencies |
| Dijkstra shortest path | O((V+E) log V) | O(V) | With binary heap |
| Staff queue assign | O(1) | O(1) | FIFO dequeue |
| History lookup | O(1) | O(1) | HashMap access |
| Calculate degradation | O(k) | O(1) | k=history entries |

---

## 🔄 System Workflow

```
1. INITIALIZATION
   ├─ Load rooms into Graph (32 rooms, 4 floors)
   ├─ Calculate urgency for each room
   ├─ Populate Priority Queue (dirty rooms only)
   └─ Enqueue available staff to Staff Queue

2. STUDENT REQUEST
   ├─ Student submits room ID
   ├─ Calculate urgency with +30 boost
   ├─ Insert into Priority Queue
   └─ Update room.studentRequestBoost flag

3. TASK ASSIGNMENT
   ├─ Dequeue highest urgency room
   ├─ Dequeue next available staff
   ├─ Update staff.status = 'busy'
   ├─ Calculate BFS cleaning path
   └─ Assign task to staff

4. TASK COMPLETION
   ├─ Staff scans QR code or manual entry
   ├─ Update room.cleanlinessScore
   ├─ Update room.lastCleaned timestamp
   ├─ Add entry to History HashMap
   ├─ Update staff.tasksCompleted++
   ├─ Set staff.status = 'available'
   ├─ Re-enqueue staff to Staff Queue
   └─ Refresh Priority Queue

5. ANALYTICS & PREDICTION
   ├─ Query HashMap for room histories
   ├─ Calculate degradation rates
   ├─ Identify high-risk rooms
   └─ Generate predictive insights
```

---

## 🎓 Educational Value

This system demonstrates:

1. **Priority Queue (Heaps)** - Dynamic task scheduling
2. **Graph Theory** - Spatial relationship modeling
3. **BFS** - Optimal pathfinding in unweighted graphs
4. **Dijkstra** - Shortest path algorithms
5. **Queue (FIFO)** - Fair resource allocation
6. **HashMap** - Efficient data storage and retrieval
7. **Time Complexity** - Real-world performance considerations
8. **Space-Time Tradeoffs** - Caching vs. recalculation

---

## 📈 Performance Optimizations

1. **Lazy Priority Queue Updates**
   - Only recalculate when task completed or requested
   - Avoids O(n log n) full rebuilds

2. **BFS Path Caching**
   - Cache paths for frequently cleaned areas
   - Reduces repeated traversals

3. **HashMap Indexing**
   - Direct O(1) room history access
   - Avoids linear searches

4. **LocalStorage Persistence**
   - State survives page refreshes
   - Reduces initialization overhead

---

## 🚀 Future Enhancements

1. **A* Search** - Heuristic-based pathfinding
2. **Minimum Spanning Tree** - Optimal floor coverage
3. **Dynamic Programming** - Optimal scheduling over time windows
4. **Machine Learning** - Predict degradation patterns
5. **Concurrent Processing** - Multi-staff parallel assignments

---

## 📝 Code Locations

- **Data Structures:** `/src/app/utils/data-structures.ts`
- **Storage/Persistence:** `/src/app/utils/storage.ts`
- **Mock Data Generator:** `/src/app/utils/mock-data.ts`
- **Context/State Management:** `/src/app/context/HostelContext.tsx`
- **UI Components:** `/src/app/components/`
- **Dashboard:** Dashboard.tsx
- **Graph Visualization:** RoomGraph.tsx
- **Student Interface:** StudentRequest.tsx
- **Staff Interface:** StaffView.tsx
- **Analytics:** Analytics.tsx

---

Built with ❤️ to demonstrate practical DSA applications in real-world systems.

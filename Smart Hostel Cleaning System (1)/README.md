# Smart Hostel Cleaning & Resource Optimization System

A comprehensive web application demonstrating practical applications of Data Structures & Algorithms (DSA) in solving real-world campus problems. This system manages hostel room cleaning through intelligent task scheduling, optimal pathfinding, and predictive analytics.

## 🎯 Project Overview

This project models a hostel cleaning management system where:
- **32 rooms** across 4 floors need regular cleaning
- **6 staff members** handle cleaning tasks
- **Urgency-based scheduling** prioritizes critical rooms
- **Graph traversal** optimizes cleaning routes
- **Historical data** enables predictive maintenance

## 🔧 Core DSA Implementations

### 1. Priority Queue (Max Heap)
**File:** `/src/app/utils/data-structures.ts`

Implements a binary max heap for urgency-based task scheduling.

```typescript
urgency = (100 - cleanlinessScore) 
        + (hoursSinceLastCleaned × 2) 
        + (occupiedBonus: 20) 
        + (requestBoost: 30)
```

**Operations:**
- `enqueue(item, priority)`: O(log n)
- `dequeue()`: O(log n)
- `peek()`: O(1)

**Real-world Application:** Automatically prioritizes rooms that are dirtiest, occupied, or have student requests.

### 2. Graph Structure
**File:** `/src/app/utils/data-structures.ts`

Models rooms as nodes with adjacency relationships (horizontal and vertical neighbors).

**Implementation:**
- Adjacency list representation
- Undirected, unweighted graph
- Each node stores room metadata (cleanliness, occupancy, last cleaned)

### 3. BFS (Breadth-First Search)
**Method:** `RoomGraph.bfsCleaningPath()`

Finds optimal cleaning path through adjacent dirty rooms.

```typescript
// Example usage
const path = roomGraph.bfsCleaningPath('101', 8);
// Returns: ['101', '102', '201', '202', ...]
```

**Complexity:** O(V + E)
**Use Case:** Minimize staff walking distance by grouping nearby dirty rooms

### 4. Dijkstra's Algorithm
**Method:** `RoomGraph.dijkstraPath()`

Calculates shortest path between any two rooms.

**Complexity:** O((V + E) log V)
**Use Case:** Estimate travel time for emergency cleaning requests

### 5. FIFO Queue
**File:** `/src/app/utils/data-structures.ts`

Manages staff availability with fair assignment.

**Guarantee:** Staff assigned in order of availability; re-enter queue after task completion

### 6. HashMap
**Class:** `CleaningHistoryMap`

Stores complete cleaning history per room for analytics.

```typescript
Map<roomId, CleaningHistoryEntry[]>
```

**Analytics Methods:**
- `getAverageCleanlinessScore()`: Historical average
- `getDegradationRate()`: Score drop per day
- `getCleaningFrequency()`: Cleanings per time period

## 🚀 Features

### ✅ Real-Time Dashboard
- Live priority queue visualization
- Staff availability tracking
- System statistics (avg cleanliness, pending tasks)
- Auto-simulation mode

### ✅ Room Graph Visualization
- Color-coded cleanliness levels (green/yellow/red)
- Interactive room selection
- BFS path visualization
- Floor-wise grid layout

### ✅ Student Request System
- Submit cleaning requests for specific rooms
- +30 urgency boost for student requests
- Real-time priority queue updates

### ✅ Staff View
- Task completion interface
- QR code verification
- Performance tracking (tasks completed, efficiency)
- Active task monitoring

### ✅ Analytics Dashboard
- Floor-wise cleanliness statistics
- Cleaning trend over time
- Cleanliness distribution (pie chart)
- Most cleaned rooms

### ✅ Predictive Analysis
- Identifies high-risk rooms using degradation rate
- Recommends pre-emptive cleaning schedules
- Historical pattern recognition

### ✅ Auto-Simulation
- Watches the system operate autonomously
- Simulates task assignments, completions, requests, and degradation
- Adjustable speed (slow/normal/fast)

## 📁 Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── Dashboard.tsx          # Main dashboard
│   │   ├── RoomGraph.tsx          # Graph visualization
│   │   ├── StudentRequest.tsx     # Student interface
│   │   ├── StaffView.tsx          # Staff interface
│   │   ├── Analytics.tsx          # Analytics & charts
│   │   ├── QuickGuide.tsx         # User guide
│   │   ├── SimulationControls.tsx # Auto-simulation
│   │   ├── Layout.tsx             # App layout
│   │   └── WelcomeDialog.tsx      # Welcome screen
│   ├── context/
│   │   └── HostelContext.tsx      # State management
│   ├── utils/
│   │   ├── data-structures.ts     # Core DSA implementations
│   │   ├── storage.ts             # LocalStorage persistence
│   │   └── mock-data.ts           # Data generation
│   ├── routes.tsx                 # React Router config
│   └── App.tsx                    # Entry point
```

## 🎓 Educational Value

This project demonstrates:

1. **Priority Queues** optimize task scheduling in resource-constrained environments
2. **Graph Algorithms** minimize travel distance and optimize routing
3. **FIFO Queues** ensure fairness in workload distribution
4. **HashMaps** enable O(1) data retrieval for analytics
5. **Time Complexity** matters in real-time systems
6. **Space-Time Tradeoffs** between caching and recalculation

## 🛠️ Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **React Router 7** - Navigation
- **Recharts** - Data visualization
- **Tailwind CSS v4** - Styling
- **Radix UI** - Accessible components
- **QRCode** - QR verification
- **Sonner** - Toast notifications

## 💾 Data Persistence

All data is stored in **LocalStorage**:
- Room states (cleanliness scores, last cleaned)
- Staff information (tasks completed, efficiency)
- Complete cleaning history
- Survives page refreshes

## 🎮 How to Use

### 1. Dashboard
- View live priority queue and staff availability
- Click "Assign Task" to manually assign cleaning
- Enable simulation mode to auto-run the system

### 2. Room Graph
- Click any room to view details and adjacency
- See BFS cleaning path from selected room
- Color coding: Green (clean), Yellow (moderate), Red (dirty)

### 3. Student Request
- Enter room number or click on room grid
- Submit request for +30 urgency boost
- View active requests

### 4. Staff View
- Select staff member and room from dropdowns
- Adjust new cleanliness score (60-100)
- Enter duration and complete task
- Optional: Scan QR code for verification

### 5. Analytics
- View trends, distribution, and history
- Identify high-risk rooms in predictive analysis
- See floor-wise statistics

## 📊 Complexity Analysis

| Operation | Time | Space |
|-----------|------|-------|
| Priority Queue Insert | O(log n) | O(1) |
| Priority Queue Extract | O(log n) | O(1) |
| BFS Traversal | O(V + E) | O(V) |
| Dijkstra Path | O((V+E) log V) | O(V) |
| Staff Queue Assign | O(1) | O(1) |
| History Lookup | O(1) | O(1) |
| Degradation Calc | O(k) | O(1) |

*where V=rooms, E=edges, k=history entries*

## 🔮 Future Enhancements

- **A* Search Algorithm** for heuristic pathfinding
- **Minimum Spanning Tree** for optimal floor coverage
- **Dynamic Programming** for scheduling optimization
- **Machine Learning** for degradation prediction
- **Real-time Collaboration** with WebSockets

## 📝 Documentation

See `/DSA_DOCUMENTATION.md` for detailed DSA implementation guide.

## 🤝 Contributing

This is an educational project demonstrating DSA concepts. Feel free to:
- Add new algorithms (A*, MST, DP)
- Improve visualizations
- Add more analytics features
- Enhance the simulation

## 📄 License

MIT License - Feel free to use for educational purposes

---

**Built with ❤️ to demonstrate practical DSA applications in real-world systems**

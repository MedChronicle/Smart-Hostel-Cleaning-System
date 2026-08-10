#  Smart Hostel Cleaning & Resource Optimization System

A smart hostel management system that uses **Data Structures and Algorithms (DSA)** to solve a simple but realistic problem: **How can we make hostel cleaning faster, fairer, and more efficient?**

Instead of treating DSA as just theory, this project puts concepts like **Priority Queues, Graphs, BFS, Dijkstra, Queues, and HashMaps** into an actual working application.

The system simulates a hostel where rooms become dirty over time, students can request cleaning, staff receive tasks based on urgency, and the system can find efficient routes between rooms.

---

##  What is this project about?

Managing cleaning in a large hostel can become difficult when there are many rooms and only a limited number of cleaning staff.

For example:

* Which room should be cleaned first?
* Which staff member should get the next task?
* What is the shortest route to a room?
* Which rooms are becoming dirty more frequently?
* Can we predict which rooms may need cleaning soon?

Our system tries to answer these questions using DSA.

The application represents a hostel with:

* **32 rooms**
* **4 floors**
* **6 cleaning staff members**
* Different levels of room cleanliness
* Student cleaning requests
* Automatic task scheduling
* Route optimization
* Cleaning history and analytics

The entire system works as a **simulation**, so you can actually see the algorithms making decisions in real time.

---

#  Main Features

###  Live Dashboard

The dashboard gives an overview of what's happening in the hostel.

You can see:

* Current cleaning tasks
* Priority of each room
* Available and busy staff
* Number of pending requests
* Overall hostel cleanliness
* System statistics

The priority queue continuously decides which room needs attention first.

---

###  Room Graph

The hostel is represented as a **graph**.

Each room acts as a **node**, while connections between neighboring rooms act as **edges**.

The graph view allows you to:

* Select rooms
* View their neighboring rooms
* See room cleanliness through colors
* Visualize cleaning routes
* Run BFS to find nearby rooms that need cleaning
* Use Dijkstra to find the shortest route between rooms

This makes it easier to understand how graph algorithms work in a real-world situation.

---

###  Student Cleaning Requests

Students can select their room and request cleaning.

When a request is submitted, the room gets an additional priority boost.

For example, a room that is already dirty and has a student request will move higher in the cleaning queue.

This means urgent requests don't simply wait behind normal tasks.

---

###  Staff View

Cleaning staff have their own interface where they can:

1. View available tasks
2. Select a room
3. Travel to the room
4. Clean it
5. Enter the new cleanliness score
6. Record the cleaning duration
7. Complete the task

A QR verification option is also included to simulate verification before completing a task.

---

###  Analytics

The analytics section helps us understand what has been happening over time.

It shows things such as:

* Cleanliness trends
* Floor-wise cleanliness
* Most frequently cleaned rooms
* Room cleanliness distribution
* Cleaning history
* Rooms that may become problematic in the future

This makes the project more than just a task scheduler — it also gives us an idea of how historical data can be used for better maintenance decisions.

---

###  Auto Simulation

Don't want to manually operate everything?

The system can run automatically.

In simulation mode:

* Rooms gradually become dirty
* New cleaning requests appear
* Tasks are added to the priority queue
* Staff members pick up tasks
* Cleaning is completed
* Room cleanliness improves
* The process continues automatically

You can change the simulation speed to **slow, normal, or fast**.

This makes it easy to demonstrate the complete system during a project presentation.

---

# DSA used

The main purpose of this project is to show that DSA isn't only about solving textbook problems.

We use different data structures depending on what the system needs to do.

---

## 1. Priority Queue — Max Heap

The most important question is:

> **Which room should be cleaned first?**

For this, we use a **Max Heap based Priority Queue**.

Every room receives an urgency score based on factors such as:

```text
Urgency =
(100 - Cleanliness Score)
+ (Hours Since Last Cleaning × 2)
+ Occupied Room Bonus
+ Student Request Boost
```

So a very dirty room will naturally receive a higher priority.

A room with a student request also gets an additional boost.

### Complexity

* Insert task → **O(log n)**
* Remove highest-priority task → **O(log n)**
* Check highest-priority task → **O(1)**

This ensures that the most urgent cleaning task can be found efficiently.

---

# 2. Graph

We represent the hostel as a **Graph**.

Think of it like a hostel map:

```text
Room 101 ─── Room 102 ─── Room 103
   │             │             │
Room 201 ─── Room 202 ─── Room 203
```

Each room is a **vertex/node**.

The connection between two neighboring rooms is an **edge**.

This allows us to use graph algorithms to plan staff movement.

---

## BFS — Breadth First Search

BFS is useful when we want to explore rooms level by level.

In our system, BFS can help identify nearby rooms that also require cleaning.

For example:

```text
Starting Room
     ↓
Nearby Rooms
     ↓
Next Level Rooms
     ↓
Further Rooms
```

This can help create a cleaning route that covers nearby dirty rooms together.

### Complexity

**O(V + E)**

Where:

* V = number of rooms
* E = connections between rooms

---

## Dijkstra's Algorithm

Sometimes a staff member needs to reach a particular room as quickly as possible.

For this, we use **Dijkstra's shortest path algorithm**.

For example:

```text
Staff Room
    ↓
Room A
    ↓
Room B
    ↓
Target Room
```

The algorithm calculates the shortest available route.

This can be especially useful when a student submits an urgent cleaning request.

### Complexity

**O((V + E) log V)**

---

# 3. FIFO Queue

We don't want the same staff member to keep getting every task.

So we maintain a **FIFO Queue** for staff assignment.

FIFO means:

> **First In, First Out**

The staff member who has been waiting the longest gets the next available task.

Once they finish, they go back into the queue.

This keeps staff assignment relatively fair.

### Complexity

* Enqueue → **O(1)**
* Dequeue → **O(1)**

---

# 4. HashMap

The system also needs to remember what happened to every room.

For example:

```text
Room 101
→ Cleaned 3 times
→ Average cleanliness: 82
→ Last cleaned: 5 hours ago
→ Degradation rate: Medium
```

For this, we use a **HashMap**.

The room number acts as the key, while its cleaning history is stored as the value.

This gives us fast access to room history.

### Complexity

Average lookup:

**O(1)**

The stored history is then used to calculate:

* Average cleanliness
* Cleaning frequency
* Degradation rate
* Maintenance risk

---

# 🛠️ Technology Used

The project is built using modern web technologies:

* **React** — building the user interface
* **TypeScript** — safer and structured JavaScript development
* **Vite** — fast development and build tool
* **React Router** — application navigation
* **Tailwind CSS** — styling
* **shadcn/ui / Radix UI** — UI components
* **Recharts** — analytics and graphs
* **LocalStorage** — saving application data
* **QRCode** — staff verification
* **Sonner** — notifications

There is no backend required for the current version. The application stores its data locally in the browser.

---

# 📁 Project Structure

```text
Smart Hostel Cleaning System/
│
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── RoomGraph.tsx
│   │   │   ├── StudentRequest.tsx
│   │   │   ├── StaffView.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── SimulationControls.tsx
│   │   │   ├── QuickGuide.tsx
│   │   │   ├── Layout.tsx
│   │   │   └── WelcomeDialog.tsx
│   │   │
│   │   ├── context/
│   │   │   ├── HostelContext.tsx
│   │   │   └── AuthContext.tsx
│   │   │
│   │   ├── utils/
│   │   │   ├── data-structures.ts
│   │   │   ├── storage.ts
│   │   │   └── mock-data.ts
│   │   │
│   │   ├── routes.tsx
│   │   └── App.tsx
│   │
│   ├── main.tsx
│   └── styles/
│
├── DSA_DOCUMENTATION.md
├── ATTRIBUTIONS.md
└── package.json
```

The most important file from a DSA perspective is:

```text
src/app/utils/data-structures.ts
```

This contains the main implementations for the Priority Queue, Graph, Queue, and HashMap.

---

# 🚀 Running the Project

### Requirements

You need:

* Node.js 18+
* pnpm

### Installation

```bash
git clone https://github.com/<your-username>/Smart-Hostel-Cleaning-System.git

cd "Smart-Hostel-Cleaning-System/Smart Hostel Cleaning System"

pnpm install

pnpm dev
```

After starting the development server, Vite will provide a local URL that you can open in your browser.

To create a production build:

```bash
pnpm build
```

---

# 🎮 How to Use the Application

### Step 1 — Open the Dashboard

Start from the dashboard to see the current state of the hostel.

You can see:

* Pending tasks
* Staff availability
* Room cleanliness
* Priority levels

---

### Step 2 — Check the Room Graph

Open the Room Graph and select a room.

You can see:

* Its neighboring rooms
* Current cleanliness
* BFS cleaning path
* Graph connections

The room colors make it easier to understand the current state:

```text
🟢 Green  → Clean
🟡 Yellow → Needs attention
🔴 Red    → Very dirty
```

---

### Step 3 — Submit a Student Request

Select a room and submit a cleaning request.

The request increases the room's urgency, so it can move higher in the Priority Queue.

---

### Step 4 — Assign a Staff Member

A staff member can pick up the highest-priority task.

The system then records the assignment and updates staff availability.

---

### Step 5 — Complete the Cleaning

The staff member enters the new cleanliness score and cleaning duration.

After completion:

* The room's cleanliness improves
* The task is removed
* The cleaning history is updated
* The staff member becomes available again

---

### Step 6 — Check Analytics

Finally, use the Analytics section to see how the hostel is performing.

You can identify rooms that:

* Get dirty quickly
* Require frequent cleaning
* Have consistently low cleanliness scores

---

# 📊 DSA Complexity Cheat Sheet

| Data Structure / Algorithm | Operation       | Time Complexity  |
| -------------------------- | --------------- | ---------------- |
| Priority Queue             | Insert          | O(log n)         |
| Priority Queue             | Extract Max     | O(log n)         |
| Priority Queue             | Peek            | O(1)             |
| BFS                        | Traversal       | O(V + E)         |
| Dijkstra                   | Shortest Path   | O((V + E) log V) |
| FIFO Queue                 | Enqueue         | O(1)             |
| FIFO Queue                 | Dequeue         | O(1)             |
| HashMap                    | Lookup          | O(1) average     |
| Degradation Calculation    | Process history | O(k)             |

Where:

* **V** = number of rooms
* **E** = connections between rooms
* **n** = number of tasks
* **k** = number of historical entries

---

# 🔮 Future Improvements

There are several things that can be added in the future.

### A* Search

We can add A* to find paths faster by using a heuristic along with the actual distance.

### Minimum Spanning Tree

An MST could help plan a route that covers multiple rooms while reducing unnecessary movement.

### Dynamic Programming

DP could be used to improve staff schedules when there are many rooms and limited workers.

### Machine Learning

Instead of only using a simple degradation rate, an ML model could predict when a room is likely to become dirty.

### Real-Time Collaboration

WebSockets could allow multiple staff members and administrators to use the same system in real time.

---

# 🎓 Why We Built This

The main idea behind this project is simple:

**DSA becomes much easier to understand when we can actually see where it is useful.**

Instead of demonstrating a heap, graph, queue, or HashMap using a random textbook example, we connected each concept to something practical.

A **Priority Queue** decides what needs attention first.

A **Graph** represents the hostel and helps with navigation.

**BFS and Dijkstra** help with route planning.

A **FIFO Queue** helps distribute work fairly.

A **HashMap** keeps room history easy to access.

Together, these concepts turn a basic hostel cleaning idea into a complete DSA-based management system.

---

# 🤝 Credits & License

This is an educational project created to demonstrate how Data Structures and Algorithms can be applied to a practical facility-management problem.

The project is licensed under the **MIT License**.

UI components are based on open-source components such as shadcn/ui, and external assets are credited in `ATTRIBUTIONS.md`.

---

## Final Thought

A hostel cleaning system might sound simple at first.

But once we ask **"Which room should be cleaned first?", "Which route should the staff take?", "Who should get the next task?", and "Which room will probably need cleaning soon?"**, it becomes a great real-world example of how DSA can solve practical problems.

**That's the idea behind the Smart Hostel Cleaning & Resource Optimization System — taking DSA out of the textbook and putting it into a system we can actually see working.**

# Smart Hostel Cleaning System

A web app that helps manage cleaning in a student hostel. Students can report rooms that need cleaning, staff can view and act on those requests, and admins get a dashboard to track overall progress. It also includes a simulation mode to demo the system without needing real data.

## Features

- **Student Requests** — Students can flag their room for cleaning, which boosts its priority.
- **Staff View** — Staff see assigned tasks, mark them complete, and verify via QR code.
- **Dashboard** — Live view of pending tasks, staff availability, and system stats.
- **Room Graph** — Visual map of all rooms, color-coded by cleanliness, showing suggested cleaning routes.
- **Analytics** — Trends, cleanliness distribution, and predictions for rooms likely to need attention soon.
- **Simulation Mode** — Auto-runs the system so you can see it work without manual input.
- **Login System** — Separate access for students, staff, and admins.

## Tech Stack

- React 18 + TypeScript
- Vite
- React Router
- Tailwind CSS + Radix UI (shadcn/ui components)
- Recharts (charts/graphs)
- QRCode (task verification)

## Project Structure

```
src/
├── app/
│   ├── components/       # Dashboard, RoomGraph, StaffView, StudentRequest, Analytics, etc.
│   ├── context/           # Auth and app-wide state
│   ├── utils/             # Core logic, mock data, storage handling
│   ├── routes.tsx         # App routing
│   └── App.tsx            # Entry point
└── styles/                # Global styles and theming
```

## Getting Started

```bash
# install dependencies
pnpm install

# run locally
pnpm dev

# build for production
pnpm build
```

## How It Works (Behind the Scenes)

Under the hood, task scheduling and routing are handled with a few core techniques:

- Tasks are prioritized based on how dirty a room is, how long it's been since cleaning, whether it's occupied, and whether a student requested it.
- Rooms are connected to their neighbors, so the system can suggest efficient cleaning routes and shortest paths between rooms.
- Staff are assigned tasks fairly, in the order they become available.
- A history of cleanings per room is kept to spot patterns and predict which rooms will need attention soon.

See `DSA_DOCUMENTATION.md` for the full technical breakdown.

## License

MIT — free to use for educational purposes.

// Mock hostel data generator.
// Same exports as before (generateMockRooms / generateMockStaff / generateMockHistory),
// now with: a seeded RNG (reproducible demos and tests), consistent history that matches
// each room's current state, "problem rooms" that degrade faster (so the predictive
// analytics have real signal), and the extra fields the advanced DSA module uses.
import type { RoomNode, StaffMember, CleaningHistoryEntry } from './data-structures';

/* ------------------------------------------------------------------ */
/* Seeded random numbers (mulberry32)                                   */
/* ------------------------------------------------------------------ */

export type Rng = () => number;

export function createRng(seed: number = Date.now()): Rng {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const randInt = (rng: Rng, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/* ------------------------------------------------------------------ */
/* Layout config                                                        */
/* ------------------------------------------------------------------ */

export interface MockConfig {
  floors?: number;
  roomsPerFloor?: number;
  occupancyRate?: number; // 0..1
  dirtyRate?: number; // share of rooms that start below the cleaning threshold
  seed?: number;
}

const DEFAULTS: Required<Omit<MockConfig, 'seed'>> = {
  floors: 4,
  roomsPerFloor: 8,
  occupancyRate: 0.8,
  dirtyRate: 0.3,
};

const roomIdOf = (floor: number, roomNum: number) => `${floor}${roomNum.toString().padStart(2, '0')}`;

/* ------------------------------------------------------------------ */
/* Rooms                                                                */
/* ------------------------------------------------------------------ */

export function generateMockRooms(config: MockConfig = {}): RoomNode[] {
  const { floors, roomsPerFloor, occupancyRate, dirtyRate } = { ...DEFAULTS, ...config };
  const rng = createRng(config.seed);
  const rooms: RoomNode[] = [];

  for (let floor = 1; floor <= floors; floor++) {
    for (let roomNum = 1; roomNum <= roomsPerFloor; roomNum++) {
      // Dirty rooms: 30-69. Clean rooms: 70-100.
      const dirty = rng() < dirtyRate;
      const cleanlinessScore = dirty ? randInt(rng, 30, 69) : randInt(rng, 70, 100);

      // Dirtier rooms were generally cleaned longer ago
      const hoursAgo = dirty ? randInt(rng, 24, 72) : randInt(rng, 1, 30);

      // Kept for backward compatibility with code that still reads adjacentRooms
      const adjacentRooms: string[] = [];
      if (roomNum > 1) adjacentRooms.push(roomIdOf(floor, roomNum - 1));
      if (roomNum < roomsPerFloor) adjacentRooms.push(roomIdOf(floor, roomNum + 1));
      if (floor < floors) adjacentRooms.push(roomIdOf(floor + 1, roomNum));
      if (floor > 1) adjacentRooms.push(roomIdOf(floor - 1, roomNum));

      const room = {
        id: roomIdOf(floor, roomNum),
        floor,
        col: roomNum - 1, // position on the floor, used by A* and WeightedRoomGraph.fromLayout
        occupancyStatus: rng() < occupancyRate,
        lastCleaned: Date.now() - hoursAgo * HOUR,
        cleanlinessScore,
        cleaningMinutes: randInt(rng, 15, 30),
        adjacentRooms,
        studentRequestBoost: false,
      };
      rooms.push(room as unknown as RoomNode);
    }
  }
  return rooms;
}

/* ------------------------------------------------------------------ */
/* Staff                                                                */
/* ------------------------------------------------------------------ */

const STAFF_NAMES = [
  'Rajesh Kumar',
  'Priya Sharma',
  'Amit Patel',
  'Sneha Reddy',
  'Vikram Singh',
  'Anjali Verma',
];

const SKILLS = ['deep-clean', 'bathroom', 'laundry', 'pest-control'];

export function generateMockStaff(seed?: number): StaffMember[] {
  const rng = createRng(seed);
  return STAFF_NAMES.map((name, index) => {
    const tasksCompleted = randInt(rng, 0, 49);
    // Everyone can do general cleaning; each person has 1-2 extra skills
    const skills = SKILLS.filter(() => rng() < 0.4);
    return {
      id: `STAFF${(index + 1).toString().padStart(3, '0')}`,
      name,
      status: 'available' as const,
      tasksCompleted,
      efficiency: randInt(rng, 80, 99),
      minutesWorked: tasksCompleted * randInt(rng, 18, 26), // used by the fair-workload assigner
      skills: skills.length ? skills : [SKILLS[index % SKILLS.length]],
    };
  }) as unknown as StaffMember[];
}

/* ------------------------------------------------------------------ */
/* History                                                              */
/* ------------------------------------------------------------------ */

/**
 * Builds a history that agrees with each room's current state:
 *  - the newest entry sits at room.lastCleaned
 *  - the room's current score equals that entry's scoreAfter minus the decay since
 *  - earlier entries use the same per-room decay rate (plus noise), so some rooms
 *    are consistently "problem rooms" and degradationRate() has something to find.
 *
 * Pass the rooms you generated; if omitted, fresh rooms are created.
 */
export function generateMockHistory(
  rooms: RoomNode[] = generateMockRooms(),
  seed?: number,
): Map<string, CleaningHistoryEntry[]> {
  const rng = createRng(seed);
  const history = new Map<string, CleaningHistoryEntry[]>();
  const staffIds = STAFF_NAMES.map((_, i) => `STAFF${(i + 1).toString().padStart(3, '0')}`);

  for (const room of rooms) {
    const lastAfter = randInt(rng, 88, 100);
    const daysSince = Math.max((Date.now() - room.lastCleaned) / DAY, 0.25);
    // Points lost per day implied by the room's current state; clamp to a believable range
    const rate = clamp((lastAfter - room.cleanlinessScore) / daysSince, 3, 25);

    const numEntries = randInt(rng, 3, 6);
    const entries: CleaningHistoryEntry[] = [];
    let timestamp = room.lastCleaned;
    let scoreAfter = lastAfter;

    // Walk backwards from the most recent cleaning
    for (let i = 0; i < numEntries; i++) {
      entries.push({
        timestamp,
        staffId: staffIds[randInt(rng, 0, staffIds.length - 1)],
        scoreBefore: 0, // filled in below once we know the gap to the previous cleaning
        scoreAfter,
        duration: randInt(rng, 15, 35),
      });
      const gapDays = randInt(rng, 2, 5);
      timestamp -= gapDays * DAY;
      scoreAfter = randInt(rng, 85, 100);
      // The score just before THIS entry = previous cleaning's result minus decay over the gap
      entries[i].scoreBefore = clamp(
        Math.round(scoreAfter - rate * gapDays + (rng() - 0.5) * 8),
        15,
        95,
      );
    }

    history.set(room.id, entries.reverse()); // oldest first
  }

  return history;
}

/* ------------------------------------------------------------------ */
/* One call for a consistent demo dataset                               */
/* ------------------------------------------------------------------ */

export function generateMockDataset(config: MockConfig = {}) {
  const seed = config.seed ?? Date.now();
  const rooms = generateMockRooms({ ...config, seed });
  return {
    seed,
    rooms,
    staff: generateMockStaff(seed + 1),
    history: generateMockHistory(rooms, seed + 2),
  };
}

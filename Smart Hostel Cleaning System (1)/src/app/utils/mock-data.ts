// Generate mock hostel data
import { RoomNode, StaffMember } from './data-structures';

export function generateMockRooms(): RoomNode[] {
  const rooms: RoomNode[] = [];
  const floors = 4;
  const roomsPerFloor = 8;

  for (let floor = 1; floor <= floors; floor++) {
    for (let roomNum = 1; roomNum <= roomsPerFloor; roomNum++) {
      const roomId = `${floor}${roomNum.toString().padStart(2, '0')}`;
      
      // Random cleanliness scores with some dirty rooms
      const cleanlinessScore = Math.random() < 0.3 
        ? Math.floor(Math.random() * 40) + 30  // Dirty rooms (30-70)
        : Math.floor(Math.random() * 30) + 70;  // Clean rooms (70-100)
      
      // Last cleaned: random time in the past 24 hours
      const hoursAgo = Math.floor(Math.random() * 24);
      const lastCleaned = Date.now() - hoursAgo * 60 * 60 * 1000;
      
      // Determine adjacent rooms (horizontal neighbors and vertical neighbors)
      const adjacentRooms: string[] = [];
      
      // Left neighbor
      if (roomNum > 1) {
        adjacentRooms.push(`${floor}${(roomNum - 1).toString().padStart(2, '0')}`);
      }
      
      // Right neighbor
      if (roomNum < roomsPerFloor) {
        adjacentRooms.push(`${floor}${(roomNum + 1).toString().padStart(2, '0')}`);
      }
      
      // Floor above
      if (floor < floors) {
        adjacentRooms.push(`${floor + 1}${roomNum.toString().padStart(2, '0')}`);
      }
      
      // Floor below
      if (floor > 1) {
        adjacentRooms.push(`${floor - 1}${roomNum.toString().padStart(2, '0')}`);
      }
      
      rooms.push({
        id: roomId,
        occupancyStatus: Math.random() > 0.2, // 80% occupied
        lastCleaned,
        cleanlinessScore,
        floor,
        adjacentRooms,
        studentRequestBoost: false
      });
    }
  }

  return rooms;
}

export function generateMockStaff(): StaffMember[] {
  const names = [
    'Rajesh Kumar',
    'Priya Sharma',
    'Amit Patel',
    'Sneha Reddy',
    'Vikram Singh',
    'Anjali Verma'
  ];

  return names.map((name, index) => ({
    id: `STAFF${(index + 1).toString().padStart(3, '0')}`,
    name,
    status: 'available' as const,
    tasksCompleted: Math.floor(Math.random() * 50),
    efficiency: Math.floor(Math.random() * 20) + 80
  }));
}

export function generateMockHistory(): Map<string, any[]> {
  const history = new Map();
  const rooms = generateMockRooms();
  
  // Generate 2-5 cleaning entries per room
  rooms.forEach(room => {
    const entries = [];
    const numEntries = Math.floor(Math.random() * 4) + 2;
    
    for (let i = 0; i < numEntries; i++) {
      const daysAgo = (numEntries - i) * 3 + Math.floor(Math.random() * 2);
      const timestamp = Date.now() - daysAgo * 24 * 60 * 60 * 1000;
      
      entries.push({
        timestamp,
        staffId: `STAFF${Math.floor(Math.random() * 6 + 1).toString().padStart(3, '0')}`,
        scoreBefore: Math.floor(Math.random() * 40) + 30,
        scoreAfter: Math.floor(Math.random() * 20) + 80,
        duration: Math.floor(Math.random() * 20) + 15
      });
    }
    
    history.set(room.id, entries);
  });
  
  return history;
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  RoomGraph,
  PriorityQueue,
  Queue,
  CleaningHistoryMap,
  RoomNode,
  StaffMember,
  CleaningHistoryEntry,
  calculateUrgency
} from '../utils/data-structures';
import { storage } from '../utils/storage';
import { generateMockRooms, generateMockStaff, generateMockHistory } from '../utils/mock-data';

interface HostelContextType {
  roomGraph: RoomGraph;
  priorityQueue: PriorityQueue<string>;
  staffQueue: Queue<StaffMember>;
  historyMap: CleaningHistoryMap;
  rooms: RoomNode[];
  staff: StaffMember[];
  refreshPriorityQueue: () => void;
  requestCleaning: (roomId: string) => void;
  assignTask: () => void;
  completeTask: (roomId: string, staffId: string, newScore: number, duration: number) => void;
  updateRoom: (roomId: string, updates: Partial<RoomNode>) => void;
  resetData: () => void;
}

const HostelContext = createContext<HostelContextType | undefined>(undefined);

export function HostelProvider({ children }: { children: React.ReactNode }) {
  const [roomGraph] = useState(() => new RoomGraph());
  const [priorityQueue] = useState(() => new PriorityQueue<string>());
  const [staffQueue] = useState(() => new Queue<StaffMember>());
  const [historyMap] = useState(() => new CleaningHistoryMap());
  const [rooms, setRooms] = useState<RoomNode[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  // Initialize data
  useEffect(() => {
    const initializeData = () => {
      let roomsData: RoomNode[];
      let staffData: StaffMember[];
      let historyData: Map<string, CleaningHistoryEntry[]>;

      if (!storage.isInitialized()) {
        // First time - generate mock data
        roomsData = generateMockRooms();
        staffData = generateMockStaff();
        historyData = generateMockHistory();
        
        storage.saveRooms(roomsData);
        storage.saveStaff(staffData);
        storage.saveHistory(historyData);
        storage.setInitialized();
      } else {
        // Load from storage
        roomsData = storage.loadRooms() || generateMockRooms();
        staffData = storage.loadStaff() || generateMockStaff();
        historyData = storage.loadHistory() || new Map();
      }

      // Populate graph
      roomsData.forEach(room => roomGraph.addNode(room));
      setRooms(roomsData);

      // Populate staff queue
      staffData.forEach(member => {
        if (member.status === 'available') {
          staffQueue.enqueue(member);
        }
      });
      setStaff(staffData);

      // Populate history map
      historyData.forEach((entries, roomId) => {
        entries.forEach(entry => historyMap.addEntry(roomId, entry));
      });

      // Initialize priority queue
      roomsData.forEach(room => {
        const urgency = calculateUrgency(room);
        if (urgency > 50) { // Only add rooms that need cleaning
          priorityQueue.enqueue(room.id, urgency);
        }
      });
    };

    initializeData();
  }, [roomGraph, priorityQueue, staffQueue, historyMap]);

  const refreshPriorityQueue = useCallback(() => {
    // Clear and rebuild priority queue
    while (!priorityQueue.isEmpty()) {
      priorityQueue.dequeue();
    }

    rooms.forEach(room => {
      const urgency = calculateUrgency(room);
      if (urgency > 50 || room.studentRequestBoost) {
        priorityQueue.enqueue(room.id, urgency);
      }
    });
  }, [rooms, priorityQueue]);

  const requestCleaning = useCallback((roomId: string) => {
    // Student requests cleaning - add urgency boost
    const updatedRooms = rooms.map(room => {
      if (room.id === roomId) {
        const updated = { ...room, studentRequestBoost: true };
        roomGraph.updateNode(roomId, updated);
        return updated;
      }
      return room;
    });

    setRooms(updatedRooms);
    storage.saveRooms(updatedRooms);
    
    // Re-add to priority queue with boost
    const room = roomGraph.getNode(roomId);
    if (room) {
      const urgency = calculateUrgency(room, true);
      priorityQueue.enqueue(roomId, urgency);
    }
  }, [rooms, roomGraph, priorityQueue]);

  const assignTask = useCallback(() => {
    const availableStaff = staffQueue.dequeue();
    const nextRoom = priorityQueue.dequeue();

    if (!availableStaff || !nextRoom) return;

    // Update staff status
    const updatedStaff = staff.map(member => {
      if (member.id === availableStaff.id) {
        return { ...member, status: 'busy' as const, currentTask: nextRoom };
      }
      return member;
    });

    setStaff(updatedStaff);
    storage.saveStaff(updatedStaff);
  }, [staff, staffQueue, priorityQueue]);

  const completeTask = useCallback((
    roomId: string,
    staffId: string,
    newScore: number,
    duration: number
  ) => {
    const room = roomGraph.getNode(roomId);
    if (!room) return;

    const scoreBefore = room.cleanlinessScore;

    // Update room
    const updatedRoom: RoomNode = {
      ...room,
      cleanlinessScore: newScore,
      lastCleaned: Date.now(),
      studentRequestBoost: false
    };

    roomGraph.updateNode(roomId, updatedRoom);

    const updatedRooms = rooms.map(r => r.id === roomId ? updatedRoom : r);
    setRooms(updatedRooms);
    storage.saveRooms(updatedRooms);

    // Add to history
    const historyEntry: CleaningHistoryEntry = {
      timestamp: Date.now(),
      staffId,
      scoreBefore,
      scoreAfter: newScore,
      duration
    };
    historyMap.addEntry(roomId, historyEntry);
    storage.saveHistory(historyMap.getAllHistory());

    // Update staff
    const updatedStaff = staff.map(member => {
      if (member.id === staffId) {
        const updated = {
          ...member,
          status: 'available' as const,
          currentTask: undefined,
          tasksCompleted: member.tasksCompleted + 1
        };
        staffQueue.enqueue(updated);
        return updated;
      }
      return member;
    });

    setStaff(updatedStaff);
    storage.saveStaff(updatedStaff);

    // Refresh priority queue
    refreshPriorityQueue();
  }, [rooms, staff, roomGraph, historyMap, staffQueue, refreshPriorityQueue]);

  const updateRoom = useCallback((roomId: string, updates: Partial<RoomNode>) => {
    roomGraph.updateNode(roomId, updates);
    const updatedRooms = rooms.map(room => 
      room.id === roomId ? { ...room, ...updates } : room
    );
    setRooms(updatedRooms);
    storage.saveRooms(updatedRooms);
    refreshPriorityQueue();
  }, [rooms, roomGraph, refreshPriorityQueue]);

  const resetData = useCallback(() => {
    storage.clearAll();
    window.location.reload();
  }, []);

  return (
    <HostelContext.Provider
      value={{
        roomGraph,
        priorityQueue,
        staffQueue,
        historyMap,
        rooms,
        staff,
        refreshPriorityQueue,
        requestCleaning,
        assignTask,
        completeTask,
        updateRoom,
        resetData
      }}
    >
      {children}
    </HostelContext.Provider>
  );
}

export function useHostel() {
  const context = useContext(HostelContext);
  if (!context) {
    throw new Error('useHostel must be used within HostelProvider');
  }
  return context;
}

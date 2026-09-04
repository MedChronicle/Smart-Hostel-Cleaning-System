// LocalStorage utility for persisting state
import { RoomNode, StaffMember, CleaningHistoryEntry } from './data-structures';

const STORAGE_KEYS = {
  ROOMS: 'hostel_rooms',
  STAFF: 'hostel_staff',
  HISTORY: 'hostel_history',
  INITIALIZED: 'hostel_initialized'
};

export const storage = {
  saveRooms(rooms: RoomNode[]): void {
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
  },

  loadRooms(): RoomNode[] | null {
    const data = localStorage.getItem(STORAGE_KEYS.ROOMS);
    return data ? JSON.parse(data) : null;
  },

  saveStaff(staff: StaffMember[]): void {
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staff));
  },

  loadStaff(): StaffMember[] | null {
    const data = localStorage.getItem(STORAGE_KEYS.STAFF);
    return data ? JSON.parse(data) : null;
  },

  saveHistory(history: Map<string, CleaningHistoryEntry[]>): void {
    const historyObj = Object.fromEntries(history);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(historyObj));
  },

  loadHistory(): Map<string, CleaningHistoryEntry[]> | null {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!data) return null;
    
    const historyObj = JSON.parse(data);
    return new Map(Object.entries(historyObj));
  },

  isInitialized(): boolean {
    return localStorage.getItem(STORAGE_KEYS.INITIALIZED) === 'true';
  },

  setInitialized(): void {
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  },

  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }
};

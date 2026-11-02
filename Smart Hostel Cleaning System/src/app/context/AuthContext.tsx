import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';

export type UserRole = 'student' | 'staff';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  roomNumber?: string; // For students
  staffId?: string; // For staff
}

interface AuthContextType {
  // --- original API ---
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => boolean; // false if the user data is invalid
  logout: () => void;
  register: (user: User) => boolean;

  // --- new ---
  isStaff: boolean;
  isStudent: boolean;
  hasRole: (role: UserRole) => boolean;
  updateUser: (updates: Partial<Omit<User, 'id' | 'role'>>) => void;
  /** When the current session ends (epoch ms), or null when signed out. */
  sessionExpiresAt: number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'hostel_auth_user';
const SESSION_MS = 8 * 60 * 60 * 1000; // 8 hours
const MAX_TIMEOUT = 2 ** 31 - 1; // setTimeout overflows above this

/* ------------------------------------------------------------------ */
/* Validation + session storage                                         */
/* ------------------------------------------------------------------ */

interface Session {
  v: 2;
  user: User;
  expiresAt: number;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isStr = (v: unknown): v is string => typeof v === 'string';

function isUser(v: unknown): v is User {
  return isObj(v) && isStr(v.id) && v.id.length > 0 && isStr(v.name) &&
    (v.role === 'student' || v.role === 'staff') &&
    (v.roomNumber === undefined || isStr(v.roomNumber)) &&
    (v.staffId === undefined || isStr(v.staffId));
}

/** Trim and length-limit free-text fields before they are stored or rendered. */
function sanitize(user: User): User {
  return {
    ...user,
    id: user.id.trim().slice(0, 64),
    name: user.name.trim().slice(0, 80),
    roomNumber: user.roomNumber?.trim().slice(0, 10),
    staffId: user.staffId?.trim().slice(0, 32),
  };
}

function clearStored() {
  try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch { /* storage blocked */ }
}

/** Reads the saved session. Handles the old format (a bare user object) and drops anything invalid or expired. */
function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);

    let session: Session | null = null;
    if (isObj(data) && data.v === 2 && isUser(data.user) && typeof data.expiresAt === 'number') {
      session = { v: 2, user: data.user, expiresAt: data.expiresAt };
    } else if (isUser(data)) {
      // legacy format from the first version: upgrade it, with a fresh expiry
      session = { v: 2, user: data, expiresAt: Date.now() + SESSION_MS };
    }

    if (!session || session.expiresAt <= Date.now()) {
      clearStored();
      return null;
    }
    return session;
  } catch (error) {
    console.error('Failed to read stored session:', error);
    clearStored();
    return null;
  }
}

function writeSession(session: Session) {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    // Still signed in for this tab; it just won't survive a refresh
    console.error('Failed to save session:', error);
  }
}

/* ------------------------------------------------------------------ */
/* Provider                                                             */
/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Read synchronously on first render. The old version loaded the user in an
  // effect, so on refresh the first render had user = null and ProtectedRoute
  // bounced signed-in people to /auth before the saved user was restored.
  const [session, setSession] = useState<Session | null>(() => readSession());

  const user = session?.user ?? null;

  const startSession = useCallback((userData: User): boolean => {
    if (!isUser(userData)) return false;
    const clean = sanitize(userData);
    if (!clean.id || !clean.name) return false;
    const next: Session = { v: 2, user: clean, expiresAt: Date.now() + SESSION_MS };
    writeSession(next);
    setSession(next);
    return true;
  }, []);

  // In a real app these would call an API; for now both start a local session
  const login = startSession;
  const register = startSession;

  const logout = useCallback(() => {
    clearStored();
    setSession(null);
  }, []);

  const updateUser = useCallback((updates: Partial<Omit<User, 'id' | 'role'>>) => {
    setSession(prev => {
      if (!prev) return prev;
      const merged = sanitize({ ...prev.user, ...updates });
      const next: Session = { ...prev, user: merged };
      writeSession(next);
      return next;
    });
  }, []);

  /* ---------- automatic sign-out when the session expires ---------- */

  useEffect(() => {
    if (!session) return;
    const expire = () => {
      logout();
      toast.info('Session expired', { id: 'session-expired', description: 'Please sign in again.' });
    };
    const remaining = session.expiresAt - Date.now();
    if (remaining <= 0) { expire(); return; }
    const id = setTimeout(expire, Math.min(remaining, MAX_TIMEOUT));
    return () => clearTimeout(id);
  }, [session, logout]);

  // Timers pause while a laptop sleeps, so re-check when the tab becomes visible
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (!readSession()) setSession(prev => (prev ? null : prev));
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  /* ---------- keep tabs in sync: signing out in one tab signs out all ---------- */

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== AUTH_STORAGE_KEY && e.key !== null) return;
      setSession(readSession());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /* ---------- context value ---------- */

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: user !== null,
    login,
    logout,
    register,
    isStaff: user?.role === 'staff',
    isStudent: user?.role === 'student',
    hasRole: (role: UserRole) => user?.role === role,
    updateUser,
    sessionExpiresAt: session?.expiresAt ?? null,
  }), [user, session?.expiresAt, login, logout, register, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { User, Lock, Sparkles, Eye, EyeOff, DoorOpen, BadgeCheck, AlertCircle, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

type AccessRole = 'student' | 'staff';
type StudentTab = 'login' | 'register';

interface FieldProps {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  hint?: string;
  trailing?: React.ReactNode;
  onKeyUp?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
}

interface RedirectState {
  from?: { pathname: string; search: string; hash: string };
}

const VIDEO_ID = 't822he3vtLE';
const VIDEO_SRC = `https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${VIDEO_ID}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&disablekb=1`;
const QUICK_CODE: string | undefined = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
  ?.VITE_QUICK_ACCESS_CODE;

const STUDENT_NAME_KEY = 'hostel-last-student';
const STAFF_NAME_KEY = 'hostel-last-staff';
const ROOMS_KEY = 'hostel-known-rooms';
const MAX_QUICK_ATTEMPTS = 5;
const QUICK_LOCK_MS = 30000;

const inputClass =
  'backdrop-blur-md bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:bg-slate-800/70 focus:border-slate-500';

const readStorage = (key: string): string => {
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
};

const writeStorage = (key: string, value: string) => {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    return;
  }
};

const readRooms = (): Record<string, string> => {
  try {
    const parsed = JSON.parse(readStorage(ROOMS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const rememberRoom = (name: string, room: string) => {
  const rooms = readRooms();
  rooms[name.trim().toLowerCase()] = room;
  writeStorage(ROOMS_KEY, JSON.stringify(rooms));
};

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 9)
    : Math.random().toString(36).slice(2, 11);

const normalizeRoom = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '');

const passwordScore = (password: string) => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
};

const STRENGTH_LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['bg-red-500', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];

const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
};

function VideoBackground() {
  const reduced = useReducedMotion();

  return (
    <div className="absolute inset-0 w-full h-full" aria-hidden="true">
      {reduced ? (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" />
      ) : (
        <iframe
          title="Background video"
          tabIndex={-1}
          loading="lazy"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ width: '100vw', height: '56.25vw', minHeight: '100vh', minWidth: '177.77vh' }}
          src={VIDEO_SRC}
          allow="autoplay; fullscreen"
          frameBorder="0"
        />
      )}
      <div className="absolute inset-0 bg-black/60" />
    </div>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  onBlur,
  error,
  type = 'text',
  placeholder,
  autoComplete,
  hint,
  trailing,
  onKeyUp,
  autoFocus,
}: FieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-white">
        {label}
      </Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyUp={onKeyUp}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`pl-10 ${trailing ? 'pr-10' : ''} ${inputClass} ${error ? 'border-red-400 focus:border-red-400' : ''}`}
        />
        {trailing && <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-1 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface PasswordFieldProps extends Omit<FieldProps, 'type' | 'trailing' | 'icon' | 'onKeyUp'> {
  showStrength?: boolean;
}

function PasswordField({ showStrength, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const score = passwordScore(props.value);

  return (
    <div className="space-y-2">
      <Field
        {...props}
        icon={Lock}
        type={visible ? 'text' : 'password'}
        onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            className="p-1 text-slate-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
      />
      {capsLock && (
        <p className="flex items-center gap-1 text-xs text-yellow-400">
          <AlertCircle className="h-3.5 w-3.5" />
          Caps Lock is on
        </p>
      )}
      {showStrength && props.value && (
        <div className="space-y-1" aria-live="polite">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${i < score ? STRENGTH_COLORS[score] : 'bg-slate-700'}`}
              />
            ))}
          </div>
          <p className="text-xs text-slate-400">Strength: {STRENGTH_LABELS[score]}</p>
        </div>
      )}
    </div>
  );
}

export function AuthPage() {
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const returnPath = useMemo(() => {
    const from = (location.state as RedirectState | null)?.from;
    return from ? `${from.pathname}${from.search}${from.hash}` : '/';
  }, [location.state]);

  const [role, setRole] = useState<AccessRole>('student');
  const [studentTab, setStudentTab] = useState<StudentTab>('login');

  const [loginName, setLoginName] = useState(() => readStorage(STUDENT_NAME_KEY));
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberStudent, setRememberStudent] = useState(() => Boolean(readStorage(STUDENT_NAME_KEY)));

  const [registerName, setRegisterName] = useState('');
  const [registerRoom, setRegisterRoom] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  const [staffName, setStaffName] = useState(() => readStorage(STAFF_NAME_KEY));
  const [staffId, setStaffId] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [rememberStaff, setRememberStaff] = useState(() => Boolean(readStorage(STAFF_NAME_KEY)));

  const [quickPassword, setQuickPassword] = useState('');
  const [quickAttempts, setQuickAttempts] = useState(0);
  const [quickLockedUntil, setQuickLockedUntil] = useState(0);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isAuthenticated) navigate(returnPath, { replace: true });
  }, [isAuthenticated, navigate, returnPath]);

  const setError = useCallback((key: string, message?: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[key] = message;
      else delete next[key];
      return next;
    });
  }, []);

  const validators = useMemo(
    () => ({
      loginName: (v: string) => (v.trim().length < 2 ? 'Enter your username' : undefined),
      loginPassword: (v: string) => (!v ? 'Enter your password' : undefined),
      registerName: (v: string) => (v.trim().length < 2 ? 'Enter your full name' : undefined),
      registerRoom: (v: string) =>
        /^[A-Z]{1,2}-?\d{2,4}$/.test(normalizeRoom(v)) ? undefined : 'Use a format like A101',
      registerPassword: (v: string) =>
        v.length < 8 ? 'Use at least 8 characters' : passwordScore(v) < 2 ? 'Add numbers or mixed case' : undefined,
      staffName: (v: string) => (v.trim().length < 2 ? 'Enter your username' : undefined),
      staffId: (v: string) => (/^[A-Za-z0-9-]{3,}$/.test(v.trim()) ? undefined : 'Staff ID needs 3+ letters or digits'),
      staffPassword: (v: string) => (!v ? 'Enter your password' : undefined),
    }),
    []
  );

  type ValidatorKey = keyof typeof validators;

  const blur = (key: ValidatorKey, value: string) => setError(key, validators[key](value));

  const validateAll = (pairs: [ValidatorKey, string][]) => {
    let valid = true;
    const next: Record<string, string> = { ...errors };
    pairs.forEach(([key, value]) => {
      const message = validators[key](value);
      if (message) {
        next[key] = message;
        valid = false;
      } else {
        delete next[key];
      }
    });
    setErrors(next);
    if (!valid) toast.error('Please fix the highlighted fields');
    return valid;
  };

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !validateAll([
        ['loginName', loginName],
        ['loginPassword', loginPassword],
      ])
    )
      return;

    const name = loginName.trim();
    const knownRoom = readRooms()[name.toLowerCase()];

    writeStorage(STUDENT_NAME_KEY, rememberStudent ? name : '');
    login({ id: newId(), name, role: 'student' as const, roomNumber: knownRoom || 'A101' });
    toast.success(`Welcome back, ${name}!`);
    navigate(returnPath, { replace: true });
  };

  const handleStudentRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !validateAll([
        ['registerName', registerName],
        ['registerRoom', registerRoom],
        ['registerPassword', registerPassword],
      ])
    )
      return;

    const name = registerName.trim();
    const roomNumber = normalizeRoom(registerRoom);

    rememberRoom(name, roomNumber);
    register({ id: newId(), name, role: 'student' as const, roomNumber });
    toast.success(`Welcome, ${name}! Your account has been created.`);
    navigate(returnPath, { replace: true });
  };

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !validateAll([
        ['staffName', staffName],
        ['staffId', staffId],
        ['staffPassword', staffPassword],
      ])
    )
      return;

    const name = staffName.trim();
    writeStorage(STAFF_NAME_KEY, rememberStaff ? name : '');
    login({ id: newId(), name, role: 'staff' as const, staffId: staffId.trim().toUpperCase() });
    toast.success(`Welcome, ${name}!`);
    navigate(returnPath, { replace: true });
  };

  const handleQuickAccess = (e: React.FormEvent) => {
    e.preventDefault();

    const remaining = quickLockedUntil - Date.now();
    if (remaining > 0) {
      toast.error(`Too many attempts. Try again in ${Math.ceil(remaining / 1000)}s`);
      return;
    }

    if (!quickPassword) {
      toast.error('Please enter the access code');
      return;
    }

    if (quickPassword !== QUICK_CODE) {
      const attempts = quickAttempts + 1;
      setQuickPassword('');
      if (attempts >= MAX_QUICK_ATTEMPTS) {
        setQuickAttempts(0);
        setQuickLockedUntil(Date.now() + QUICK_LOCK_MS);
        toast.error('Too many attempts. Quick access is locked for 30 seconds');
      } else {
        setQuickAttempts(attempts);
        toast.error('Incorrect access code');
      }
      return;
    }

    setQuickAttempts(0);
    login({ id: 'admin', name: 'Admin', role: 'staff' as const, staffId: 'ADMIN001' });
    toast.success('Quick access granted!');
    navigate(returnPath, { replace: true });
  };

  const accent =
    role === 'student'
      ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
      : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600';

  const activeTabClass =
    'data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white text-slate-300 font-medium';

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      <VideoBackground />

      <main className="w-full max-w-md relative z-10 space-y-4">
        <Card className="backdrop-blur-2xl bg-slate-900/40 border-slate-700/50 shadow-2xl">
          <CardHeader className="space-y-4 pb-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${
                  role === 'student' ? 'from-blue-500 to-purple-500' : 'from-purple-500 to-pink-500'
                }`}
              >
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-white">
                  {role === 'student' ? 'Student Access' : 'Staff Login'}
                </CardTitle>
                <p className="text-xs text-slate-400">Smart Hostel Cleaning System</p>
              </div>
            </div>

            <Tabs
              value={role}
              onValueChange={(v) => {
                setRole(v as AccessRole);
                setErrors({});
              }}
            >
              <TabsList className="grid w-full grid-cols-2 backdrop-blur-md bg-slate-800/50 border border-slate-700/50">
                <TabsTrigger value="student" className={activeTabClass}>
                  <DoorOpen className="h-4 w-4 mr-2" />
                  Student
                </TabsTrigger>
                <TabsTrigger value="staff" className={activeTabClass}>
                  <BadgeCheck className="h-4 w-4 mr-2" />
                  Staff
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {role === 'student' && (
              <Tabs
                value={studentTab}
                onValueChange={(v) => {
                  setStudentTab(v as StudentTab);
                  setErrors({});
                }}
              >
                <TabsList className="grid w-full grid-cols-2 backdrop-blur-md bg-slate-800/50 border border-slate-700/50">
                  <TabsTrigger value="login" className={activeTabClass}>
                    Login
                  </TabsTrigger>
                  <TabsTrigger value="register" className={activeTabClass}>
                    Register
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </CardHeader>

          {role === 'student' && studentTab === 'login' && (
            <form onSubmit={handleStudentLogin} noValidate>
              <CardContent className="space-y-4">
                <Field
                  id="student-login-name"
                  label="Username"
                  icon={User}
                  value={loginName}
                  onChange={setLoginName}
                  onBlur={() => blur('loginName', loginName)}
                  error={errors.loginName}
                  placeholder="Enter username"
                  autoComplete="username"
                />
                <PasswordField
                  id="student-login-password"
                  label="Password"
                  value={loginPassword}
                  onChange={setLoginPassword}
                  onBlur={() => blur('loginPassword', loginPassword)}
                  error={errors.loginPassword}
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberStudent}
                    onChange={(e) => setRememberStudent(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800"
                  />
                  Remember my username
                </label>
              </CardContent>
              <CardFooter className="flex-col gap-3">
                <Button type="submit" className={`w-full text-white font-medium py-6 text-lg ${accent}`}>
                  Login
                </Button>
                <button
                  type="button"
                  onClick={() => setStudentTab('register')}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  New here? Create an account
                </button>
              </CardFooter>
            </form>
          )}

          {role === 'student' && studentTab === 'register' && (
            <form onSubmit={handleStudentRegister} noValidate>
              <CardContent className="space-y-4">
                <Field
                  id="student-register-name"
                  label="Full Name"
                  icon={User}
                  value={registerName}
                  onChange={setRegisterName}
                  onBlur={() => blur('registerName', registerName)}
                  error={errors.registerName}
                  placeholder="John Doe"
                  autoComplete="name"
                />
                <Field
                  id="student-register-room"
                  label="Room Number"
                  icon={DoorOpen}
                  value={registerRoom}
                  onChange={(v) => setRegisterRoom(v.toUpperCase())}
                  onBlur={() => blur('registerRoom', registerRoom)}
                  error={errors.registerRoom}
                  placeholder="e.g., A101"
                  hint="Block letter followed by the room number"
                />
                <PasswordField
                  id="student-register-password"
                  label="Password"
                  value={registerPassword}
                  onChange={setRegisterPassword}
                  onBlur={() => blur('registerPassword', registerPassword)}
                  error={errors.registerPassword}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  showStrength
                />
              </CardContent>
              <CardFooter className="flex-col gap-3">
                <Button type="submit" className={`w-full text-white font-medium py-6 text-lg ${accent}`}>
                  Register
                </Button>
                <button
                  type="button"
                  onClick={() => setStudentTab('login')}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Already registered? Log in
                </button>
              </CardFooter>
            </form>
          )}

          {role === 'staff' && (
            <form onSubmit={handleStaffLogin} noValidate>
              <CardContent className="space-y-4">
                <Field
                  id="staff-name"
                  label="Username"
                  icon={User}
                  value={staffName}
                  onChange={setStaffName}
                  onBlur={() => blur('staffName', staffName)}
                  error={errors.staffName}
                  placeholder="Enter username"
                  autoComplete="username"
                />
                <Field
                  id="staff-id"
                  label="Staff ID"
                  icon={BadgeCheck}
                  value={staffId}
                  onChange={(v) => setStaffId(v.toUpperCase())}
                  onBlur={() => blur('staffId', staffId)}
                  error={errors.staffId}
                  placeholder="Enter staff ID"
                />
                <PasswordField
                  id="staff-password"
                  label="Password"
                  value={staffPassword}
                  onChange={setStaffPassword}
                  onBlur={() => blur('staffPassword', staffPassword)}
                  error={errors.staffPassword}
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberStaff}
                    onChange={(e) => setRememberStaff(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800"
                  />
                  Remember my username
                </label>
              </CardContent>
              <CardFooter>
                <Button type="submit" className={`w-full text-white font-medium py-6 text-lg ${accent}`}>
                  Login
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>

        {QUICK_CODE ? (
          <form onSubmit={handleQuickAccess} aria-label="Quick access">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  placeholder="Quick access code"
                  aria-label="Quick access code"
                  autoComplete="off"
                  value={quickPassword}
                  onChange={(e) => setQuickPassword(e.target.value)}
                  className={`pl-9 ${inputClass}`}
                />
              </div>
              <Button
                type="submit"
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6"
              >
                Go
              </Button>
            </div>
          </form>
        ) : null}
      </main>
    </div>
  );
}

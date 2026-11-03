import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  LayoutDashboard,
  Network,
  MessageSquare,
  Users,
  BarChart3,
  Sparkles,
  RotateCcw,
  BookOpen,
  LogOut,
  UserCircle,
  Menu,
  X,
  Moon,
  Sun,
  AlertTriangle,
} from 'lucide-react';
import { useHostel } from '../context/HostelContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { WelcomeDialog } from './WelcomeDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

type Role = 'student' | 'staff';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/graph', label: 'Room Graph', icon: Network },
  { path: '/request', label: 'Student Request', icon: MessageSquare },
  { path: '/staff', label: 'Staff View', icon: Users, roles: ['staff'] },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/guide', label: 'Quick Guide', icon: BookOpen },
];

const THEME_KEY = 'hostel-theme';
const APP_NAME = 'Smart Hostel Cleaning System';

const readStoredTheme = (): 'light' | 'dark' => {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const initialsOf = (name?: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '');
};

export function Layout() {
  const { resetData, priorityQueue } = useHostel();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof window === 'undefined' ? 'light' : readStoredTheme()
  );

  const role = user?.role as Role | undefined;
  const pendingTasks = priorityQueue.size();

  const navItems = useMemo(
    () => NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role))),
    [role]
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      return;
    }
  }, [theme]);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
    const current = NAV_ITEMS.find((item) =>
      item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
    );
    document.title = current ? `${current.label} | ${APP_NAME}` : APP_NAME;
  }, [location.pathname]);

  const handleLogout = useCallback(() => {
    logout();
    toast.success('Logged out successfully');
    navigate('/auth', { replace: true });
  }, [logout, navigate]);

  const confirmReset = () => {
    resetData();
    setResetOpen(false);
    toast.success('Data reset successfully');
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      if (!e.altKey || e.ctrlKey || e.metaKey) return;

      const match = /^Digit([1-9])$/.exec(e.code);
      if (!match) return;
      const item = navItems[Number(match[1]) - 1];
      if (!item) return;
      e.preventDefault();
      navigate(item.path);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navItems, navigate]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <WelcomeDialog />

      <header className="border-b backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-bold truncate bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {APP_NAME}
                </h1>
                <p className="hidden sm:block text-xs text-muted-foreground">DSA-Powered Resource Optimization</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                variant="outline"
                size="sm"
                className="backdrop-blur-sm"
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <Button
                onClick={() => setResetOpen(true)}
                variant="outline"
                size="sm"
                className="backdrop-blur-sm"
                aria-label="Reset data"
              >
                <RotateCcw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Reset Data</span>
              </Button>

              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="backdrop-blur-sm hidden md:inline-flex"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="backdrop-blur-sm" aria-label="Account menu">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold uppercase text-primary-foreground md:hidden">
                      {initialsOf(user?.name)}
                    </span>
                    <UserCircle className="h-4 w-4 mr-2 hidden md:block" />
                    <span className="hidden md:inline max-w-32 truncate">{user?.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 backdrop-blur-xl bg-white/90 dark:bg-slate-900/90">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-sm">
                    <div className="font-medium">{user?.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Role: <span className="capitalize font-medium">{user?.role}</span>
                    </div>
                    {user?.roomNumber && (
                      <div className="text-xs text-muted-foreground">Room: {user.roomNumber}</div>
                    )}
                    {user?.staffId && (
                      <div className="text-xs text-muted-foreground">Staff ID: {user.staffId}</div>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                className="md:hidden"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-controls="primary-navigation"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              >
                {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <nav
        id="primary-navigation"
        aria-label="Primary"
        className={`border-b backdrop-blur-xl bg-white/50 dark:bg-slate-900/50 ${menuOpen ? 'block' : 'hidden'} md:block`}
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:gap-1 md:overflow-x-auto">
            {navItems.map(({ path, label, icon: Icon }, index) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                title={index < 9 ? `${label} (Alt+${index + 1})` : label}
                className={({ isActive }) => `
                  flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all
                  whitespace-nowrap border-l-2 md:border-l-0 md:border-b-2
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset
                  ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                {path === '/' && pendingTasks > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {pendingTasks}
                  </Badge>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      <main id="main-content" className="container mx-auto px-4 py-6 flex-1">
        <Outlet />
      </main>

      <footer className="border-t backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>
              Demonstrates: Priority Queue (Max Heap) • Graph Traversal (BFS/Dijkstra) • Staff Queue (FIFO) • HashMap
              Historical Tracking
            </p>
            <p className="text-xs">Tip: press Alt + a number to jump between pages</p>
          </div>
        </div>
      </footer>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Reset all data?
            </DialogTitle>
            <DialogDescription>
              This clears the current rooms, queues and history and generates new mock data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

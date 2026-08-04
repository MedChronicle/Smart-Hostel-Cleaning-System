import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router';
import { Button } from './ui/button';
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
  UserCircle
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

export function Layout() {
  const { resetData } = useHostel();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all data? This will generate new mock data.')) {
      resetData();
      toast.success('Data reset successfully');
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/graph', label: 'Room Graph', icon: Network },
    { path: '/request', label: 'Student Request', icon: MessageSquare },
    { path: '/staff', label: 'Staff View', icon: Users },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/guide', label: 'Quick Guide', icon: BookOpen }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900">
      <WelcomeDialog />
      {/* Header */}
      <header className="border-b backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Smart Hostel Cleaning System</h1>
                <p className="text-xs text-muted-foreground">DSA-Powered Resource Optimization</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleReset} variant="outline" size="sm" className="backdrop-blur-sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Data
              </Button>

              <Button onClick={handleLogout} variant="outline" size="sm" className="backdrop-blur-sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="backdrop-blur-sm">
                    <UserCircle className="h-4 w-4 mr-2" />
                    {user?.name}
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
                      <div className="text-xs text-muted-foreground">
                        Room: {user.roomNumber}
                      </div>
                    )}
                    {user?.staffId && (
                      <div className="text-xs text-muted-foreground">
                        Staff ID: {user.staffId}
                      </div>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b backdrop-blur-xl bg-white/50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                className={({ isActive }) => `
                  flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all
                  whitespace-nowrap border-b-2
                  ${isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Demonstrates: Priority Queue (Max Heap) • Graph Traversal (BFS/Dijkstra) • Staff Queue (FIFO) • HashMap Historical Tracking
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
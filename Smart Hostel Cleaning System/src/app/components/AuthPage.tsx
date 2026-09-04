import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { User, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function AuthPage() {
  const [isStaffLogin, setIsStaffLogin] = useState(false);
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Student Login form state
  const [studentLoginName, setStudentLoginName] = useState('');
  const [studentLoginPassword, setStudentLoginPassword] = useState('');

  // Student Register form state
  const [studentRegisterName, setStudentRegisterName] = useState('');
  const [studentRegisterPassword, setStudentRegisterPassword] = useState('');
  const [studentRegisterRoomNumber, setStudentRegisterRoomNumber] = useState('');

  // Staff Login form state
  const [staffLoginName, setStaffLoginName] = useState('');
  const [staffLoginPassword, setStaffLoginPassword] = useState('');
  const [staffLoginId, setStaffLoginId] = useState('');

  // Quick access password
  const [quickPassword, setQuickPassword] = useState('');

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentLoginName || !studentLoginPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    const user = {
      id: Math.random().toString(36).substr(2, 9),
      name: studentLoginName,
      role: 'student' as const,
      roomNumber: 'A101'
    };

    login(user);
    toast.success(`Welcome back, ${user.name}!`);
    navigate('/');
  };

  const handleStudentRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentRegisterName || !studentRegisterPassword || !studentRegisterRoomNumber) {
      toast.error('Please fill in all fields');
      return;
    }

    const user = {
      id: Math.random().toString(36).substr(2, 9),
      name: studentRegisterName,
      role: 'student' as const,
      roomNumber: studentRegisterRoomNumber
    };

    register(user);
    toast.success(`Welcome, ${user.name}! Your account has been created.`);
    navigate('/');
  };

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!staffLoginName || !staffLoginPassword || !staffLoginId) {
      toast.error('Please fill in all fields');
      return;
    }

    const user = {
      id: Math.random().toString(36).substr(2, 9),
      name: staffLoginName,
      role: 'staff' as const,
      staffId: staffLoginId
    };

    login(user);
    toast.success(`Welcome, ${user.name}!`);
    navigate('/');
  };

  const handleQuickAccess = (e: React.FormEvent) => {
    e.preventDefault();

    if (!quickPassword) {
      toast.error('Please enter password');
      return;
    }

    // Quick access - create a temporary admin user
    const user = {
      id: 'admin',
      name: 'Admin',
      role: 'staff' as const,
      staffId: 'ADMIN001'
    };

    login(user);
    toast.success('Quick access granted!');
    navigate('/');
  };

  // Staff Login View
  if (isStaffLogin) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
        {/* YouTube Video Background */}
        <div className="absolute inset-0 w-full h-full">
          <iframe
            className="absolute top-1/2 left-1/2 w-[100vw] h-[100vh] min-w-[100vw] min-h-[100vh] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ 
              width: '100vw',
              height: '56.25vw', // 16:9 aspect ratio
              minHeight: '100vh',
              minWidth: '177.77vh', // 16:9 aspect ratio
            }}
            src="https://www.youtube.com/embed/t822he3vtLE?autoplay=1&mute=1&loop=1&playlist=t822he3vtLE&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
            allow="autoplay; fullscreen"
            frameBorder="0"
          />
          <div className="absolute inset-0 bg-black/60"></div>
        </div>

        {/* Content */}
        <Card className="w-full max-w-md backdrop-blur-2xl bg-slate-900/40 border-slate-700/50 shadow-2xl relative z-10">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-2xl text-white">Staff Login</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsStaffLogin(false)}
                className="text-slate-300 hover:text-white hover:bg-white/10"
              >
                Back
              </Button>
            </div>
          </CardHeader>

          <form onSubmit={handleStaffLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="staff-name" className="text-white">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    id="staff-name"
                    type="text"
                    placeholder="Enter username"
                    value={staffLoginName}
                    onChange={(e) => setStaffLoginName(e.target.value)}
                    className="pl-10 backdrop-blur-md bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:bg-slate-800/70 focus:border-slate-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-id" className="text-white">Staff ID</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    id="staff-id"
                    type="text"
                    placeholder="Enter staff ID"
                    value={staffLoginId}
                    onChange={(e) => setStaffLoginId(e.target.value)}
                    className="pl-10 backdrop-blur-md bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:bg-slate-800/70 focus:border-slate-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-password" className="text-white">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    id="staff-password"
                    type="password"
                    placeholder="Enter password"
                    value={staffLoginPassword}
                    onChange={(e) => setStaffLoginPassword(e.target.value)}
                    className="pl-10 backdrop-blur-md bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:bg-slate-800/70 focus:border-slate-500"
                    required
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter>
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-6 text-lg"
              >
                Login
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // Student Login/Register View (Default)
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* YouTube Video Background */}
      <div className="absolute inset-0 w-full h-full">
        <iframe
          className="absolute top-1/2 left-1/2 w-[100vw] h-[100vh] min-w-[100vw] min-h-[100vh] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ 
            width: '100vw',
            height: '56.25vw', // 16:9 aspect ratio
            minHeight: '100vh',
            minWidth: '177.77vh', // 16:9 aspect ratio
          }}
          src="https://www.youtube.com/embed/t822he3vtLE?autoplay=1&mute=1&loop=1&playlist=t822he3vtLE&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
          allow="autoplay; fullscreen"
          frameBorder="0"
        />
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      {/* Content */}
      <div className="w-full max-w-md relative z-10">
        <Card className="backdrop-blur-2xl bg-slate-900/40 border-slate-700/50 shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-2xl text-white">Student Access</CardTitle>
            </div>
          </CardHeader>

          <Tabs defaultValue="login" className="w-full">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-2 backdrop-blur-md bg-slate-800/50 border border-slate-700/50">
                <TabsTrigger 
                  value="login" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white text-slate-300 font-medium"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white text-slate-300 font-medium"
                >
                  Register
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="login">
              <form onSubmit={handleStudentLogin}>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="student-login-name" className="text-white">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="student-login-name"
                        type="text"
                        placeholder="Enter username"
                        value={studentLoginName}
                        onChange={(e) => setStudentLoginName(e.target.value)}
                        className="pl-10 backdrop-blur-md bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:bg-slate-800/70 focus:border-slate-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="student-login-password" className="text-white">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="student-login-password"
                        type="password"
                        placeholder="Enter password"
                        value={studentLoginPassword}
                        onChange={(e) => setStudentLoginPassword(e.target.value)}
                        className="pl-10 backdrop-blur-md bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:bg-slate-800/70 focus:border-slate-500"
                        required
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium py-6 text-lg"
                  >
                    Login
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleStudentRegister}>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="student-register-name" className="text-white">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="student-register-name"
                        type="text"
                        placeholder="John Doe"
                        value={studentRegisterName}
                        onChange={(e) => setStudentRegisterName(e.target.value)}
                        className="pl-10 backdrop-blur-md bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:bg-slate-800/70 focus:border-slate-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="student-register-room" className="text-white">Room Number</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="student-register-room"
                        type="text"
                        placeholder="e.g., A101"
                        value={studentRegisterRoomNumber}
                        onChange={(e) => setStudentRegisterRoomNumber(e.target.value)}
                        className="pl-10 backdrop-blur-md bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:bg-slate-800/70 focus:border-slate-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="student-register-password" className="text-white">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="student-register-password"
                        type="password"
                        placeholder="Enter password"
                        value={studentRegisterPassword}
                        onChange={(e) => setStudentRegisterPassword(e.target.value)}
                        className="pl-10 backdrop-blur-md bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:bg-slate-800/70 focus:border-slate-500"
                        required
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium py-6 text-lg"
                  >
                    Register
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Staff Login Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsStaffLogin(true)}
            className="group inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            <span className="text-lg">STAFF ACCESS</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Quick Password Access */}
        <form onSubmit={handleQuickAccess} className="mt-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="password"
                placeholder="Enter quick access password"
                value={quickPassword}
                onChange={(e) => setQuickPassword(e.target.value)}
                className="pl-9 backdrop-blur-md bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:bg-slate-800/70 focus:border-slate-500"
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
      </div>
    </div>
  );
}

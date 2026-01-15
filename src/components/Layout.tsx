import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  LogOut,
  UserCog,
  DoorOpen,
  Clock,
  BarChart3,
  Menu,
  Bell,
  ChevronDown,
  Wifi,
  WifiOff,
  Banknote
} from 'lucide-react';
import shemaLogo from '@/assets/shemalogo.png';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import api from '@/services/api';
import { useState, useEffect } from 'react';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { isConnected, unreadCount } = useAdminNotifications();
  

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
  });

  useEffect(() => {
    const initializeUser = async () => {
      // 1. Try to get from local storage first for immediate render
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setEditForm({
            name: parsedUser.name || '',
            email: parsedUser.email || '',
          });
        } catch (e) {
          console.error("Failed to parse user from local storage", e);
        }
      }

      // 2. Also fetch fresh data from Supabase to ensure it's up to date
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        const userData = {
          id: authUser.id,
          email: authUser.email,
          // Prioritize metadata name, then existing local name, then email part
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Admin',
          role: authUser.app_metadata?.role || 'Administrator'
        };

        // Update state and local storage if different (or just always update to be safe)
        setUser(userData);
        setEditForm({
          name: userData.name || '',
          email: userData.email || '',
        });
        localStorage.setItem('user', JSON.stringify(userData));
      }
    };

    initializeUser();
  }, []);

  const handleUpdateProfile = async () => {
    // In a real app, this would call an API endpoint
    // For now, we'll just update the local state and localStorage
    try {
      const updatedUser = { ...user, ...editForm };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditProfileOpen(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to update profile.",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
      // Supabase signOut
      await supabase.auth.signOut();
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    } catch (error) {
      console.error("Logout failed", error);
      // Force logout anyway
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/notifications', label: 'Notifications', icon: Bell },
    { href: '/instructors', label: 'Instructors', icon: UserCog },
    { href: '/rooms', label: 'Rooms', icon: DoorOpen },
    { href: '/courses', label: 'Courses', icon: BookOpen },
    { href: '/schedules', label: 'Schedules', icon: Clock },
    { href: '/bookings', label: 'Bookings', icon: Calendar },
    { href: '/students', label: 'Students', icon: GraduationCap },

    { href: '/payments', label: 'Payments', icon: Banknote },
    { href: '/reports', label: 'Reports', icon: BarChart3 },
  ];

  const getPageTitle = () => {
    const currentItem = navItems.find(item => item.href === location.pathname);
    return currentItem ? currentItem.label : 'Dashboard';
  };

  return (
    <div className="flex h-screen bg-gray-50/50 font-sans">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-gray-200 shadow-sm flex flex-col transition-all duration-300 ease-in-out z-20",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
            <img 
              src={shemaLogo} 
              alt="Shema Music" 
              className={cn(
                "object-contain transition-all duration-300",
                isSidebarOpen ? "h-8 w-auto" : "h-6 w-6"
              )} 
            />
            {isSidebarOpen && <span className="transition-opacity duration-300">Shema Music</span>}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link key={item.href} to={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start mb-1 transition-all duration-200",
                    isActive 
                      ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary font-medium" 
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-100",
                    !isSidebarOpen && "justify-center px-2"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isSidebarOpen && "mr-3", isActive ? "text-primary" : "text-gray-400 group-hover:text-gray-600")} />
                  {isSidebarOpen && <span>{item.label}</span>}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50",
              !isSidebarOpen && "justify-center px-2"
            )} 
            onClick={handleLogout}
          >
            <LogOut className={cn("h-5 w-5", isSidebarOpen && "mr-3")} />
            {isSidebarOpen && "Logout"}
          </Button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-gray-500 hover:bg-gray-100"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-800">{getPageTitle()}</h1>
          </div>

          <div className="flex items-center gap-4">

            
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative text-gray-500 hover:bg-gray-100 rounded-full group"
                onClick={() => navigate('/notifications')}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-white text-[10px] text-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                {/* Realtime Connection Status Indicator */}
                <span 
                  className={cn(
                    "absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white flex items-center justify-center",
                    isConnected ? "bg-green-500" : "bg-gray-400"
                  )}
                  title={isConnected ? "Realtime Connected" : "Reconnecting..."}
                >
                  {isConnected ? (
                    <Wifi className="h-2 w-2 text-white" />
                  ) : (
                    <WifiOff className="h-2 w-2 text-white" />
                  )}
                </span>
              </Button>
            </div>

            <div className="h-8 w-px bg-gray-200 mx-1"></div>

            <div className="relative">
              <div 
                className="flex items-center gap-3 pl-2 cursor-pointer hover:bg-gray-50 p-1 rounded-lg transition-colors"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium border border-primary/20">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-700">{user?.name || 'Admin User'}</p>
                  <p className="text-xs text-gray-500">{user?.role || 'Administrator'}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 hidden md:block" />
              </div>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
                  <div className="p-1">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-sm font-normal"
                      onClick={() => {
                        setIsEditProfileOpen(true);
                        setShowProfileMenu(false);
                      }}
                    >
                      <UserCog className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-sm font-normal text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
            <Outlet />
          </div>
        </main>
      </div>

      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleUpdateProfile}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

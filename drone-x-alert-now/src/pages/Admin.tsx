import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Shield, Users, Settings, LogOut, AlertTriangle, Activity,
  Database, Video, UserCheck, MapPin, Clock, CheckCircle,
  Plus, Edit, Trash2, Eye, Play, Square, Zap
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { AdminStreamControls } from "@/components/AdminStreamControls";
import { SystemAlertsManager } from "@/components/SystemAlertsManager";
import { UserManagement } from "@/components/UserManagement";
import { EmergencyRequestsAdmin } from "@/components/EmergencyRequestsAdmin";
import { emergencyService } from "@/services/emergencyService";
import type { EmergencyAlert } from '@/services/emergencyService';
import EmergencyAlertsList from '@/components/EmergencyAlertsList';
import { useAuth } from '@/hooks/useAuth';

const Admin = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeEmergencies, setActiveEmergencies] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/admin-auth");
        } else {
          checkAdminRole(session.user.id);
          fetchActiveEmergencies();
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/admin-auth");
      } else {
        checkAdminRole(session.user.id);
        fetchActiveEmergencies();
      }
      setLoading(false);
    });

    // Subscribe to real-time emergency updates from Supabase (cross-browser sync)
    const emergencyChannel = supabase
      .channel('emergency_alerts_admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_alerts'
        },
        (payload) => {
          console.log('🔄 Real-time emergency update received:', payload);
          fetchActiveEmergencies();
        }
      )
      .subscribe((status) => {
        console.log('🔔 Emergency subscription status:', status);
      });

    // Subscribe to broadcast channel for manual resolution sync
    const broadcastChannel = supabase
      .channel('emergency_resolution_broadcast')
      .on('broadcast', { event: 'emergency_resolved' }, (payload: any) => {
        console.log('📢 Admin received resolution broadcast:', payload);
        fetchActiveEmergencies();
      })
      .subscribe();

    // Also listen for localStorage changes (cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'emergency_resolved') {
        console.log('🔄 Admin: Storage change detected, refreshing count');
        fetchActiveEmergencies();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events (same-tab sync)
    const handleCustomEvent = () => {
      console.log('🔄 Admin: Custom event detected, refreshing count');
      fetchActiveEmergencies();
    };
    window.addEventListener('emergency_resolved', handleCustomEvent);

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(emergencyChannel);
      supabase.removeChannel(broadcastChannel);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('emergency_resolved', handleCustomEvent);
    };
  }, [navigate]);

  // Fetch active emergencies count
  const fetchActiveEmergencies = async () => {
    console.log('🔄 Admin.fetchActiveEmergencies called');
    try {
      const emergencies = await emergencyService.getAllActiveEmergencies();
      console.log('📊 Admin received emergencies count:', emergencies.length);
      setActiveEmergencies(emergencies.length);
    } catch (error) {
      console.error('Error fetching active emergencies:', error);
    }
  };

  const checkAdminRole = async (userId: string) => {
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const hasAdminRole = roles?.some(r => r.role === 'admin');
      setIsAdmin(hasAdminRole || false);
      
      if (!hasAdminRole) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges.",
          variant: "destructive",
        });
        navigate("/admin-auth");
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
      navigate("/admin-auth");
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      navigate("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-sky-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-white">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-sky-100 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Link to="/" className="flex items-center space-x-2">
                <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-sky-500" />
                <span className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-sky-600 to-sky-400 bg-clip-text text-transparent">
                  DroneX Admin
                </span>
              </Link>
              <Badge className="ml-2 sm:ml-4 bg-red-100 text-red-700 text-xs sm:text-sm">
                <Settings className="h-3 w-3 mr-1" />
                Admin Panel
              </Badge>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link to="/dashboard">
                <Button variant="outline" className="border-sky-300 text-sky-600 hover:bg-sky-50 h-9 px-2 sm:px-4 text-xs sm:text-sm">
                  <Eye className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">User Dashboard</span>
                  <span className="sm:hidden">User</span>
                </Button>
              </Link>
              <Button variant="outline" onClick={handleSignOut} className="h-9 px-2 sm:px-4 text-xs sm:text-sm">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
                <span className="sm:hidden">Out</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Admin Control Center
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage system operations, users, and emergency responses
          </p>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 gap-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="streams" className="text-xs sm:text-sm">Streams</TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
            <TabsTrigger value="emergencies" className="text-xs sm:text-sm">Emergency</TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs sm:text-sm">Alerts</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
              {[
                { label: "Active Users", value: "247", icon: Users, color: "text-blue-500" },
                { label: "Live Streams", value: "3", icon: Video, color: "text-green-500" },
                { label: "Active Emergencies", value: activeEmergencies.toString(), icon: AlertTriangle, color: "text-red-500" },
                { label: "System Status", value: "Online", icon: Activity, color: "text-green-500" },
              ].map((stat, index) => (
                <Card key={index} className="border-sky-100 hover:shadow-lg transition-shadow">
                  <CardContent className="p-3 sm:p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-600">{stat.label}</p>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{stat.value}</p>
                      </div>
                      <stat.icon className={`h-6 w-6 sm:h-8 sm:w-8 ${stat.color} flex-shrink-0 ml-2`} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
              <Card className="border-sky-100">
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-base sm:text-lg">Recent Activities</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Latest system events and user actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 sm:space-y-4">
                    {[
                      { type: "emergency", message: "New emergency request received", time: "2 minutes ago" },
                      { type: "stream", message: "Drone stream started in Downtown", time: "5 minutes ago" },
                      { type: "user", message: "New user registered", time: "10 minutes ago" },
                      { type: "system", message: "System backup completed", time: "1 hour ago" },
                    ].map((activity, index) => (
                      <div key={index} className="flex items-center space-x-3 p-2 sm:p-3 rounded-lg bg-gray-50">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          activity.type === 'emergency' ? 'bg-red-500' :
                          activity.type === 'stream' ? 'bg-green-500' :
                          activity.type === 'user' ? 'bg-blue-500' : 'bg-gray-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium truncate">{activity.message}</p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-sky-100">
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3">
                  <Button className="w-full justify-start" variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="text-xs sm:text-sm">Start New Drone Stream</span>
                  </Button>
                  <Button className="w-full justify-start" variant="outline" size="sm">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <span className="text-xs sm:text-sm">Create System Alert</span>
                  </Button>
                  <Button className="w-full justify-start" variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    <span className="text-xs sm:text-sm">Manage User Roles</span>
                  </Button>
                  <Button className="w-full justify-start" variant="outline" size="sm">
                    <Database className="h-4 w-4 mr-2" />
                    <span className="text-xs sm:text-sm">Export System Data</span>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="streams">
            <AdminStreamControls />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="emergencies">
            <div className="space-y-4 sm:space-y-6">
              <Card className="border-sky-100">
                <CardHeader className="pb-3 sm:pb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base sm:text-lg">Active Emergency Alerts</CardTitle>
                    <Badge variant="destructive" className="mt-2 sm:mt-0 ml-0 sm:ml-2 text-xs sm:text-sm">
                      {activeEmergencies} Active
                    </Badge>
                  </div>
                  <CardDescription className="text-xs sm:text-sm">
                    Real-time emergency alerts from the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => console.log('Debug: Active emergencies:', activeEmergencies)} variant="outline" size="sm" className="text-xs sm:text-sm">
                        🐛 Debug Info
                      </Button>
                      <Button onClick={() => fetchActiveEmergencies()} variant="outline" size="sm" className="text-xs sm:text-sm">
                        🔄 Refresh Alerts
                      </Button>
                    </div>
                    <EmergencyAlertsList />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts">
            <SystemAlertsManager />
          </TabsContent>

          <TabsContent value="settings">
            <Card className="border-sky-100">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">System Settings</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Configure system-wide preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 sm:space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-base sm:text-lg font-medium">Emergency Response</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Auto-assign rescue teams</label>
                        <p className="text-xs sm:text-sm text-gray-500">Automatically assign nearest available teams</p>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs sm:text-sm">Configure</Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-base sm:text-lg font-medium">Drone Operations</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Default stream quality</label>
                        <p className="text-xs sm:text-sm text-gray-500">Set default quality for new streams</p>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs sm:text-sm">Configure</Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-base sm:text-lg font-medium">Notifications</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Alert thresholds</label>
                        <p className="text-xs sm:text-sm text-gray-500">Configure when to send alerts</p>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs sm:text-sm">Configure</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;

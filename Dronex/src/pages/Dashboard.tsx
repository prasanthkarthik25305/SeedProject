import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, Camera, MapPin, Users, Settings, LogOut, 
  AlertTriangle, Phone, Mail, User, Heart, Activity,
  Navigation, Zap, Clock, CheckCircle, Video, Headphones
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { RealtimeDroneStream } from "@/components/RealtimeDroneStream";
import { AdminStreamControls } from "@/components/AdminStreamControls";
import { LiveMap } from "@/components/LiveMap";
import GoogleMap from "@/components/GoogleMap";
import { ProfileForm } from "@/components/ProfileForm";
import { EmergencyContacts } from "@/components/EmergencyContacts";
import { LocationSharing } from "@/components/LocationSharing";

const Dashboard = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check current auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/auth");
        } else {
          checkUserRole(session.user.id);
        }
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else {
        checkUserRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUserRole = async (userId: string) => {
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const hasAdminRole = roles?.some(r => r.role === 'admin');
      setIsAdmin(hasAdminRole || false);
    } catch (error) {
      console.error('Error checking user role:', error);
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
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const emergencyStats = [
    { label: "Active Alerts", value: "3", icon: AlertTriangle, color: "text-red-500" },
    { label: "Response Time", value: "2.3m", icon: Clock, color: "text-orange-500" },
    { label: "Resolved Today", value: "12", icon: CheckCircle, color: "text-green-500" },
    { label: "Teams Available", value: "8", icon: Users, color: "text-blue-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-white">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-sky-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Link to="/" className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-sky-500" />
                <span className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-sky-400 bg-clip-text text-transparent">
                  DroneX
                </span>
              </Link>
              <Badge className="ml-4 bg-green-100 text-green-700">
                <Activity className="h-3 w-3 mr-1" />
                Online
              </Badge>
              {isAdmin && (
                <Badge className="bg-blue-100 text-blue-700">
                  <Settings className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/ai-assistant">
                <Button variant="outline" className="border-sky-300 text-sky-600 hover:bg-sky-50">
                  <Headphones className="h-4 w-4 mr-2" />
                  AI Assistant
                </Button>
              </Link>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Emergency Management Dashboard
          </h1>
          <p className="text-gray-600">
            Monitor live feeds, track locations, and manage emergency responses in real-time.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {emergencyStats.map((stat, index) => (
            <Card key={index} className="border-sky-100 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-6' : 'grid-cols-5'}`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="camera">Live Feed</TabsTrigger>
            <TabsTrigger value="map">GPS Tracking</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin">Stream Control</TabsTrigger>}
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Real-time Drone Stream */}
              <div className="lg:col-span-2">
                <Card className="border-sky-100">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center">
                          <Video className="h-5 w-5 mr-2 text-sky-500" />
                          Live Drone Stream
                        </CardTitle>
                        <CardDescription>
                          Real-time admin-controlled drone feeds with AI detection
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <RealtimeDroneStream />
                  </CardContent>
                </Card>
              </div>

              {/* Emergency Contacts */}
              <div>
                <Card className="border-sky-100">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Phone className="h-5 w-5 mr-2 text-sky-500" />
                      Emergency Contacts
                    </CardTitle>
                    <CardDescription>
                      Your priority contact list
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <EmergencyContacts readOnly />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* GPS Map */}
            <Card className="border-sky-100">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-sky-500" />
                  Live Location Tracking
                </CardTitle>
                <CardDescription>
                  Real-time GPS monitoring and emergency location mapping
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LiveMap />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="camera">
            <Card className="border-sky-100">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Video className="h-5 w-5 mr-2 text-sky-500" />
                  Live Drone Stream
                </CardTitle>
                <CardDescription>
                  High-resolution live feed with AI-powered object detection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RealtimeDroneStream fullSize />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="map">
            <Card className="border-sky-100">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-sky-500" />
                  GPS Tracking & Navigation
                </CardTitle>
                <CardDescription>
                  Real-time location monitoring and emergency navigation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GoogleMap fullSize={true} />
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin">
              <AdminStreamControls />
            </TabsContent>
          )}

          <TabsContent value="profile">
            <div className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-sky-100">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="h-5 w-5 mr-2 text-sky-500" />
                      Personal Information
                    </CardTitle>
                    <CardDescription>
                      Update your profile and emergency details
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProfileForm />
                  </CardContent>
                </Card>

                <Card className="border-sky-100">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Phone className="h-5 w-5 mr-2 text-sky-500" />
                      Emergency Contacts
                    </CardTitle>
                    <CardDescription>
                      Manage your emergency contact list (up to 5 contacts)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <EmergencyContacts />
                  </CardContent>
                </Card>
              </div>
              
              <LocationSharing 
                contacts={[]} 
                onContactUpdate={() => {}} 
              />
            </div>
          </TabsContent>

          <TabsContent value="guidelines">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { 
                  title: "Earthquake Safety", 
                  description: "Drop, Cover, and Hold On protocols",
                  color: "border-orange-200 bg-orange-50",
                  icon: "🏠"
                },
                { 
                  title: "Hurricane Preparedness", 
                  description: "Evacuation and shelter guidelines",
                  color: "border-blue-200 bg-blue-50",
                  icon: "🌪️"
                },
                { 
                  title: "Fire Emergency", 
                  description: "Evacuation routes and safety measures",
                  color: "border-red-200 bg-red-50",
                  icon: "🔥"
                },
                { 
                  title: "Flood Response", 
                  description: "Water safety and evacuation procedures",
                  color: "border-cyan-200 bg-cyan-50",
                  icon: "🌊"
                },
                { 
                  title: "Medical Emergency", 
                  description: "First aid and emergency response",
                  color: "border-green-200 bg-green-50",
                  icon: "🏥"
                },
                { 
                  title: "General Preparedness", 
                  description: "Emergency kit and communication plans",
                  color: "border-purple-200 bg-purple-50",
                  icon: "📋"
                }
              ].map((guideline, index) => (
                <Card key={index} className={`${guideline.color} hover:shadow-lg transition-shadow cursor-pointer`}>
                  <CardHeader className="text-center">
                    <div className="text-4xl mb-2">{guideline.icon}</div>
                    <CardTitle className="text-lg">{guideline.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center">
                      {guideline.description}
                    </CardDescription>
                    <Button variant="outline" className="w-full mt-4">
                      View Guidelines
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;

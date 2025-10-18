
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, Users, Settings, LogOut, AlertTriangle, Activity,
  MapPin, Clock, CheckCircle, Navigation, Phone, Mail,
  Play, Square, Eye, Map, Zap
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import TeamLocationTracker from "@/components/TeamLocationTracker";
import { RescueMissions } from "@/components/RescueMissions";

const RescueTeam = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRescueTeam, setIsRescueTeam] = useState(false);
  const [teamData, setTeamData] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/rescue-team-auth");
        } else {
          checkRescueTeamRole(session.user.id);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/rescue-team-auth");
      } else {
        checkRescueTeamRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkRescueTeamRole = async (userId: string) => {
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const hasRescueTeamRole = roles?.some(r => r.role === 'rescue_team');
      setIsRescueTeam(hasRescueTeamRole || false);
      
      if (hasRescueTeamRole) {
        // Fetch team data
        const { data: team } = await supabase
          .from('rescue_teams')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        setTeamData(team);
      } else {
        toast({
          title: "Access Denied",
          description: "You don't have rescue team privileges.",
          variant: "destructive",
        });
        navigate("/rescue-team-auth");
      }
    } catch (error) {
      console.error('Error checking rescue team role:', error);
      navigate("/rescue-team-auth");
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
      <div className="min-h-screen bg-gradient-to-br from-white via-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-orange-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading rescue team dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !isRescueTeam) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-orange-50 to-white">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-orange-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Link to="/" className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-orange-500" />
                <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent">
                  DroneX Rescue
                </span>
              </Link>
              <Badge className="ml-4 bg-orange-100 text-orange-700">
                <Activity className="h-3 w-3 mr-1" />
                Rescue Team
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/dashboard">
                <Button variant="outline" className="border-orange-300 text-orange-600 hover:bg-orange-50">
                  <Eye className="h-4 w-4 mr-2" />
                  User Dashboard
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
            Rescue Operations Center
          </h1>
          <p className="text-gray-600">
            {teamData?.team_name} - Emergency response and mission coordination
          </p>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="missions">Active Missions</TabsTrigger>
            <TabsTrigger value="location">Location Tracking</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
            <TabsTrigger value="settings">Team Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: "Active Missions", value: "2", icon: AlertTriangle, color: "text-red-500" },
                { label: "Team Status", value: "Available", icon: Activity, color: "text-green-500" },
                { label: "Response Time", value: "12 min", icon: Clock, color: "text-blue-500" },
                { label: "Missions Completed", value: "45", icon: CheckCircle, color: "text-green-500" },
              ].map((stat, index) => (
                <Card key={index} className="border-orange-100 hover:shadow-lg transition-shadow">
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

            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="border-orange-100">
                <CardHeader>
                  <CardTitle>Team Information</CardTitle>
                  <CardDescription>Current team details and specialization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Team Name</p>
                      <p className="text-lg font-semibold">{teamData?.team_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Specialization</p>
                      <p className="text-lg font-semibold">{teamData?.specialization || 'General Rescue'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Status</p>
                      <Badge className={`${teamData?.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {teamData?.status || 'Available'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Contact</p>
                      <p className="text-sm text-gray-700">{teamData?.contact_phone}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-orange-100">
                <CardHeader>
                  <CardTitle>Recent Activities</CardTitle>
                  <CardDescription>Latest rescue operations and updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { type: "mission", message: "Assigned to emergency rescue in Downtown", time: "15 minutes ago" },
                      { type: "status", message: "Team status updated to Available", time: "1 hour ago" },
                      { type: "mission", message: "Successfully completed search mission", time: "3 hours ago" },
                      { type: "training", message: "Completed safety training module", time: "1 day ago" },
                    ].map((activity, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-orange-50">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.type === 'mission' ? 'bg-red-500' :
                          activity.type === 'status' ? 'bg-green-500' :
                          activity.type === 'training' ? 'bg-blue-500' : 'bg-gray-500'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.message}</p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="missions">
            <RescueMissions teamId={teamData?.id} />
          </TabsContent>

          <TabsContent value="location">
            <TeamLocationTracker teamId={teamData?.id} />
          </TabsContent>

          <TabsContent value="communications">
            <Card className="border-orange-100">
              <CardHeader>
                <CardTitle>Emergency Communications</CardTitle>
                <CardDescription>Communication channels and emergency contacts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="p-4 border-orange-200">
                      <h3 className="font-semibold mb-3 flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-orange-500" />
                        Emergency Hotlines
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Fire Department:</span>
                          <span className="font-mono">911</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Medical Emergency:</span>
                          <span className="font-mono">911</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Police:</span>
                          <span className="font-mono">911</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Coast Guard:</span>
                          <span className="font-mono">(555) 123-4567</span>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 border-orange-200">
                      <h3 className="font-semibold mb-3 flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-orange-500" />
                        Team Communications
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Command Center:</span>
                          <span className="font-mono">dispatch@rescue.com</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Medical Support:</span>
                          <span className="font-mono">medical@rescue.com</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Logistics:</span>
                          <span className="font-mono">logistics@rescue.com</span>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <Card className="p-4 border-orange-200">
                    <h3 className="font-semibold mb-3">Communication Protocols</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>• All emergency communications must be logged and timestamped</p>
                      <p>• Use clear, concise language and standard radio protocols</p>
                      <p>• Report status updates every 15 minutes during active missions</p>
                      <p>• Maintain radio contact with command center at all times</p>
                    </div>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="border-orange-100">
              <CardHeader>
                <CardTitle>Team Settings</CardTitle>
                <CardDescription>Manage team preferences and configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Team Status</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Current Status</label>
                        <p className="text-sm text-gray-500">Update your team's availability status</p>
                      </div>
                      <Button variant="outline" size="sm">Update Status</Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Location Tracking</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">GPS Tracking</label>
                        <p className="text-sm text-gray-500">Enable/disable real-time location sharing</p>
                      </div>
                      <Button variant="outline" size="sm">Configure</Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Notifications</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Emergency Alerts</label>
                        <p className="text-sm text-gray-500">Configure notification preferences</p>
                      </div>
                      <Button variant="outline" size="sm">Configure</Button>
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

export default RescueTeam;

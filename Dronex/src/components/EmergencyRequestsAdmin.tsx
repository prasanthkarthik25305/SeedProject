
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MapPin, Clock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmergencyRequest {
  id: string;
  user_id: string;
  emergency_type: string;
  description?: string;
  priority: string;
  status: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
  user_profile: { full_name: string } | null;
  missions: Array<{
    id: string;
    rescue_team_id: string;
    status: string;
    rescue_teams: {
      team_name: string;
    };
  }>;
}

export const EmergencyRequestsAdmin = () => {
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_requests')
        .select(`
          *
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related data separately
      const requestsWithDetails = await Promise.all(
        (data || []).map(async (request) => {
          // Get user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', request.user_id)
            .single();

          // Get missions
          const { data: missions } = await supabase
            .from('rescue_missions')
            .select(`
              id,
              rescue_team_id,
              status,
              rescue_teams:rescue_team_id (
                team_name
              )
            `)
            .eq('emergency_request_id', request.id);

          return {
            ...request,
            user_profile: profile,
            missions: missions || []
          };
        })
      );

      setRequests(requestsWithDetails);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast({
        title: "Error",
        description: "Failed to load emergency requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('emergency_requests')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Emergency request status changed to ${newStatus}`,
      });

      loadRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update request status",
        variant: "destructive",
      });
    }
  };

  const assignRescueTeam = async (requestId: string) => {
    try {
      // Call the auto-assign function
      const { data, error } = await supabase.rpc('auto_assign_rescue_team', {
        emergency_id: requestId
      });

      if (error) throw error;

      if (data) {
        toast({
          title: "Team Assigned",
          description: "Rescue team has been automatically assigned",
        });
        loadRequests();
      } else {
        toast({
          title: "No Teams Available",
          description: "No available rescue teams found nearby",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error assigning team:', error);
      toast({
        title: "Error",
        description: "Failed to assign rescue team",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-blue-100 text-blue-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'critical': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-red-100 text-red-700';
      case 'assigned': return 'bg-yellow-100 text-yellow-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading emergency requests...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Emergency Requests
          </CardTitle>
          <CardDescription>
            Manage and respond to emergency requests from users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{request.emergency_type}</h3>
                      <Badge className={getPriorityColor(request.priority)}>
                        {request.priority}
                      </Badge>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {request.user_profile?.full_name || 'Unknown User'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(request.created_at).toLocaleString()}
                      </div>
                      {request.latitude && request.longitude && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {request.latitude.toFixed(4)}, {request.longitude.toFixed(4)}
                        </div>
                      )}
                    </div>

                    {request.description && (
                      <p className="text-gray-700">{request.description}</p>
                    )}

                    {request.missions.length > 0 && (
                      <div className="mt-3">
                        <h4 className="font-medium mb-2">Assigned Teams:</h4>
                        <div className="space-y-1">
                          {request.missions.map((mission) => (
                            <div key={mission.id} className="flex items-center gap-2 text-sm">
                              <Badge variant="outline">
                                {mission.rescue_teams?.team_name || 'Unknown Team'}
                              </Badge>
                              <span className="text-gray-600">- {mission.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {request.status === 'pending' && (
                      <Button
                        onClick={() => assignRescueTeam(request.id)}
                        size="sm"
                        className="w-full"
                      >
                        Assign Team
                      </Button>
                    )}
                    
                    <div className="flex flex-col gap-1">
                      {request.status !== 'assigned' && request.status !== 'pending' && (
                        <Button
                          onClick={() => updateRequestStatus(request.id, 'assigned')}
                          variant="outline"
                          size="sm"
                        >
                          Mark Assigned
                        </Button>
                      )}
                      
                      {request.status !== 'in_progress' && (
                        <Button
                          onClick={() => updateRequestStatus(request.id, 'in_progress')}
                          variant="outline"
                          size="sm"
                        >
                          In Progress
                        </Button>
                      )}
                      
                      {request.status !== 'completed' && (
                        <Button
                          onClick={() => updateRequestStatus(request.id, 'completed')}
                          variant="outline"
                          size="sm"
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {requests.length === 0 && (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No emergency requests</h3>
              <p className="text-gray-500">
                There are currently no emergency requests in the system.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

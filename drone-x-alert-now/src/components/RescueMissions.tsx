
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Clock, MapPin, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RescueMission {
  id: string;
  emergency_request_id: string;
  rescue_team_id: string;
  assigned_by?: string;
  status: string;
  priority: string;
  estimated_arrival?: string;
  actual_arrival?: string;
  completion_time?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  emergency_request: {
    emergency_type: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    user_profile: { full_name: string } | null;
  };
}

interface RescueMissionsProps {
  teamId?: string;
}

export const RescueMissions = ({ teamId }: RescueMissionsProps) => {
  const [missions, setMissions] = useState<RescueMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingMission, setUpdatingMission] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current user's rescue team
      let currentTeamId = teamId;
      
      if (!currentTeamId) {
        const { data: rescueTeam } = await supabase
          .from('rescue_teams')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (!rescueTeam) return;
        currentTeamId = rescueTeam.id;
      }

      const { data, error } = await supabase
        .from('rescue_missions')
        .select(`
          *
        `)
        .eq('rescue_team_id', currentTeamId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch emergency request details separately
      const missionsWithDetails = await Promise.all(
        (data || []).map(async (mission) => {
          const { data: emergencyData } = await supabase
            .from('emergency_requests')
            .select(`
              emergency_type,
              description,
              latitude,
              longitude,
              user_id
            `)
            .eq('id', mission.emergency_request_id)
            .single();

          let userProfile = null;
          if (emergencyData?.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', emergencyData.user_id)
              .single();
            userProfile = profile;
          }

          return {
            ...mission,
            emergency_request: {
              ...emergencyData,
              user_profile: userProfile
            }
          };
        })
      );

      setMissions(missionsWithDetails);
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMissionStatus = async (missionId: string, newStatus: string) => {
    setUpdatingMission(missionId);
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Add timestamps based on status
      if (newStatus === 'in_progress' && !missions.find(m => m.id === missionId)?.actual_arrival) {
        updateData.actual_arrival = new Date().toISOString();
      }
      if (newStatus === 'completed') {
        updateData.completion_time = new Date().toISOString();
      }

      // Add notes if provided
      if (notes[missionId]) {
        updateData.notes = notes[missionId];
      }

      const { error } = await supabase
        .from('rescue_missions')
        .update(updateData)
        .eq('id', missionId);

      if (error) throw error;

      // Update rescue team status if mission completed
      if (newStatus === 'completed') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('rescue_teams')
            .update({ status: 'available' })
            .eq('user_id', user.id);
        }
      }

      toast({
        title: "Mission Updated",
        description: `Mission status changed to ${newStatus}`,
      });

      loadMissions();
      setNotes(prev => ({ ...prev, [missionId]: '' }));
    } catch (error) {
      console.error('Error updating mission:', error);
      toast({
        title: "Error",
        description: "Failed to update mission status",
        variant: "destructive",
      });
    } finally {
      setUpdatingMission(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-yellow-100 text-yellow-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
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

  if (loading) {
    return <div className="text-center py-8">Loading missions...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-blue-500" />
            My Rescue Missions
          </CardTitle>
          <CardDescription>
            Track and update your assigned rescue missions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {missions.map((mission) => (
              <div key={mission.id} className="border rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">
                        {mission.emergency_request?.emergency_type || 'Emergency'}
                      </h3>
                      <Badge className={getPriorityColor(mission.priority)}>
                        {mission.priority}
                      </Badge>
                      <Badge className={getStatusColor(mission.status)}>
                        {mission.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Reporter: {mission.emergency_request?.user_profile?.full_name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Assigned: {new Date(mission.created_at).toLocaleString()}</span>
                      </div>
                      {mission.emergency_request?.latitude && mission.emergency_request?.longitude && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {mission.emergency_request.latitude.toFixed(4)}, {mission.emergency_request.longitude.toFixed(4)}
                          </span>
                        </div>
                      )}
                      {mission.estimated_arrival && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>ETA: {new Date(mission.estimated_arrival).toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    {mission.emergency_request?.description && (
                      <div>
                        <h4 className="font-medium mb-1">Description:</h4>
                        <p className="text-gray-700">{mission.emergency_request.description}</p>
                      </div>
                    )}

                    {mission.notes && (
                      <div>
                        <h4 className="font-medium mb-1">Notes:</h4>
                        <p className="text-gray-700">{mission.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 min-w-[200px]">
                    {mission.status !== 'completed' && mission.status !== 'cancelled' && (
                      <>
                        <Textarea
                          placeholder="Add notes about this mission..."
                          value={notes[mission.id] || ''}
                          onChange={(e) => setNotes(prev => ({ ...prev, [mission.id]: e.target.value }))}
                          className="w-full"
                        />
                        
                        <div className="space-y-2">
                          {mission.status === 'assigned' && (
                            <Button
                              onClick={() => updateMissionStatus(mission.id, 'in_progress')}
                              disabled={updatingMission === mission.id}
                              className="w-full"
                            >
                              Start Mission
                            </Button>
                          )}
                          
                          {mission.status === 'in_progress' && (
                            <Button
                              onClick={() => updateMissionStatus(mission.id, 'completed')}
                              disabled={updatingMission === mission.id}
                              className="w-full"
                            >
                              Complete Mission
                            </Button>
                          )}
                        </div>
                      </>
                    )}

                    {(mission.status === 'completed' || mission.status === 'cancelled') && (
                      <div className="text-center py-4">
                        <Badge className={getStatusColor(mission.status)} variant="outline">
                          Mission {mission.status}
                        </Badge>
                        {mission.completion_time && (
                          <p className="text-xs text-gray-500 mt-2">
                            Completed: {new Date(mission.completion_time).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {missions.length === 0 && (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No missions assigned</h3>
              <p className="text-gray-500">
                You don't have any rescue missions assigned at the moment.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

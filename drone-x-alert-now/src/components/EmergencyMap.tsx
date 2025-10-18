
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EmergencyLocation {
  id: string;
  emergency_type: string;
  latitude?: number;
  longitude?: number;
  status: string;
  priority: string;
  created_at: string;
  user_profile: { full_name: string } | null;
}

interface EmergencyMapProps {
  teamLocation?: {
    current_latitude?: number;
    current_longitude?: number;
  };
}

export const EmergencyMap = ({ teamLocation }: EmergencyMapProps) => {
  const [emergencies, setEmergencies] = useState<EmergencyLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmergencies();
  }, []);

  const loadEmergencies = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_requests')
        .select(`
          id,
          emergency_type,
          latitude,
          longitude,
          status,
          priority,
          created_at,
          user_id
        `)
        .in('status', ['pending', 'assigned', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const emergenciesWithProfiles = await Promise.all(
        (data || []).map(async (emergency) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', emergency.user_id)
            .single();

          return {
            ...emergency,
            user_profile: profile
          };
        })
      );

      setEmergencies(emergenciesWithProfiles);
    } catch (error) {
      console.error('Error loading emergencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance.toFixed(2);
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
    return <div className="text-center py-8">Loading emergency map...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-sky-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-sky-500" />
            Emergency Locations
          </CardTitle>
          <CardDescription>
            Active emergencies in your area with distances from your location
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamLocation?.current_latitude && teamLocation?.current_longitude && (
            <div className="bg-green-50 p-3 rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Your Location</span>
              </div>
              <p className="text-sm text-green-700 font-mono">
                {teamLocation.current_latitude.toFixed(6)}, {teamLocation.current_longitude.toFixed(6)}
              </p>
            </div>
          )}

          <div className="space-y-4">
            {emergencies.map((emergency) => (
              <div key={emergency.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      {emergency.emergency_type}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Reported by {emergency.user_profile?.full_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(emergency.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge className={getPriorityColor(emergency.priority)}>
                    {emergency.priority}
                  </Badge>
                </div>

                {emergency.latitude && emergency.longitude && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-3 w-3" />
                      <span className="font-mono">
                        {emergency.latitude.toFixed(6)}, {emergency.longitude.toFixed(6)}
                      </span>
                    </div>
                    
                    {teamLocation?.current_latitude && teamLocation?.current_longitude && (
                      <div className="text-sm">
                        <span className="text-gray-600">Distance: </span>
                        <span className="font-semibold text-blue-600">
                          {calculateDistance(
                            teamLocation.current_latitude,
                            teamLocation.current_longitude,
                            emergency.latitude,
                            emergency.longitude
                          )} km
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {emergencies.length === 0 && (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No active emergencies</h3>
              <p className="text-gray-500">
                There are currently no active emergencies in the system.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

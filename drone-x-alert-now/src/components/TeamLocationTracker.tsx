
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TeamLocationTrackerProps {
  teamId: string;
}

const TeamLocationTracker = ({ teamId }: TeamLocationTrackerProps) => {
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [tracking, setTracking] = useState(false);
  const { toast } = useToast();

  const getCurrentLocation = () => {
    setLoading(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(position);
          updateTeamLocation(position.coords.latitude, position.coords.longitude);
          setLoading(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Location Error",
            description: "Unable to get your current location.",
            variant: "destructive",
          });
          setLoading(false);
        }
      );
    } else {
      toast({
        title: "Geolocation Error",
        description: "Geolocation is not supported by this browser.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const updateTeamLocation = async (latitude: number, longitude: number) => {
    if (!teamId) return;

    try {
      const { error } = await supabase
        .from('rescue_teams')
        .update({
          current_latitude: latitude,
          current_longitude: longitude,
          updated_at: new Date().toISOString()
        })
        .eq('id', teamId);

      if (error) throw error;

      toast({
        title: "Location Updated",
        description: "Your team location has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating location:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update team location.",
        variant: "destructive",
      });
    }
  };

  const startTracking = () => {
    setTracking(true);
    getCurrentLocation();
    
    // Update location every 30 seconds while tracking
    const interval = setInterval(() => {
      getCurrentLocation();
    }, 30000);

    return () => clearInterval(interval);
  };

  const stopTracking = () => {
    setTracking(false);
    toast({
      title: "Tracking Stopped",
      description: "Location tracking has been disabled.",
    });
  };

  return (
    <Card className="border-sky-100">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="h-5 w-5 text-sky-500" />
          <span>Location Tracker</span>
        </CardTitle>
        <CardDescription>
          Track and share your team's current location for emergency response
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-4">
          <Badge className={`${tracking ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
            <Navigation className="h-3 w-3 mr-1" />
            {tracking ? 'Active' : 'Inactive'}
          </Badge>
          
          {location && (
            <Badge className="bg-blue-100 text-blue-700">
              <Clock className="h-3 w-3 mr-1" />
              {new Date(location.timestamp).toLocaleTimeString()}
            </Badge>
          )}
        </div>

        {location && (
          <div className="space-y-2">
            <h4 className="font-medium">Current Location</h4>
            <div className="bg-gray-50 p-3 rounded-lg space-y-1">
              <p className="text-sm">
                <strong>Latitude:</strong> {location.coords.latitude.toFixed(6)}
              </p>
              <p className="text-sm">
                <strong>Longitude:</strong> {location.coords.longitude.toFixed(6)}
              </p>
              <p className="text-sm">
                <strong>Accuracy:</strong> ±{Math.round(location.coords.accuracy)}m
              </p>
            </div>
          </div>
        )}

        <div className="flex space-x-3">
          {!tracking ? (
            <>
              <Button 
                onClick={startTracking}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600"
              >
                <Navigation className="h-4 w-4 mr-2" />
                {loading ? 'Getting Location...' : 'Start Tracking'}
              </Button>
              <Button 
                onClick={getCurrentLocation}
                disabled={loading}
                variant="outline"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Get Current Location
              </Button>
            </>
          ) : (
            <Button 
              onClick={stopTracking}
              variant="destructive"
            >
              <Users className="h-4 w-4 mr-2" />
              Stop Tracking
            </Button>
          )}
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Location is shared with emergency coordinators</p>
          <p>• Tracking updates every 30 seconds when active</p>
          <p>• Your location helps assign nearest rescue teams</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamLocationTracker;

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  Navigation, 
  Crosshair, 
  Share2, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Satellite
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
  address?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface LocationServiceProps {
  onLocationUpdate?: (location: LocationData) => void;
  onLocationShare?: (location: LocationData) => void;
  autoUpdate?: boolean;
  highAccuracy?: boolean;
}

export const EnhancedLocationService: React.FC<LocationServiceProps> = ({
  onLocationUpdate,
  onLocationShare,
  autoUpdate = false,
  highAccuracy = true
}) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationData[]>([]);
  const { toast } = useToast();

  // Enhanced geolocation options
  const geoOptions: PositionOptions = {
    enableHighAccuracy: highAccuracy,
    timeout: 15000,
    maximumAge: 30000 // Cache location for 30 seconds
  };

  // Reverse geocoding to get address from coordinates
  const reverseGeocode = async (lat: number, lng: number): Promise<Partial<LocationData>> => {
    try {
      // Using a free geocoding service (you can replace with your preferred service)
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      
      if (response.ok) {
        const data = await response.json();
        return {
          address: data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          area: data.locality || data.principalSubdivision,
          city: data.city || data.locality,
          state: data.principalSubdivision,
          country: data.countryName
        };
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    }
    
    return {
      address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    };
  };

  // Process position data
  const processPosition = async (position: GeolocationPosition): Promise<LocationData> => {
    const { coords, timestamp } = position;
    
    // Get address information
    const addressData = await reverseGeocode(coords.latitude, coords.longitude);
    
    const locationData: LocationData = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      altitude: coords.altitude || undefined,
      heading: coords.heading || undefined,
      speed: coords.speed || undefined,
      timestamp,
      ...addressData
    };

    return locationData;
  };

  // Get current location
  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      toast({
        title: "Location Error",
        description: "Geolocation is not supported by this browser",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, geoOptions);
      });

      const locationData = await processPosition(position);
      
      setLocation(locationData);
      setLastUpdate(new Date());
      setLocationHistory(prev => [locationData, ...prev.slice(0, 9)]); // Keep last 10 locations
      
      onLocationUpdate?.(locationData);
      
      toast({
        title: "Location Updated",
        description: `Accuracy: ${Math.round(locationData.accuracy)}m`,
      });

    } catch (error: any) {
      let errorMessage = 'Failed to get location';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location access denied by user';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location information unavailable';
          break;
        case error.TIMEOUT:
          errorMessage = 'Location request timed out';
          break;
      }
      
      setError(errorMessage);
      toast({
        title: "Location Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [onLocationUpdate, toast]);

  // Start watching location
  const startWatching = useCallback(() => {
    if (!navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const locationData = await processPosition(position);
        setLocation(locationData);
        setLastUpdate(new Date());
        setLocationHistory(prev => [locationData, ...prev.slice(0, 9)]);
        onLocationUpdate?.(locationData);
      },
      (error) => {
        console.error('Watch position error:', error);
      },
      {
        ...geoOptions,
        maximumAge: 10000 // Update every 10 seconds when watching
      }
    );

    setWatchId(id);
    toast({
      title: "Location Tracking Started",
      description: "Continuously monitoring your location",
    });
  }, [onLocationUpdate, toast]);

  // Stop watching location
  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      toast({
        title: "Location Tracking Stopped",
        description: "No longer monitoring location changes",
      });
    }
  }, [watchId, toast]);

  // Share location
  const shareLocation = async () => {
    if (!location) {
      toast({
        title: "No Location",
        description: "Please get your location first",
        variant: "destructive",
      });
      return;
    }

    const locationMessage = `🚨 EMERGENCY LOCATION ALERT 🚨

📍 **Current Location:**
${location.address || 'Address unavailable'}

🎯 **Coordinates:**
Latitude: ${location.latitude.toFixed(6)}
Longitude: ${location.longitude.toFixed(6)}
Accuracy: ±${Math.round(location.accuracy)}m

🕒 **Timestamp:** ${new Date(location.timestamp).toLocaleString()}

🗺️ **Google Maps:** https://maps.google.com/?q=${location.latitude},${location.longitude}

⚠️ **This is an emergency location share. Please respond immediately!**`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: '🚨 Emergency Location Alert',
          text: locationMessage,
          url: `https://maps.google.com/?q=${location.latitude},${location.longitude}`
        });
      } else {
        await navigator.clipboard.writeText(locationMessage);
        toast({
          title: "Location Copied",
          description: "Emergency location details copied to clipboard",
        });
      }
      
      onLocationShare?.(location);
    } catch (error) {
      console.error('Error sharing location:', error);
      toast({
        title: "Share Failed",
        description: "Failed to share location. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Auto-update effect
  useEffect(() => {
    if (autoUpdate) {
      getCurrentLocation();
      const interval = setInterval(getCurrentLocation, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [autoUpdate, getCurrentLocation]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy <= 10) return 'text-green-600';
    if (accuracy <= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAccuracyStatus = (accuracy: number) => {
    if (accuracy <= 10) return 'Excellent';
    if (accuracy <= 50) return 'Good';
    if (accuracy <= 100) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="space-y-4">
      {/* Main Location Card */}
      <Card className="border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Satellite className="h-5 w-5 mr-2 text-blue-500" />
            Enhanced Location Services
          </CardTitle>
          <CardDescription>
            High-precision GPS tracking for emergency situations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location Status */}
          {location && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Location Status</span>
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Coordinates:</span>
                  <p className="font-mono">{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Accuracy:</span>
                  <p className={`font-medium ${getAccuracyColor(location.accuracy)}`}>
                    ±{Math.round(location.accuracy)}m ({getAccuracyStatus(location.accuracy)})
                  </p>
                </div>
              </div>

              {location.address && (
                <div>
                  <span className="text-gray-500 text-sm">Address:</span>
                  <p className="text-sm">{location.address}</p>
                </div>
              )}

              {lastUpdate && (
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Control Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={getCurrentLocation}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Crosshair className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Getting Location...' : 'Get Location'}
            </Button>

            {location && (
              <Button
                onClick={shareLocation}
                className="bg-red-500 hover:bg-red-600"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Emergency Location
              </Button>
            )}

            {watchId === null ? (
              <Button
                onClick={startWatching}
                variant="outline"
                className="border-green-500 text-green-600 hover:bg-green-50"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Start Tracking
              </Button>
            ) : (
              <Button
                onClick={stopWatching}
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Stop Tracking
              </Button>
            )}
          </div>

          {/* Additional Location Info */}
          {location && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Additional Information</h4>
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                {location.altitude && (
                  <div>
                    <span>Altitude:</span>
                    <span className="ml-1 font-mono">{Math.round(location.altitude)}m</span>
                  </div>
                )}
                {location.speed && (
                  <div>
                    <span>Speed:</span>
                    <span className="ml-1 font-mono">{Math.round(location.speed * 3.6)} km/h</span>
                  </div>
                )}
                {location.heading && (
                  <div>
                    <span>Heading:</span>
                    <span className="ml-1 font-mono">{Math.round(location.heading)}°</span>
                  </div>
                )}
                <div>
                  <span>Timestamp:</span>
                  <span className="ml-1 font-mono">{new Date(location.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location History */}
      {locationHistory.length > 0 && (
        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-sm">Location History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {locationHistory.slice(0, 5).map((loc, index) => (
                <div key={index} className="flex justify-between items-center text-xs">
                  <span className="font-mono">
                    {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                  </span>
                  <span className="text-gray-500">
                    {new Date(loc.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
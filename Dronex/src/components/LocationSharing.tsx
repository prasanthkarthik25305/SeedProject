import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Users, Clock, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship?: string;
  location_sharing_enabled: boolean;
  location_sharing_duration: number;
}

interface LocationSharingProps {
  contacts: EmergencyContact[];
  onContactUpdate: () => void;
}

export const LocationSharing: React.FC<LocationSharingProps> = ({
  contacts,
  onContactUpdate
}) => {
  const [isSharing, setIsSharing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const { toast } = useToast();

  // Get current location
  const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  };

  // Start location sharing
  const startLocationSharing = async () => {
    try {
      const location = await getCurrentLocation();
      setCurrentLocation(location);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Share location with enabled contacts
      const enabledContacts = contacts.filter(contact => contact.location_sharing_enabled);
      
      for (const contact of enabledContacts) {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + contact.location_sharing_duration);

        await supabase
          .from('shared_locations')
          .upsert({
            user_id: user.id,
            shared_with: contact.id, // In a real app, this would be the contact's user_id
            latitude: location.lat,
            longitude: location.lng,
            expires_at: expiresAt.toISOString(),
            is_active: true
          });
      }

      // Start watching position for continuous updates
      const id = navigator.geolocation.watchPosition(
        async (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          setCurrentLocation(newLocation);
          
          // Update shared locations
          for (const contact of enabledContacts) {
            await supabase
              .from('shared_locations')
              .update({
                latitude: newLocation.lat,
                longitude: newLocation.lng,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id)
              .eq('shared_with', contact.id);
          }
        },
        (error) => console.error('Location watch error:', error),
        {
          enableHighAccuracy: true,
          maximumAge: 30000 // 30 seconds
        }
      );

      setWatchId(id);
      setIsSharing(true);

      toast({
        title: "Location sharing started",
        description: `Sharing with ${enabledContacts.length} contacts`,
      });

    } catch (error) {
      console.error('Error starting location sharing:', error);
      toast({
        title: "Error",
        description: "Failed to start location sharing",
        variant: "destructive",
      });
    }
  };

  // Stop location sharing
  const stopLocationSharing = async () => {
    try {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Deactivate all shared locations
      await supabase
        .from('shared_locations')
        .update({ is_active: false })
        .eq('user_id', user.id);

      setIsSharing(false);
      setCurrentLocation(null);

      toast({
        title: "Location sharing stopped",
        description: "Your location is no longer being shared",
      });

    } catch (error) {
      console.error('Error stopping location sharing:', error);
      toast({
        title: "Error",
        description: "Failed to stop location sharing",
        variant: "destructive",
      });
    }
  };

  // Update contact location sharing settings
  const updateContactSetting = async (contactId: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .update({ [field]: value })
        .eq('id', contactId);

      if (error) throw error;

      onContactUpdate();

      toast({
        title: "Settings updated",
        description: "Contact location sharing preferences saved",
      });

    } catch (error) {
      console.error('Error updating contact:', error);
      toast({
        title: "Error",
        description: "Failed to update contact settings",
        variant: "destructive",
      });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const enabledContactsCount = contacts.filter(contact => contact.location_sharing_enabled).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="w-5 h-5" />
          Location Sharing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isSharing ? 'bg-green-500' : 'bg-gray-400'}`} />
            <div>
              <p className="font-medium">
                {isSharing ? 'Sharing Location' : 'Location Sharing Off'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isSharing 
                  ? `With ${enabledContactsCount} contacts`
                  : `${enabledContactsCount} contacts enabled`
                }
              </p>
            </div>
          </div>
          
          <Button
            onClick={isSharing ? stopLocationSharing : startLocationSharing}
            disabled={enabledContactsCount === 0 && !isSharing}
            variant={isSharing ? "destructive" : "default"}
          >
            {isSharing ? 'Stop Sharing' : 'Start Sharing'}
          </Button>
        </div>

        {/* Current Location */}
        {currentLocation && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>
              {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
            </span>
          </div>
        )}

        {/* Contact Settings */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            Contact Settings
          </h4>
          
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No emergency contacts added yet. Add contacts to enable location sharing.
            </p>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">{contact.relationship}</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <Select
                        value={contact.location_sharing_duration.toString()}
                        onValueChange={(value) => 
                          updateContactSetting(contact.id, 'location_sharing_duration', parseInt(value))
                        }
                        disabled={!contact.location_sharing_enabled}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15m</SelectItem>
                          <SelectItem value="30">30m</SelectItem>
                          <SelectItem value="60">1h</SelectItem>
                          <SelectItem value="120">2h</SelectItem>
                          <SelectItem value="360">6h</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Switch
                      checked={contact.location_sharing_enabled}
                      onCheckedChange={(checked) =>
                        updateContactSetting(contact.id, 'location_sharing_enabled', checked)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Location sharing automatically stops after the set duration</p>
          <p>• Your contacts will see your real-time location on the map</p>
          <p>• You can stop sharing at any time</p>
        </div>
      </CardContent>
    </Card>
  );
};
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  MapPin, 
  Clock, 
  User, 
  CheckCircle,
  Activity,
  Zap
} from 'lucide-react';
import { emergencyService } from '@/services/emergencyService';
import type { EmergencyAlert } from '@/services/emergencyService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const EmergencyAlertsList = () => {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Initial load
    fetchAlerts();

    // Subscribe to real-time emergency updates from Supabase (cross-browser sync)
    const emergencyChannel = supabase
      .channel('emergency_alerts_list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_alerts'
        },
        (payload: any) => {
          console.log('🔄 EmergencyAlertsList received real-time update:', payload);
          console.log('📊 Event type:', payload.eventType);
          console.log('📊 New record status:', payload.new && (payload.new as any).status);
          fetchAlerts();
        }
      )
      .subscribe((status) => {
        console.log('🔔 EmergencyAlertsList subscription status:', status);
      });

    // Subscribe to broadcast channel for manual resolution sync
    const broadcastChannel = supabase
      .channel('emergency_resolution_broadcast')
      .on('broadcast', { event: 'emergency_resolved' }, (payload: any) => {
        console.log('📢 Received resolution broadcast:', payload);
        fetchAlerts();
      })
      .subscribe();

    // Also listen for localStorage changes (cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'emergency_resolved') {
        console.log('🔄 Storage change detected, refreshing alerts');
        fetchAlerts();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events (same-tab sync)
    const handleCustomEvent = () => {
      console.log('🔄 Custom event detected, refreshing alerts');
      fetchAlerts();
    };
    window.addEventListener('emergency_resolved', handleCustomEvent);

    return () => {
      supabase.removeChannel(emergencyChannel);
      supabase.removeChannel(broadcastChannel);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('emergency_resolved', handleCustomEvent);
    };
  }, []);

  const fetchAlerts = async () => {
    console.log('🔄 EmergencyAlertsList.fetchAlerts called');
    try {
      const activeAlerts = await emergencyService.getAllActiveEmergencies();
      console.log('📊 EmergencyAlertsList received alerts:', activeAlerts.length);
      setAlerts(activeAlerts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setLoading(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    console.log('🎯 handleResolveAlert called with ID:', alertId);
    console.log('📋 Current alerts:', alerts.map(a => a.id));
    
    try {
      // Immediately remove from UI for instant feedback
      console.log('🗑️ Removing alert from UI immediately');
      setAlerts(prev => {
        const filtered = prev.filter(a => a.id !== alertId);
        console.log('📊 Filtered alerts:', filtered.length, 'from', prev.length);
        return filtered;
      });
      
      console.log('📤 Calling emergencyService.resolveEmergency...');
      await emergencyService.resolveEmergency(
        alertId, 
        'admin', 
        'Manually resolved by admin in panel'
      );
      console.log('✅ resolveEmergency completed');

      toast({
        title: "✅ Emergency Resolved",
        description: "Emergency alert has been successfully resolved.",
      });

      // Wait and refresh to sync with database
      setTimeout(() => {
        console.log('🔄 Refreshing alerts after resolution...');
        fetchAlerts();
      }, 1000);
    } catch (error) {
      console.error('❌ Error resolving alert:', error);
      toast({
        title: "Resolution Error",
        description: "Failed to resolve emergency alert.",
        variant: "destructive",
      });
      // Re-fetch to restore the alert if resolution failed
      fetchAlerts();
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'acknowledged': return 'bg-purple-100 text-purple-800';
      case 'responding': return 'bg-orange-100 text-orange-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Activity className="h-6 w-6 animate-spin text-sky-500 mr-2" />
        <span className="text-gray-600">Loading emergency alerts...</span>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>No Active Emergencies</AlertTitle>
        <AlertDescription>
          There are currently no active emergency alerts in the system.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {alerts.map((alert) => (
        <Card key={alert.id} className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Emergency Alert
                  </h3>
                  <Badge className={getUrgencyColor(alert.urgency_level)}>
                    {alert.urgency_level.toUpperCase()}
                  </Badge>
                  <Badge className={getStatusColor(alert.status)}>
                    {alert.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                
                <p className="text-gray-700 mb-3">{alert.message}</p>
                
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>Lat: {alert.location.lat.toFixed(4)}, Lng: {alert.location.lng.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(alert.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>User ID: {alert.user_id.slice(0, 8)}...</span>
                  </div>
                </div>

                {alert.safe_zones && alert.safe_zones.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">
                      📍 Nearby Safe Zones ({alert.safe_zones.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {alert.safe_zones.slice(0, 3).map((zone) => (
                        <div key={zone.id} className="text-xs bg-white p-2 rounded border border-blue-200">
                          <div className="font-medium text-blue-800">{zone.name}</div>
                          <div className="text-blue-600">
                            {zone.distance_km?.toFixed(1)} km • {zone.type}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {alert.recipients && alert.recipients.length > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-lg">
                    <h4 className="text-sm font-medium text-amber-900 mb-2">
                      📢 Notifications Sent ({alert.recipients.length})
                    </h4>
                    <div className="text-xs text-amber-700">
                      Alerts sent to neighbors and administrators
                    </div>
                  </div>
                )}
              </div>
            </div>

            {alert.status !== 'resolved' && (
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={() => handleResolveAlert(alert.id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Resolved
                </Button>
                <Button variant="outline">
                  <Zap className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </div>
            )}

            {alert.resolved_by && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 text-sm text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <span>
                    Resolved by {alert.resolved_by} at {formatTime(alert.resolved_at!)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default EmergencyAlertsList;

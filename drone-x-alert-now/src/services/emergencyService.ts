import { supabase } from '@/integrations/supabase/client';
import type { Database, LocationData } from '@/types/database';
import { mockEmergencyStorage } from './mockEmergencyStorage';

export interface HazardDetection {
  id: string;
  user_id: string;
  location: LocationData;
  hazard_type: 'fire' | 'flood' | 'earthquake' | 'accident' | 'violence' | 'medical' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  detection_source: 'ai_voice' | 'ai_video' | 'user_report' | 'location_analysis';
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmergencyAlert {
  id: string;
  hazard_id: string;
  user_id: string;
  alert_type: 'neighbor_alert' | 'admin_alert' | 'rescue_request';
  status: 'pending' | 'sent' | 'acknowledged' | 'responding' | 'resolved';
  message: string;
  recipients: string[];
  location: LocationData;
  safe_zones?: SafeZone[];
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  triggered_by: 'automatic' | 'manual';
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SafeZone {
  id: string;
  name: string;
  location: LocationData;
  type: 'shelter' | 'hospital' | 'police' | 'fire_station' | 'community_center';
  capacity: number;
  current_occupancy: number;
  is_available: boolean;
  facilities: string[];
  distance_km?: number;
  estimated_travel_time?: number;
}

export interface RescueMission {
  id: string;
  alert_id: string;
  user_id: string;
  rescue_team_id: string;
  status: 'dispatched' | 'en_route' | 'on_scene' | 'assisting' | 'completed' | 'cancelled';
  assigned_at: string;
  arrived_at?: string;
  completed_at?: string;
  team_members: string[];
  equipment: string[];
  notes: string;
}

class EmergencyService {
  // Detect hazard at location
  async detectHazard(userId: string, location: LocationData, hazardData: {
    type: HazardDetection['hazard_type'];
    severity: HazardDetection['severity'];
    source: HazardDetection['detection_source'];
    description: string;
    confidence: number;
  }): Promise<HazardDetection> {
    try {
      const hazard: Partial<HazardDetection> = {
        user_id: userId,
        location,
        hazard_type: hazardData.type,
        severity: hazardData.severity,
        detection_source: hazardData.source,
        description: hazardData.description,
        confidence: hazardData.confidence,
        is_active: true,
      };

      const { data, error } = await supabase
        .from('hazard_detections')
        .insert(hazard)
        .select()
        .single();

      if (error) {
        console.warn('Database error in detectHazard, using mock:', error);
        // Return mock data for demo purposes
        return {
          id: `hazard_${Date.now()}`,
          user_id: userId,
          location,
          hazard_type: hazardData.type,
          severity: hazardData.severity,
          detection_source: hazardData.source,
          description: hazardData.description,
          confidence: hazardData.confidence,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      return data;
    } catch (error) {
      console.error('Error in detectHazard:', error);
      throw error;
    }
  }

  // Get nearby safe zones
  async getNearbySafeZones(location: LocationData, radiusKm: number = 10): Promise<SafeZone[]> {
    // Mock safe zones data (in production, this would come from database or API)
    const mockSafeZones: SafeZone[] = [
      {
        id: '1',
        name: 'Central Community Shelter',
        location: { lat: location.lat + 0.01, lng: location.lng + 0.01 },
        type: 'shelter',
        capacity: 200,
        current_occupancy: 45,
        is_available: true,
        facilities: ['first_aid', 'food', 'water', 'communication'],
      },
      {
        id: '2',
        name: 'City General Hospital',
        location: { lat: location.lat - 0.005, lng: location.lng + 0.008 },
        type: 'hospital',
        capacity: 500,
        current_occupancy: 320,
        is_available: true,
        facilities: ['medical_care', 'emergency_room', 'surgery'],
      },
      {
        id: '3',
        name: 'Main Police Station',
        location: { lat: location.lat + 0.008, lng: location.lng - 0.005 },
        type: 'police',
        capacity: 50,
        current_occupancy: 15,
        is_available: true,
        facilities: ['security', 'communication', 'holding_cells'],
      },
    ];

    // Calculate distances and filter by radius
    return mockSafeZones.map(zone => ({
      ...zone,
      distance_km: this.calculateDistance(location.lat, location.lng, zone.location.lat, zone.location.lng),
      estimated_travel_time: this.calculateEstimatedTravelTime(location, zone.location),
    })).filter(zone => (zone.distance_km || 0) <= radiusKm)
      .sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
  }

  // Calculate distance between two coordinates (Haversine formula)
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Calculate estimated travel time (simple calculation)
  private calculateEstimatedTravelTime(loc1: LocationData, loc2: LocationData): number {
    const distance = this.calculateDistance(loc1.lat, loc1.lng, loc2.lat, loc2.lng);
    // Assume average speed of 40 km/h for emergency vehicles
    return Math.ceil((distance / 40) * 60); // Return time in minutes
  }

  // Create emergency alert
  async createEmergencyAlert(hazardId: string, userId: string, alertData: {
    alertType: EmergencyAlert['alert_type'];
    message: string;
    urgencyLevel: EmergencyAlert['urgency_level'];
    triggeredBy: EmergencyAlert['triggered_by'];
  }): Promise<EmergencyAlert> {
    try {
      // Get nearby safe zones
      const safeZones = await this.getNearbySafeZones({ lat: 40.7128, lng: -74.0060 });

      // Get recipients based on alert type
      let recipients: string[] = [];
      if (alertData.alertType === 'neighbor_alert') {
        // Get verified emergency contacts + nearby online users
        const verifiedContacts = await this.getVerifiedEmergencyContacts(userId);
        const nearbyUsers = await this.getNearbyOnlineUsers({ lat: 40.7128, lng: -74.0060 }, 5, userId);
        recipients = [...verifiedContacts.map(c => c.contact_user_id), ...nearbyUsers];
        // Remove duplicates
        recipients = [...new Set(recipients)];
      } else if (alertData.alertType === 'admin_alert') {
        recipients = await this.getAdminUsers();
      }

      const alert: Partial<EmergencyAlert> = {
        hazard_id: hazardId.startsWith('hazard_') ? undefined : hazardId, // Skip mock hazard IDs
        user_id: userId,
        alert_type: alertData.alertType,
        status: 'pending',
        message: alertData.message,
        recipients,
        location: { lat: 40.7128, lng: -74.0060 },
        safe_zones: safeZones,
        urgency_level: alertData.urgencyLevel,
        triggered_by: alertData.triggeredBy,
      };

      const { data, error } = await supabase
        .from('emergency_alerts')
        .insert(alert)
        .select()
        .single();

      if (error) {
        console.warn('Database error in createEmergencyAlert, using mock:', error);
        // Return mock alert for demo purposes
        const mockAlert: EmergencyAlert = {
          id: `alert_${Date.now()}`,
          hazard_id: hazardId,
          user_id: userId,
          alert_type: alertData.alertType,
          status: 'pending',
          message: alertData.message,
          recipients,
          location: { lat: 40.7128, lng: -74.0060 },
          safe_zones: safeZones,
          urgency_level: alertData.urgencyLevel,
          triggered_by: alertData.triggeredBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Send notifications asynchronously with all required parameters
        setTimeout(() => this.sendNotifications(mockAlert.id, recipients, alertData.message, userId, { lat: 40.7128, lng: -74.0060 }, alertData.urgencyLevel), 1000);

        // Store in shared mock storage for admin panel sync
        console.log('🚨 Adding alert to mock storage:', mockAlert);
        mockEmergencyStorage.addAlert(mockAlert);

        // Start auto-resolution monitoring for non-critical emergencies
        if (alertData.urgencyLevel !== 'critical') {
          this.startAutoResolutionMonitoring(mockAlert.id);
        }

        return mockAlert;
      }

      // Send notifications asynchronously with all required parameters
      this.sendNotifications(data.id, recipients, alertData.message, userId, { lat: 40.7128, lng: -74.0060 }, alertData.urgencyLevel);

      // Store in shared mock storage for admin panel sync
      console.log('🚨 Adding alert to mock storage (database path):', data);
      mockEmergencyStorage.addAlert(data);

      // Start auto-resolution monitoring for non-critical emergencies
      if (alertData.urgencyLevel !== 'critical') {
        this.startAutoResolutionMonitoring(data.id);
      }

      return data;
    } catch (error) {
      console.error('Error in createEmergencyAlert:', error);
      throw error;
    }
  }

  // Get verified emergency contacts for a user
  private async getVerifiedEmergencyContacts(userId: string): Promise<{ contact_user_id: string; name: string; priority: number }[]> {
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('contact_user_id, name, priority')
        .eq('user_id', userId)
        .eq('verification_status', 'verified')
        .not('contact_user_id', 'is', null)
        .order('priority', { ascending: true });

      if (error) {
        console.warn('Error fetching verified contacts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getVerifiedEmergencyContacts:', error);
      return [];
    }
  }

  // Get online users within radius (for nearby alerts)
  private async getNearbyOnlineUsers(location: LocationData, radiusKm: number, excludeUserId: string): Promise<string[]> {
    try {
      // Get all online users with location sharing enabled
      const { data, error } = await supabase
        .from('user_emergency_profiles')
        .select('user_id, current_location')
        .eq('location_sharing_enabled', true)
        .neq('user_id', excludeUserId);

      if (error || !data) return [];

      // Filter users within radius
      const nearbyUsers = data.filter(user => {
        if (!user.current_location) return false;
        const distance = this.calculateDistance(
          location.lat, location.lng,
          user.current_location.lat, user.current_location.lng
        );
        return distance <= radiusKm;
      });

      return nearbyUsers.map(u => u.user_id);
    } catch (error) {
      console.error('Error in getNearbyOnlineUsers:', error);
      return [];
    }
  }

  // Get all admin users
  private async getAdminUsers(): Promise<string[]> {
    try {
      // Get users with admin role from profiles or separate admin table
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (error || !data) {
        // Fallback: return empty array if no admin table
        console.warn('No admin users found');
        return [];
      }

      return data.map(u => u.id);
    } catch (error) {
      console.error('Error in getAdminUsers:', error);
      return [];
    }
  }

  // Send notifications to recipients via chat system
  private async sendNotifications(
    alertId: string, 
    recipients: string[], 
    baseMessage: string, 
    senderId: string,
    location?: LocationData,
    urgencyLevel: string = 'high'
  ): Promise<void> {
    try {
      console.log(`🚨 Sending emergency alert to ${recipients.length} recipients`);

      // Create personalized message for contacts
      const personalizedMessage = `🚨 EMERGENCY ALERT 🚨

Your contact is in DANGER and needs help!

${baseMessage}

📍 Location: ${location ? `https://maps.google.com/?q=${location.lat},${location.lng}` : 'Location shared'}

Please try to help them if you can, and also STAY SAFE yourself!

This is an automated emergency alert from Drone-X-Alert-Now system.
Alert ID: ${alertId}`;

      // Create admin message (more professional)
      const adminMessage = `🚨 EMERGENCY ALERT

${baseMessage}

Location: ${location ? `${location.lat}, ${location.lng}` : 'Not specified'}
Urgency: ${urgencyLevel.toUpperCase()}
Alert ID: ${alertId}

Immediate response required.`;
      
      // 2. Send direct chat messages to each recipient
      const chatPromises = recipients.map(async (recipientId) => {
        try {
          // Determine if recipient is admin or contact
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', recipientId)
            .single();
          
          const isAdmin = profile?.role === 'admin';
          const message = isAdmin ? adminMessage : personalizedMessage;
          
          // Create emergency chat message
          const { error: msgError } = await supabase
            .from('emergency_chat_messages')
            .insert({
              sender_id: senderId,
              recipient_id: recipientId,
              content: message,
              message_type: 'emergency',
              is_emergency: true,
              emergency_type: 'hazard_alert',
              location_data: location || null,
              status: 'sent'
            });

          if (msgError) {
            console.warn(`Failed to send chat to ${recipientId}:`, msgError);
          } else {
            console.log(`✅ Emergency chat sent to: ${recipientId} (${isAdmin ? 'admin' : 'contact'})`);
          }

          // Create in-app notification
          await this.createInAppNotification(recipientId, message, alertId, urgencyLevel);

        } catch (err) {
          console.error(`Error sending to ${recipientId}:`, err);
        }
      });

      await Promise.all(chatPromises);
      console.log(`✅ All notifications sent for alert: ${alertId}`);

    } catch (error) {
      console.error('Error in sendNotifications:', error);
    }
  }

  // Create in-app notification
  private async createInAppNotification(
    userId: string, 
    message: string, 
    alertId: string,
    urgencyLevel: string
  ): Promise<void> {
    try {
      // You can extend this to insert into a notifications table
      // For now, we'll just log it
      console.log(`🔔 In-app notification for ${userId}: ${message.substring(0, 50)}...`);
      
      // TODO: Insert into your notifications table if you have one
      // const { error } = await supabase
      //   .from('notifications')
      //   .insert({
      //     user_id: userId,
      //     type: 'emergency_alert',
      //     title: '🚨 Emergency Alert',
      //     message: message,
      //     data: { alert_id: alertId },
      //     urgency: urgencyLevel,
      //     read: false
      //   });

    } catch (error) {
      console.error('Error creating in-app notification:', error);
    }
  }

  // Trigger rescue mission
  async triggerRescueMission(alertId: string, rescueTeamId: string): Promise<RescueMission> {
    try {
      const mission: Partial<RescueMission> = {
        alert_id: alertId,
        user_id: 'system',
        rescue_team_id: rescueTeamId,
        status: 'dispatched',
        team_members: ['rescue_team_lead', 'paramedic', 'driver'],
        equipment: ['first_aid_kit', 'stretcher', 'communication_device'],
        notes: 'Emergency rescue mission triggered automatically',
      };

      const { data, error } = await supabase
        .from('rescue_missions')
        .insert(mission)
        .select()
        .single();

      if (error) {
        console.warn('Database error in triggerRescueMission, using mock:', error);
        // Return mock mission for demo purposes
        const mockMission: RescueMission = {
          id: `mission_${Date.now()}`,
          alert_id: alertId,
          user_id: 'system',
          rescue_team_id: rescueTeamId,
          status: 'dispatched',
          assigned_at: new Date().toISOString(),
          team_members: ['rescue_team_lead', 'paramedic', 'driver'],
          equipment: ['first_aid_kit', 'stretcher', 'communication_device'],
          notes: 'Emergency rescue mission triggered automatically',
          arrived_at: undefined,
          completed_at: undefined,
        };

        // Update alert status to responding
        setTimeout(() => this.updateAlertStatus(alertId, 'responding'), 1000);

        return mockMission;
      }

      // Update alert status to responding
      await this.updateAlertStatus(alertId, 'responding');

      return data;
    } catch (error) {
      console.error('Error in triggerRescueMission:', error);
      throw error;
    }
  }

  // Update alert status
  private async updateAlertStatus(alertId: string, status: EmergencyAlert['status']): Promise<void> {
    try {
      const { error } = await supabase
        .from('emergency_alerts')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) {
        console.warn('Error updating alert status:', error);
      }
    } catch (error) {
      console.error('Error in updateAlertStatus:', error);
    }
  }

  // Resolve emergency
  async resolveEmergency(alertId: string, resolvedBy: string, resolutionNotes: string): Promise<void> {
    const now = new Date().toISOString();

    try {
      // Get the actual user ID of the admin resolving the emergency
      const { data: { user } } = await supabase.auth.getUser();
      const adminUserId = user?.id;

      // Update alert status in database FIRST (for cross-browser sync)
      const { error: alertError } = await supabase
        .from('emergency_alerts')
        .update({
          status: 'resolved',
          resolved_by: adminUserId, // Use actual UUID instead of string
          resolved_at: now,
        })
        .eq('id', alertId);

      if (alertError) {
        console.warn('Error updating alert status in database:', alertError);
      }

      // Also update mock storage for same-browser sync
      mockEmergencyStorage.updateAlertStatus(alertId, 'resolved', resolvedBy);

      // Update related rescue mission if exists (optional - don't block if fails)
      try {
        const { error: missionError } = await supabase
          .from('rescue_missions')
          .update({
            status: 'completed',
            updated_at: now,
            completion_time: now,
            notes: resolutionNotes,
          })
          .eq('emergency_request_id', alertId);

        if (missionError) {
          console.warn('Error updating rescue mission (non-critical):', missionError.message);
        }
      } catch (missionErr) {
        console.warn('Rescue mission update failed (non-critical):', missionErr);
      }

      console.log(`Emergency ${alertId} resolved by ${resolvedBy}: ${resolutionNotes}`);
      
      // Broadcast resolution event for cross-component sync
      try {
        const channel = supabase.channel('emergency_resolution_broadcast');
        await channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.send({
              type: 'broadcast',
              event: 'emergency_resolved',
              payload: { alertId, resolvedBy: adminUserId }
            });
          }
        });
      } catch (e) {
        // Non-critical: broadcast is optional
      }
      
      // Also trigger localStorage event for same-tab sync
      localStorage.setItem('emergency_resolved', JSON.stringify({ alertId, resolvedBy: adminUserId, time: Date.now() }));
      
      // Dispatch custom event for same-tab sync
      window.dispatchEvent(new CustomEvent('emergency_resolved', { detail: { alertId, resolvedBy: adminUserId } }));
    } catch (error) {
      console.error('Error in resolveEmergency:', error);
      throw error;
    }
  }

  // Start auto-resolution monitoring for an alert
  startAutoResolutionMonitoring(alertId: string): void {
    const checkInterval = setInterval(async () => {
      const resolved = await this.autoResolveEmergency(alertId);
      if (resolved) {
        clearInterval(checkInterval);
        console.log(`Emergency ${alertId} auto-resolved`);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Clear interval after 2 hours max
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 2 * 60 * 60 * 1000);
  }

  // Auto-resolve emergency based on conditions
  async autoResolveEmergency(alertId: string): Promise<boolean> {
    try {
      const { data: alert, error } = await supabase
        .from('emergency_alerts')
        .select(`
          *,
          rescue_missions (*)
        `)
        .eq('id', alertId)
        .single();

      if (error || !alert) return false;

      // Check auto-resolution conditions
      const shouldAutoResolve = await this.checkAutoResolutionConditions(alert);
      
      if (shouldAutoResolve) {
        await this.resolveEmergency(
          alertId, 
          'system', 
          'Automatically resolved based on system conditions'
        );
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error in auto-resolve:', error);
      return false;
    }
  }

  // Check conditions for automatic resolution
  private async checkAutoResolutionConditions(alert: any): Promise<boolean> {
    const now = new Date();
    const createdAt = new Date(alert.created_at);
    const timeElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60); // minutes

    // Condition 1: Rescue mission completed
    if (alert.rescue_missions?.[0]?.status === 'completed') {
      return true;
    }

    // Condition 2: Low urgency emergency after timeout (30 minutes)
    if (alert.urgency_level === 'low' && timeElapsed > 30) {
      return true;
    }

    // Condition 3: Medium urgency after timeout (60 minutes)
    if (alert.urgency_level === 'medium' && timeElapsed > 60) {
      return true;
    }

    // Condition 4: No user activity for extended period (90 minutes)
    const lastActivity = await this.getLastUserActivity(alert.user_id);
    if (lastActivity && (now.getTime() - lastActivity.getTime()) > (90 * 60 * 1000)) {
      return true;
    }

    // Condition 5: Hazard no longer active (based on re-analysis)
    const hazardStillActive = await this.reanalyzeHazard(alert.hazard_id);
    if (!hazardStillActive) {
      return true;
    }

    return false;
  }

  // Get last user activity timestamp
  private async getLastUserActivity(userId: string): Promise<Date | null> {
    try {
      const { data } = await supabase
        .from('user_emergency_profiles')
        .select('last_seen')
        .eq('user_id', userId)
        .single();

      return data?.last_seen ? new Date(data.last_seen) : null;
    } catch {
      return null;
    }
  }

  // Re-analyze hazard to check if still active
  private async reanalyzeHazard(hazardId: string): Promise<boolean> {
    try {
      const { data: hazard } = await supabase
        .from('hazard_detections')
        .select('*')
        .eq('id', hazardId)
        .single();

      if (!hazard) return false;

      // For demo, we'll simulate hazard deactivation after some time
      const now = new Date();
      const createdAt = new Date(hazard.created_at);
      const timeElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60); // minutes
      
      // Auto-deactivate hazard after 45 minutes for demo purposes
      return timeElapsed < 45;
    } catch {
      return false;
    }
  }

  // Get active emergencies for user
  async getActiveEmergencies(userId: string): Promise<EmergencyAlert[]> {
    try {
      const { data, error } = await supabase
        .from('emergency_alerts')
        .select(`
          *,
          hazard_detections (*)
        `)
        .eq('user_id', userId)
        .in('status', ['pending', 'sent', 'acknowledged', 'responding'])
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching active emergencies, returning empty array:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getActiveEmergencies:', error);
      return [];
    }
  }

  // Get all active emergencies (for admin)
  async getAllActiveEmergencies(): Promise<EmergencyAlert[]> {
    console.log('🔄 emergencyService.getAllActiveEmergencies called');
    try {
      // PRIORITY: Fetch from database first (for cross-browser sync)
      const { data, error } = await supabase
        .from('emergency_alerts')
        .select(`
          *,
          hazard_detections (*)
        `)
        .in('status', ['pending', 'sent', 'acknowledged', 'responding'])
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching from database, falling back to mock storage:', error);
        // Fallback to mock storage only if database fails
        const mockAlerts = mockEmergencyStorage.getActiveAlerts();
        console.log('📊 Fallback: emergencyService got mock alerts:', mockAlerts.length);
        return mockAlerts;
      }

      console.log('📤 Returning database alerts to admin:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Error in getAllActiveEmergencies:', error);
      // Final fallback to mock storage
      return mockEmergencyStorage.getActiveAlerts();
    }
  }

  // Get emergency statistics for user
  async getEmergencyStatistics(userId: string): Promise<{
    total_emergencies: number;
    resolved_emergencies: number;
    active_emergencies: number;
    response_time_avg: number;
  }> {
    try {
      const { data: stats, error } = await supabase
        .from('user_emergency_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !stats) {
        console.warn('Error fetching emergency stats, returning defaults:', error);
        return {
          total_emergencies: 0,
          resolved_emergencies: 0,
          active_emergencies: 0,
          response_time_avg: 0,
        };
      }

      return {
        total_emergencies: stats.total_emergencies || 0,
        resolved_emergencies: stats.resolved_emergencies || 0,
        active_emergencies: stats.active_emergencies || 0,
        response_time_avg: stats.avg_response_time_minutes || 0,
      };
    } catch (error) {
      console.error('Error in getEmergencyStatistics:', error);
      return {
        total_emergencies: 0,
        resolved_emergencies: 0,
        active_emergencies: 0,
        response_time_avg: 0,
      };
    }
  }
}

export const emergencyService = new EmergencyService();

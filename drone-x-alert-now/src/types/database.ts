export interface LocationData {
  lat: number;
  lng: number;
  placeName?: string;
}

export interface Database {
  public: {
    Tables: {
      ai_chat_messages: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          message_type: 'user' | 'assistant' | 'system';
          content: string;
          audio_url: string | null;
          emergency_detected: boolean | null;
          location_data: unknown;
          safe_places: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          message_type: 'user' | 'assistant' | 'system';
          content: string;
          audio_url?: string | null;
          emergency_detected?: boolean | null;
          location_data?: unknown;
          safe_places?: unknown;
          created_at?: string;
        };
      };
      emergency_contacts: {
        Row: {
          id: string;
          user_id: string;
          contact_user_id: string | null;
          name: string;
          phone: string;
          email: string | null;
          relationship: string | null;
          priority: number;
          photo_url: string | null;
          gender: 'male' | 'female' | 'other' | null;
          is_mutual: boolean;
          trust_level: number;
          verification_status: 'pending' | 'verified' | 'failed';
          verification_type: 'email' | 'sms' | 'id' | 'mutual' | null;
          verified_at: string | null;
          last_seen: string | null;
          is_online: boolean;
          emergency_code_hash: string | null;
          response_time_avg: number | null;
          availability_pattern: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_user_id?: string | null;
          name: string;
          phone: string;
          email?: string | null;
          relationship?: string | null;
          priority?: number;
          photo_url?: string | null;
          gender?: 'male' | 'female' | 'other' | null;
          is_mutual?: boolean;
          trust_level?: number;
          verification_status?: 'pending' | 'verified' | 'failed';
          verification_type?: 'email' | 'sms' | 'id' | 'mutual' | null;
          verified_at?: string | null;
          last_seen?: string | null;
          is_online?: boolean;
          emergency_code_hash?: string | null;
          response_time_avg?: number | null;
          availability_pattern?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          contact_user_id?: string | null;
          name?: string;
          phone?: string;
          email?: string | null;
          relationship?: string | null;
          priority?: number;
          photo_url?: string | null;
          gender?: 'male' | 'female' | 'other' | null;
          is_mutual?: boolean;
          trust_level?: number;
          verification_status?: 'pending' | 'verified' | 'failed';
          verification_type?: 'email' | 'sms' | 'id' | 'mutual' | null;
          verified_at?: string | null;
          last_seen?: string | null;
          is_online?: boolean;
          emergency_code_hash?: string | null;
          response_time_avg?: number | null;
          availability_pattern?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      emergency_chat_messages: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string | null;
          group_id: string | null;
          content: string;
          message_type: 'text' | 'voice' | 'image' | 'location' | 'emergency' | 'system';
          audio_url: string | null;
          image_url: string | null;
          location_data: LocationData | null;
          replied_to_id: string | null;
          status: 'sent' | 'delivered' | 'read';
          is_emergency: boolean;
          emergency_type: string | null;
          delivered_at: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          recipient_id?: string | null;
          group_id?: string | null;
          content: string;
          message_type?: 'text' | 'voice' | 'image' | 'location' | 'emergency' | 'system';
          audio_url?: string | null;
          image_url?: string | null;
          location_data?: LocationData | null;
          replied_to_id?: string | null;
          status?: 'sent' | 'delivered' | 'read';
          is_emergency?: boolean;
          emergency_type?: string | null;
          delivered_at?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          recipient_id?: string | null;
          group_id?: string | null;
          content?: string;
          message_type?: 'text' | 'voice' | 'image' | 'location' | 'emergency' | 'system';
          audio_url?: string | null;
          image_url?: string | null;
          location_data?: LocationData | null;
          replied_to_id?: string | null;
          status?: 'sent' | 'delivered' | 'read';
          is_emergency?: boolean;
          emergency_type?: string | null;
          delivered_at?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
      };
      emergency_groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          group_type: 'manual' | 'auto_emergency' | 'location_based' | 'broadcast';
          admin_id: string;
          photo_url: string | null;
          is_active: boolean;
          location_based_radius: number | null;
          center_location: LocationData | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          group_type?: 'manual' | 'auto_emergency' | 'location_based' | 'broadcast';
          admin_id: string;
          photo_url?: string | null;
          is_active?: boolean;
          location_based_radius?: number | null;
          center_location?: LocationData | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          group_type?: 'manual' | 'auto_emergency' | 'location_based' | 'broadcast';
          admin_id?: string;
          photo_url?: string | null;
          is_active?: boolean;
          location_based_radius?: number | null;
          center_location?: LocationData | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      emergency_group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          role: 'admin' | 'member' | 'moderator';
          joined_at: string;
          last_read_at: string | null;
          notifications_enabled: boolean;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          role?: 'admin' | 'member' | 'moderator';
          joined_at?: string;
          last_read_at?: string | null;
          notifications_enabled?: boolean;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          role?: 'admin' | 'member' | 'moderator';
          joined_at?: string;
          last_read_at?: string | null;
          notifications_enabled?: boolean;
        };
      };
      emergency_broadcasts: {
        Row: {
          id: string;
          sender_id: string;
          title: string;
          message: string;
          broadcast_type: 'emergency' | 'status_update' | 'safe_check';
          urgency_level: 'low' | 'medium' | 'high' | 'critical';
          location_data: LocationData | null;
          attachment_url: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          title: string;
          message: string;
          broadcast_type?: 'emergency' | 'status_update' | 'safe_check';
          urgency_level?: 'low' | 'medium' | 'high' | 'critical';
          location_data?: LocationData | null;
          attachment_url?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          title?: string;
          message?: string;
          broadcast_type?: 'emergency' | 'status_update' | 'safe_check';
          urgency_level?: 'low' | 'medium' | 'high' | 'critical';
          location_data?: LocationData | null;
          attachment_url?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
      };
      emergency_broadcast_recipients: {
        Row: {
          id: string;
          broadcast_id: string;
          recipient_id: string;
          status: 'sent' | 'delivered' | 'read' | 'responded';
          response: string | null;
          delivered_at: string | null;
          read_at: string | null;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          broadcast_id: string;
          recipient_id: string;
          status?: 'sent' | 'delivered' | 'read' | 'responded';
          response?: string | null;
          delivered_at?: string | null;
          read_at?: string | null;
          responded_at?: string | null;
        };
        Update: {
          id?: string;
          broadcast_id?: string;
          recipient_id?: string;
          status?: 'sent' | 'delivered' | 'read' | 'responded';
          response?: string | null;
          delivered_at?: string | null;
          read_at?: string | null;
          responded_at?: string | null;
        };
      };
      user_emergency_profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string | null;
          avatar_url: string | null;
          gender: 'male' | 'female' | 'other' | null;
          phone_verified: boolean;
          id_verified: boolean;
          emergency_code_hash: string | null;
          medical_info: unknown | null;
          emergency_contacts_visible: boolean;
          last_seen_visible: boolean;
          online_status_visible: boolean;
          location_sharing_enabled: boolean;
          current_location: LocationData | null;
          safe_location: LocationData | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          gender?: 'male' | 'female' | 'other' | null;
          phone_verified?: boolean;
          id_verified?: boolean;
          emergency_code_hash?: string | null;
          medical_info?: unknown | null;
          emergency_contacts_visible?: boolean;
          last_seen_visible?: boolean;
          online_status_visible?: boolean;
          location_sharing_enabled?: boolean;
          current_location?: LocationData | null;
          safe_location?: LocationData | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          gender?: 'male' | 'female' | 'other' | null;
          phone_verified?: boolean;
          id_verified?: boolean;
          emergency_code_hash?: string | null;
          medical_info?: unknown | null;
          emergency_contacts_visible?: boolean;
          last_seen_visible?: boolean;
          online_status_visible?: boolean;
          location_sharing_enabled?: boolean;
          current_location?: LocationData | null;
          safe_location?: LocationData | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      contact_verification_requests: {
        Row: {
          id: string;
          requester_id: string;
          contact_id: string;
          verification_code: string;
          request_type: 'mutual_contact' | 'emergency_code' | 'identity';
          status: 'pending' | 'approved' | 'rejected' | 'expired';
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          contact_id: string;
          verification_code: string;
          request_type?: 'mutual_contact' | 'emergency_code' | 'identity';
          status?: 'pending' | 'approved' | 'rejected' | 'expired';
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          requester_id?: string;
          contact_id?: string;
          verification_code?: string;
          request_type?: 'mutual_contact' | 'emergency_code' | 'identity';
          status?: 'pending' | 'approved' | 'rejected' | 'expired';
          expires_at?: string | null;
          created_at?: string;
        };
      };
      emergency_recordings: {
        Row: {
          id: string;
          user_id: string;
          audio_data: string;
          analysis_result: unknown | null;
          urgency_level: 'low' | 'medium' | 'high' | null;
          keywords: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          audio_data: string;
          analysis_result?: unknown | null;
          urgency_level?: 'low' | 'medium' | 'high' | null;
          keywords?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          audio_data?: string;
          analysis_result?: unknown | null;
          urgency_level?: 'low' | 'medium' | 'high' | null;
          keywords?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

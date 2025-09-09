export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          setting_key: string
          setting_value: Json | null
          updated_at: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: Json | null
          updated_at?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          audio_url: string | null
          content: string
          created_at: string
          emergency_detected: boolean | null
          id: string
          location_data: Json | null
          message_type: string
          session_id: string
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          content: string
          created_at?: string
          emergency_detected?: boolean | null
          id?: string
          location_data?: Json | null
          message_type: string
          session_id: string
          user_id: string
        }
        Update: {
          audio_url?: string | null
          content?: string
          created_at?: string
          emergency_detected?: boolean | null
          id?: string
          location_data?: Json | null
          message_type?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          created_at: string
          emergency_detected: boolean | null
          id: string
          is_active: boolean | null
          latitude: number | null
          location_shared: boolean | null
          longitude: number | null
          session_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emergency_detected?: boolean | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          location_shared?: boolean | null
          longitude?: number | null
          session_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emergency_detected?: boolean | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          location_shared?: boolean | null
          longitude?: number | null
          session_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      disasters: {
        Row: {
          affected_radius: number | null
          created_at: string
          description: string | null
          id: string
          latitude: number | null
          location: string
          longitude: number | null
          severity: string | null
          status: string | null
          type: string
          updated_at: string
        }
        Insert: {
          affected_radius?: number | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          location: string
          longitude?: number | null
          severity?: string | null
          status?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          affected_radius?: number | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          severity?: string | null
          status?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      drone_streams: {
        Row: {
          admin_id: string
          created_at: string
          description: string | null
          emergency_level: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          location: string
          longitude: number | null
          stream_name: string
          stream_quality: string | null
          updated_at: string
          viewer_count: number | null
        }
        Insert: {
          admin_id: string
          created_at?: string
          description?: string | null
          emergency_level?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          location: string
          longitude?: number | null
          stream_name: string
          stream_quality?: string | null
          updated_at?: string
          viewer_count?: number | null
        }
        Update: {
          admin_id?: string
          created_at?: string
          description?: string | null
          emergency_level?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          stream_name?: string
          stream_quality?: string | null
          updated_at?: string
          viewer_count?: number | null
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          location_sharing_duration: number | null
          location_sharing_enabled: boolean | null
          name: string
          phone: string
          priority: number | null
          relationship: string | null
          user_id: string
          verification_code: string | null
          verification_expires_at: string | null
          verification_status: string | null
          verification_type: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          location_sharing_duration?: number | null
          location_sharing_enabled?: boolean | null
          name: string
          phone: string
          priority?: number | null
          relationship?: string | null
          user_id: string
          verification_code?: string | null
          verification_expires_at?: string | null
          verification_status?: string | null
          verification_type?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          location_sharing_duration?: number | null
          location_sharing_enabled?: boolean | null
          name?: string
          phone?: string
          priority?: number | null
          relationship?: string | null
          user_id?: string
          verification_code?: string | null
          verification_expires_at?: string | null
          verification_status?: string | null
          verification_type?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      emergency_requests: {
        Row: {
          created_at: string
          description: string | null
          emergency_type: string
          id: string
          latitude: number | null
          longitude: number | null
          priority: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          emergency_type: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          priority?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          emergency_type?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          priority?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_chat_members: {
        Row: {
          display_name: string
          email: string | null
          emergency_contact_id: string | null
          group_id: string
          id: string
          is_active: boolean | null
          joined_at: string
          phone: string | null
          user_id: string | null
        }
        Insert: {
          display_name?: string
          email?: string | null
          emergency_contact_id?: string | null
          group_id: string
          id?: string
          is_active?: boolean | null
          joined_at?: string
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          display_name?: string
          email?: string | null
          emergency_contact_id?: string | null
          group_id?: string
          id?: string
          is_active?: boolean | null
          joined_at?: string
          phone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_chat_members_emergency_contact_id_fkey"
            columns: ["emergency_contact_id"]
            isOneToOne: false
            referencedRelation: "emergency_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_chat_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      group_chat_messages: {
        Row: {
          content: string | null
          created_at: string
          delivery_status: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          group_id: string
          id: string
          location_duration_hours: number | null
          location_expires_at: string | null
          location_latitude: number | null
          location_longitude: number | null
          message_type: string | null
          retry_count: number | null
          sender_id: string
          sender_name: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          delivery_status?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          group_id: string
          id?: string
          location_duration_hours?: number | null
          location_expires_at?: string | null
          location_latitude?: number | null
          location_longitude?: number | null
          message_type?: string | null
          retry_count?: number | null
          sender_id: string
          sender_name?: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          delivery_status?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          group_id?: string
          id?: string
          location_duration_hours?: number | null
          location_expires_at?: string | null
          location_latitude?: number | null
          location_longitude?: number | null
          message_type?: string | null
          retry_count?: number | null
          sender_id?: string
          sender_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_chat_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      group_chats: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          age: number | null
          blood_group: string | null
          created_at: string
          father_name: string | null
          full_name: string | null
          government_id: string | null
          guardian_name: string | null
          height: number | null
          id: string
          mother_name: string | null
          occupation: string | null
          phone: string | null
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          blood_group?: string | null
          created_at?: string
          father_name?: string | null
          full_name?: string | null
          government_id?: string | null
          guardian_name?: string | null
          height?: number | null
          id?: string
          mother_name?: string | null
          occupation?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          address?: string | null
          age?: number | null
          blood_group?: string | null
          created_at?: string
          father_name?: string | null
          full_name?: string | null
          government_id?: string | null
          guardian_name?: string | null
          height?: number | null
          id?: string
          mother_name?: string | null
          occupation?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      rescue_missions: {
        Row: {
          actual_arrival: string | null
          assigned_by: string | null
          completion_time: string | null
          created_at: string
          emergency_request_id: string
          estimated_arrival: string | null
          id: string
          notes: string | null
          priority: string | null
          rescue_team_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          actual_arrival?: string | null
          assigned_by?: string | null
          completion_time?: string | null
          created_at?: string
          emergency_request_id: string
          estimated_arrival?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          rescue_team_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          actual_arrival?: string | null
          assigned_by?: string | null
          completion_time?: string | null
          created_at?: string
          emergency_request_id?: string
          estimated_arrival?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          rescue_team_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rescue_missions_emergency_request_id_fkey"
            columns: ["emergency_request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescue_missions_rescue_team_id_fkey"
            columns: ["rescue_team_id"]
            isOneToOne: false
            referencedRelation: "rescue_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      rescue_teams: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          current_latitude: number | null
          current_longitude: number | null
          id: string
          specialization: string | null
          status: string | null
          team_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          id?: string
          specialization?: string | null
          status?: string | null
          team_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          id?: string
          specialization?: string | null
          status?: string | null
          team_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shared_locations: {
        Row: {
          accuracy: number | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          shared_with: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          shared_with: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          shared_with?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stream_viewers: {
        Row: {
          id: string
          joined_at: string
          last_seen: string
          stream_id: string
          user_id: string | null
          viewer_ip: string | null
        }
        Insert: {
          id?: string
          joined_at?: string
          last_seen?: string
          stream_id: string
          user_id?: string | null
          viewer_ip?: string | null
        }
        Update: {
          id?: string
          joined_at?: string
          last_seen?: string
          stream_id?: string
          user_id?: string | null
          viewer_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stream_viewers_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "drone_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          admin_id: string
          alert_type: string
          created_at: string
          id: string
          is_resolved: boolean | null
          message: string
          resolved_at: string | null
          severity: string | null
          title: string
        }
        Insert: {
          admin_id: string
          alert_type: string
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          message: string
          resolved_at?: string | null
          severity?: string | null
          title: string
        }
        Update: {
          admin_id?: string
          alert_type?: string
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          message?: string
          resolved_at?: string | null
          severity?: string | null
          title?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_assign_rescue_team: {
        Args: { emergency_id: string }
        Returns: string
      }
      get_user_role: {
        Args: { user_id?: string }
        Returns: string
      }
      has_role: {
        Args: { check_user_id: string; role_name: string }
        Returns: boolean
      }
      increment_retry_count: {
        Args: { message_id: string }
        Returns: number
      }
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

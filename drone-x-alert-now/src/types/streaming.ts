export interface DroneStream {
  id: string;
  admin_id: string;
  stream_name: string;
  location: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  stream_quality: 'SD' | 'HD' | '4K';
  emergency_level: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  device_type?: 'mobile' | 'drone' | 'camera' | 'laptop';
  connection_mode?: 'wifi' | 'bluetooth';
  viewer_count: number;
  created_at: string; // Changed from optional to required
  updated_at: string; // Changed from optional to required
}

export interface StreamStartData {
  stream_name: string;
  location: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  stream_quality: 'SD' | 'HD' | '4K';
  emergency_level: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  device_type?: 'mobile' | 'drone' | 'camera' | 'laptop';
  connection_mode?: 'wifi' | 'bluetooth';
}

-- Emergency Workflow Tables for DroneX Alert Now
-- This migration creates the tables needed for the complete emergency response workflow

-- Hazard Detection Table
CREATE TABLE IF NOT EXISTS hazard_detections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  location JSONB NOT NULL,
  hazard_type TEXT NOT NULL CHECK (hazard_type IN ('fire', 'flood', 'earthquake', 'accident', 'violence', 'medical', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  confidence DECIMAL(3,2) DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  detection_source TEXT NOT NULL CHECK (detection_source IN ('ai_voice', 'ai_video', 'user_report', 'location_analysis')),
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency Alerts Table
CREATE TABLE IF NOT EXISTS emergency_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hazard_id UUID REFERENCES hazard_detections(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('neighbor_alert', 'admin_alert', 'rescue_request')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged', 'responding', 'resolved')),
  message TEXT NOT NULL,
  recipients TEXT[] DEFAULT '{}',
  location JSONB NOT NULL,
  safe_zones JSONB,
  urgency_level TEXT NOT NULL CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('automatic', 'manual')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rescue Missions Table
CREATE TABLE IF NOT EXISTS rescue_missions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID REFERENCES emergency_alerts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  rescue_team_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'dispatched' CHECK (status IN ('dispatched', 'en_route', 'on_scene', 'assisting', 'completed', 'cancelled')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  arrived_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  team_members TEXT[] DEFAULT '{}',
  equipment TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Emergency Statistics Table
CREATE TABLE IF NOT EXISTS user_emergency_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  total_emergencies INTEGER DEFAULT 0,
  resolved_emergencies INTEGER DEFAULT 0,
  active_emergencies INTEGER DEFAULT 0,
  avg_response_time_minutes INTEGER DEFAULT 0,
  last_emergency_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safe Zones Table
CREATE TABLE IF NOT EXISTS safe_zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location JSONB NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('shelter', 'hospital', 'police', 'fire_station', 'community_center')),
  capacity INTEGER NOT NULL,
  current_occupancy INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  facilities TEXT[] DEFAULT '{}',
  contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hazard_detections_user_id ON hazard_detections(user_id);
CREATE INDEX IF NOT EXISTS idx_hazard_detections_location ON hazard_detections USING GIN(location);
CREATE INDEX IF NOT EXISTS idx_hazard_detections_active ON hazard_detections(is_active);
CREATE INDEX IF NOT EXISTS idx_hazard_detections_created_at ON hazard_detections(created_at);

CREATE INDEX IF NOT EXISTS idx_emergency_alerts_user_id ON emergency_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_hazard_id ON emergency_alerts(hazard_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_status ON emergency_alerts(status);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_urgency ON emergency_alerts(urgency_level);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_location ON emergency_alerts USING GIN(location);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_created_at ON emergency_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_rescue_missions_alert_id ON rescue_missions(alert_id);
CREATE INDEX IF NOT EXISTS idx_rescue_missions_status ON rescue_missions(status);
CREATE INDEX IF NOT EXISTS idx_rescue_missions_team_id ON rescue_missions(rescue_team_id);
CREATE INDEX IF NOT EXISTS idx_rescue_missions_assigned_at ON rescue_missions(assigned_at);

CREATE INDEX IF NOT EXISTS idx_safe_zones_location ON safe_zones USING GIN(location);
CREATE INDEX IF NOT EXISTS idx_safe_zones_type ON safe_zones(type);
CREATE INDEX IF NOT EXISTS idx_safe_zones_available ON safe_zones(is_available);

-- RLS Policies
ALTER TABLE hazard_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rescue_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_emergency_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE safe_zones ENABLE ROW LEVEL SECURITY;

-- Hazard Detections RLS
CREATE POLICY "Users can view own hazard detections" ON hazard_detections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hazard detections" ON hazard_detections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all hazard detections" ON hazard_detections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Emergency Alerts RLS
CREATE POLICY "Users can view own emergency alerts" ON emergency_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emergency alerts" ON emergency_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all emergency alerts" ON emergency_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Rescue Missions RLS
CREATE POLICY "Users can view own rescue missions" ON rescue_missions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all rescue missions" ON rescue_missions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- User Emergency Stats RLS
CREATE POLICY "Users can view own emergency stats" ON user_emergency_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own emergency stats" ON user_emergency_stats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all emergency stats" ON user_emergency_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Safe Zones RLS (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view safe zones" ON safe_zones
  FOR SELECT USING (auth.role() = 'authenticated');

-- Functions for automatic statistics updates
CREATE OR REPLACE FUNCTION update_user_emergency_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_emergency_stats (user_id, total_emergencies, active_emergencies)
    VALUES (NEW.user_id, 1, 1)
    ON CONFLICT (user_id) 
    DO UPDATE SET
      total_emergencies = user_emergency_stats.total_emergencies + 1,
      active_emergencies = user_emergency_stats.active_emergencies + 1,
      updated_at = NOW();
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'resolved' AND NEW.status = 'resolved' THEN
      UPDATE user_emergency_stats
      SET
        resolved_emergencies = resolved_emergencies + 1,
        active_emergencies = active_emergencies - 1,
        updated_at = NOW()
      WHERE user_id = NEW.user_id;
    ELSIF OLD.status = 'resolved' AND NEW.status != 'resolved' THEN
      UPDATE user_emergency_stats
      SET
        resolved_emergencies = resolved_emergencies - 1,
        active_emergencies = active_emergencies + 1,
        updated_at = NOW()
      WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for automatic statistics updates
CREATE TRIGGER trigger_update_user_emergency_stats
  AFTER INSERT OR UPDATE ON emergency_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_emergency_stats();

-- Insert sample safe zones
INSERT INTO safe_zones (name, location, type, capacity, facilities) VALUES
('Central Community Shelter', '{"lat": 40.7128, "lng": -74.0060}', 'shelter', 200, 
 ARRAY['first_aid', 'food', 'water', 'communication']),
('City General Hospital', '{"lat": 40.7580, "lng": -73.9855}', 'hospital', 500, 
 ARRAY['medical_care', 'emergency_room', 'surgery']),
('Main Police Station', '{"lat": 40.7614, "lng": -73.9776}', 'police', 50, 
 ARRAY['security', 'communication', 'holding_cells']),
('Fire Department Station 1', '{"lat": 40.7484, "lng": -73.9857}', 'fire_station', 30, 
 ARRAY['fire_suppression', 'rescue_equipment', 'medical_first_response']),
('Riverside Community Center', '{"lat": 40.7282, "lng": -74.0776}', 'community_center', 150, 
 ARRAY['shelter', 'food', 'water', 'communication', 'child_care'])
ON CONFLICT DO NOTHING;

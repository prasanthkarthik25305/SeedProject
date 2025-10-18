
-- Create admin-specific tables for managing system
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(admin_id, setting_key)
);

-- Create system alerts table for admins
CREATE TABLE public.system_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alert_type TEXT CHECK (alert_type IN ('system', 'emergency', 'maintenance', 'security')) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create rescue mission assignments table
CREATE TABLE public.rescue_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emergency_request_id UUID REFERENCES public.emergency_requests(id) ON DELETE CASCADE NOT NULL,
  rescue_team_id UUID REFERENCES public.rescue_teams(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled')) DEFAULT 'assigned',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  estimated_arrival TIMESTAMP WITH TIME ZONE,
  actual_arrival TIMESTAMP WITH TIME ZONE,
  completion_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for new tables
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rescue_missions ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin settings
CREATE POLICY "Admins can manage own settings" ON public.admin_settings
  FOR ALL USING (
    auth.uid() = admin_id AND 
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS policies for system alerts
CREATE POLICY "Admins can manage system alerts" ON public.system_alerts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS policies for rescue missions
CREATE POLICY "Admins can manage all rescue missions" ON public.rescue_missions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Rescue teams can view assigned missions" ON public.rescue_missions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rescue_teams rt 
      WHERE rt.user_id = auth.uid() AND rt.id = rescue_team_id
    )
  );

CREATE POLICY "Rescue teams can update mission status" ON public.rescue_missions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.rescue_teams rt 
      WHERE rt.user_id = auth.uid() AND rt.id = rescue_team_id
    )
  );

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rescue_missions;

-- Set replica identity for realtime updates
ALTER TABLE public.admin_settings REPLICA IDENTITY FULL;
ALTER TABLE public.system_alerts REPLICA IDENTITY FULL;
ALTER TABLE public.rescue_missions REPLICA IDENTITY FULL;

-- Function to auto-assign rescue teams based on location
CREATE OR REPLACE FUNCTION auto_assign_rescue_team(emergency_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  nearest_team_id UUID;
  emergency_lat DECIMAL;
  emergency_lng DECIMAL;
BEGIN
  -- Get emergency location
  SELECT latitude, longitude INTO emergency_lat, emergency_lng
  FROM public.emergency_requests
  WHERE id = emergency_id;
  
  -- Find nearest available rescue team
  SELECT rt.id INTO nearest_team_id
  FROM public.rescue_teams rt
  WHERE rt.status = 'available'
    AND rt.current_latitude IS NOT NULL
    AND rt.current_longitude IS NOT NULL
  ORDER BY 
    SQRT(
      POWER(rt.current_latitude - emergency_lat, 2) + 
      POWER(rt.current_longitude - emergency_lng, 2)
    )
  LIMIT 1;
  
  -- Create mission assignment if team found
  IF nearest_team_id IS NOT NULL THEN
    INSERT INTO public.rescue_missions (
      emergency_request_id,
      rescue_team_id,
      status,
      priority,
      estimated_arrival
    ) VALUES (
      emergency_id,
      nearest_team_id,
      'assigned',
      'high',
      now() + INTERVAL '30 minutes'
    );
    
    -- Update rescue team status
    UPDATE public.rescue_teams 
    SET status = 'deployed', updated_at = now()
    WHERE id = nearest_team_id;
  END IF;
  
  RETURN nearest_team_id;
END;
$$;

-- Create disaster guidance table for custom chatbot
CREATE TABLE IF NOT EXISTS disaster_guidance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  disaster_type TEXT NOT NULL,
  keywords TEXT[] NOT NULL,
  guidance_text TEXT NOT NULL,
  emergency_level TEXT CHECK (emergency_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create chat history table
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  disaster_type TEXT,
  emergency_detected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create video analysis table
CREATE TABLE IF NOT EXISTS video_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  video_url TEXT NOT NULL,
  analysis_status TEXT CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  detected_objects JSONB DEFAULT '[]'::jsonb,
  disaster_indicators JSONB DEFAULT '[]'::jsonb,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  aws_job_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS disaster_guidance_type_idx ON disaster_guidance(disaster_type);
CREATE INDEX IF NOT EXISTS chat_history_user_idx ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS chat_history_emergency_idx ON chat_history(emergency_detected);
CREATE INDEX IF NOT EXISTS video_analysis_user_idx ON video_analysis(user_id);
CREATE INDEX IF NOT EXISTS video_analysis_status_idx ON video_analysis(analysis_status);

-- Enable Row Level Security (RLS)
ALTER TABLE disaster_guidance ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for disaster_guidance (public read access)
CREATE POLICY "allow_read_disaster_guidance" ON disaster_guidance FOR SELECT USING (true);
CREATE POLICY "allow_admin_manage_disaster_guidance" ON disaster_guidance 
  FOR ALL TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for chat_history (users can only access their own)
CREATE POLICY "allow_users_own_chat_history" ON chat_history 
  FOR ALL TO authenticated 
  USING (user_id = auth.uid());

-- RLS Policies for video_analysis (users can only access their own)
CREATE POLICY "allow_users_own_video_analysis" ON video_analysis 
  FOR ALL TO authenticated 
  USING (user_id = auth.uid());

-- Insert sample disaster guidance data
INSERT INTO disaster_guidance (disaster_type, keywords, guidance_text, emergency_level) VALUES
('Earthquake', ARRAY['earthquake', 'tremor', 'shake', 'building collapse', 'seismic'], 
 'EARTHQUAKE SAFETY PROTOCOL:
1. DROP to hands and knees immediately
2. COVER your head and neck under a desk/table
3. HOLD ON to your shelter and protect yourself
4. Stay away from windows, mirrors, and heavy objects
5. If outdoors, move away from buildings and power lines
6. After shaking stops, evacuate if building is damaged
7. Check for injuries and hazards
8. Listen to emergency broadcasts for updates', 'high'),

('Fire Emergency', ARRAY['fire', 'smoke', 'burning', 'flames', 'evacuation'], 
 'FIRE EMERGENCY PROTOCOL:
1. Alert others immediately - shout "FIRE!"
2. Call 101 (Fire Department) immediately
3. If small fire, use appropriate extinguisher (if trained)
4. Evacuate immediately if fire is spreading
5. Stay low to avoid smoke inhalation
6. Feel doors before opening (hot = fire behind)
7. Use stairs, NEVER elevators
8. Meet at designated assembly point
9. Do not re-enter building until cleared by fire department', 'critical'),

('Flood Emergency', ARRAY['flood', 'water', 'drowning', 'evacuation', 'rising water'], 
 'FLOOD EMERGENCY PROTOCOL:
1. Move to higher ground immediately
2. Call 1077 (NDRF) for rescue assistance
3. Avoid walking in moving water (6 inches can knock you down)
4. Do not drive through flooded roads
5. Stay away from electrical equipment and power lines
6. If trapped, signal for help from highest point
7. Listen to emergency broadcasts for evacuation orders
8. Prepare emergency kit with water, food, medications
9. Turn off utilities if instructed by authorities', 'high'),

('Medical Emergency', ARRAY['medical', 'injured', 'accident', 'heart attack', 'unconscious', 'bleeding'], 
 'MEDICAL EMERGENCY PROTOCOL:
1. Call 108 (Ambulance) immediately
2. Check if person is conscious and breathing
3. Do not move injured person unless in immediate danger
4. Apply direct pressure to control bleeding
5. Keep person warm and comfortable
6. Monitor vital signs if trained
7. Clear airway if person is unconscious
8. Perform CPR if trained and necessary
9. Stay with person until medical help arrives', 'critical'),

('Cyclone/Storm', ARRAY['cyclone', 'storm', 'hurricane', 'wind', 'shelter'], 
 'CYCLONE SAFETY PROTOCOL:
1. Monitor weather updates continuously
2. Secure loose objects that could become projectiles
3. Board up windows with plywood
4. Stock emergency supplies (water, food, medications)
5. Charge all electronic devices
6. Identify strongest room in house (interior, lowest floor)
7. Stay away from windows during storm
8. Do not go outside during eye of storm
9. Wait for all-clear from authorities before venturing out', 'high'),

('General Emergency', ARRAY['help', 'emergency', 'urgent', 'rescue', 'danger'], 
 'GENERAL EMERGENCY PROTOCOL:
1. Stay calm and assess the situation
2. Call appropriate emergency number:
   - All Emergency: 112
   - Police: 100
   - Fire: 101
   - Medical: 108
3. Provide clear location and nature of emergency
4. Follow dispatcher instructions
5. Do not hang up until told to do so
6. Provide first aid if trained and safe to do so
7. Keep emergency contacts readily available
8. Have emergency kit prepared at home/work', 'medium');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_disaster_guidance_updated_at BEFORE UPDATE ON disaster_guidance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_video_analysis_updated_at BEFORE UPDATE ON video_analysis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
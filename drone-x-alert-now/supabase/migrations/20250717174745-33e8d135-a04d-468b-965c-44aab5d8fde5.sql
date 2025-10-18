
-- Create drone streaming table to manage live streams
CREATE TABLE public.drone_streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stream_name TEXT NOT NULL,
  location TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_active BOOLEAN DEFAULT false,
  stream_quality TEXT CHECK (stream_quality IN ('SD', 'HD', '4K')) DEFAULT 'HD',
  viewer_count INTEGER DEFAULT 0,
  emergency_level TEXT CHECK (emergency_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create real-time chat sessions for AI assistant
CREATE TABLE public.ai_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_name TEXT,
  is_active BOOLEAN DEFAULT true,
  emergency_detected BOOLEAN DEFAULT false,
  location_shared BOOLEAN DEFAULT false,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI chat messages table
CREATE TABLE public.ai_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_type TEXT CHECK (message_type IN ('user', 'assistant', 'system')) NOT NULL,
  content TEXT NOT NULL,
  audio_url TEXT,
  emergency_detected BOOLEAN DEFAULT false,
  location_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create live stream viewers tracking
CREATE TABLE public.stream_viewers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID REFERENCES public.drone_streams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_ip TEXT,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(stream_id, user_id)
);

-- Enable RLS for new tables
ALTER TABLE public.drone_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_viewers ENABLE ROW LEVEL SECURITY;

-- RLS policies for drone streams
CREATE POLICY "All users can view active drone streams" ON public.drone_streams
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage drone streams" ON public.drone_streams
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS policies for AI chat sessions
CREATE POLICY "Users can manage own chat sessions" ON public.ai_chat_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all chat sessions" ON public.ai_chat_sessions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS policies for AI chat messages
CREATE POLICY "Users can manage own chat messages" ON public.ai_chat_messages
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all chat messages" ON public.ai_chat_messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS policies for stream viewers
CREATE POLICY "Users can view own stream viewing history" ON public.stream_viewers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own viewing records" ON public.stream_viewers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all stream viewers" ON public.stream_viewers
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Enable realtime for real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.drone_streams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_viewers;

-- Set replica identity for realtime updates
ALTER TABLE public.drone_streams REPLICA IDENTITY FULL;
ALTER TABLE public.ai_chat_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.ai_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.stream_viewers REPLICA IDENTITY FULL;

-- Function to update viewer count
CREATE OR REPLACE FUNCTION update_stream_viewer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.drone_streams 
    SET viewer_count = viewer_count + 1,
        updated_at = now()
    WHERE id = NEW.stream_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.drone_streams 
    SET viewer_count = GREATEST(viewer_count - 1, 0),
        updated_at = now()
    WHERE id = OLD.stream_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for viewer count
CREATE TRIGGER trigger_update_viewer_count_insert
  AFTER INSERT ON public.stream_viewers
  FOR EACH ROW EXECUTE FUNCTION update_stream_viewer_count();

CREATE TRIGGER trigger_update_viewer_count_delete
  AFTER DELETE ON public.stream_viewers
  FOR EACH ROW EXECUTE FUNCTION update_stream_viewer_count();

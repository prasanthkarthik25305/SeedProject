
-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  government_id TEXT,
  full_name TEXT NOT NULL,
  age INTEGER,
  height DECIMAL(5,2),
  weight DECIMAL(5,2),
  blood_group TEXT,
  address TEXT,
  occupation TEXT,
  father_name TEXT,
  mother_name TEXT,
  guardian_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create emergency contacts table
CREATE TABLE public.emergency_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  relationship TEXT,
  priority INTEGER CHECK (priority >= 1 AND priority <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, priority)
);

-- Create disasters table
CREATE TABLE public.disasters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  location TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT CHECK (status IN ('active', 'resolved', 'monitoring')) DEFAULT 'active',
  description TEXT,
  affected_radius DECIMAL(10, 2), -- in kilometers
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create emergency requests table
CREATE TABLE public.emergency_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emergency_type TEXT CHECK (emergency_type IN ('medical', 'disaster', 'food', 'other')) NOT NULL,
  description TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status TEXT CHECK (status IN ('pending', 'assigned', 'in_progress', 'resolved')) DEFAULT 'pending',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rescue teams table
CREATE TABLE public.rescue_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_name TEXT NOT NULL,
  specialization TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  status TEXT CHECK (status IN ('available', 'busy', 'offline')) DEFAULT 'available',
  current_latitude DECIMAL(10, 8),
  current_longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create user roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user', 'admin', 'rescue_team')) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disasters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rescue_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for emergency contacts
CREATE POLICY "Users can manage own emergency contacts" ON public.emergency_contacts
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for disasters (readable by all authenticated users)
CREATE POLICY "All users can view disasters" ON public.disasters
  FOR SELECT TO authenticated USING (true);

-- Create RLS policies for emergency requests
CREATE POLICY "Users can view own emergency requests" ON public.emergency_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create emergency requests" ON public.emergency_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Rescue teams can view all emergency requests" ON public.emergency_requests
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('rescue_team', 'admin')
    )
  );

-- Create RLS policies for rescue teams
CREATE POLICY "Rescue teams can manage own profile" ON public.rescue_teams
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "All authenticated users can view rescue teams" ON public.rescue_teams
  FOR SELECT TO authenticated USING (true);

-- Create RLS policies for user roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = $1 AND user_roles.role = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

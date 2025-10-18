-- Drop the problematic RLS policies first
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own roles during signup" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Create a security definer function to check admin roles safely
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = $1 AND user_roles.role = 'admin'
  );
END;
$$;

-- Create a security definer function to get current user role safely
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.user_roles 
  WHERE user_roles.user_id = $1 
  LIMIT 1;
  
  RETURN COALESCE(user_role, 'user');
END;
$$;

-- Create new RLS policies without recursion
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roles during signup"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user roles"
ON public.user_roles
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Fix the has_role function to avoid recursion
CREATE OR REPLACE FUNCTION public.has_role(check_user_id uuid, role_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = check_user_id AND user_roles.role = role_name
  );
END;
$$;

-- Update the handle_new_user function to set search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create the profile, don't assign any role
  -- The role will be assigned by the application based on signup context
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  RETURN NEW;
END;
$$;

-- Update the auto_assign_rescue_team function to set search_path
CREATE OR REPLACE FUNCTION public.auto_assign_rescue_team(emergency_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
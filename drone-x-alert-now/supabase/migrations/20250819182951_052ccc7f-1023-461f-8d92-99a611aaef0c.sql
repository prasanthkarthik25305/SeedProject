-- Drop the problematic RLS policies first
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own roles during signup" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Drop existing function to recreate it
DROP FUNCTION IF EXISTS public.has_role(uuid, text);

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

-- Recreate the has_role function to avoid recursion
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
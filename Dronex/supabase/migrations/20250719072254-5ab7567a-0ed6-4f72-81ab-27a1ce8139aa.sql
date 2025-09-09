-- Fix RLS policies for user_roles table to allow role assignment during signup
-- Add INSERT policy to allow users to assign their own roles during registration

-- Add policy to allow users to insert their own roles during signup
CREATE POLICY "Users can insert own roles during signup" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add policy to allow admins to manage all user roles
CREATE POLICY "Admins can manage all user roles" 
ON public.user_roles 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() 
  AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() 
  AND role = 'admin'
));
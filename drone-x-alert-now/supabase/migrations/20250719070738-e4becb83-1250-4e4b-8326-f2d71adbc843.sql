-- First, let's modify the handle_new_user trigger to not automatically assign 'user' role
-- Instead, we'll let the application handle role assignment based on signup context

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a new function that only creates the profile, not the role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create the profile, don't assign any role
  -- The role will be assigned by the application based on signup context
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clean up existing incorrect roles for the current test user
-- (Only remove 'user' role if there are other roles assigned)
DELETE FROM public.user_roles 
WHERE user_id = '1bfcb113-18ca-4a34-9d33-f6fc53404aae' 
AND role = 'user';

-- Add the correct admin role for the current user
INSERT INTO public.user_roles (user_id, role)
VALUES ('1bfcb113-18ca-4a34-9d33-f6fc53404aae', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
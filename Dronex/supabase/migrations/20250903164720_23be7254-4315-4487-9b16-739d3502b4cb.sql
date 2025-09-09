-- Add missing RLS policies for admin_settings
CREATE POLICY "Admins can manage settings"
ON public.admin_settings
FOR ALL
USING (is_admin());

-- Add missing RLS policies for system_alerts
CREATE POLICY "Admins can manage alerts" 
ON public.system_alerts
FOR ALL
USING (is_admin());

-- Fix function search paths
DROP FUNCTION IF EXISTS public.update_group_chats_updated_at();
CREATE OR REPLACE FUNCTION public.update_group_chats_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.update_group_chat_messages_updated_at();
CREATE OR REPLACE FUNCTION public.update_group_chat_messages_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.create_group_chat_for_verified_contact();
CREATE OR REPLACE FUNCTION public.create_group_chat_for_verified_contact()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  group_chat_id uuid;
BEGIN
  -- Only proceed if contact was just verified
  IF OLD.verification_status != 'verified' AND NEW.verification_status = 'verified' THEN
    -- Check if a group chat already exists for this user
    SELECT id INTO group_chat_id 
    FROM public.group_chats 
    WHERE owner_id = NEW.user_id AND is_active = true 
    LIMIT 1;
    
    -- Create group chat if it doesn't exist
    IF group_chat_id IS NULL THEN
      INSERT INTO public.group_chats (owner_id, name, description)
      VALUES (NEW.user_id, 'Emergency Network', 'Emergency contact group chat')
      RETURNING id INTO group_chat_id;
    END IF;
    
    -- Add the verified contact as a member
    INSERT INTO public.group_chat_members (group_id, user_id, emergency_contact_id)
    VALUES (group_chat_id, NEW.user_id, NEW.id)
    ON CONFLICT (group_id, user_id) DO UPDATE SET 
      is_active = true,
      emergency_contact_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;
-- Update the trigger to only add verified contacts to group chat
CREATE OR REPLACE FUNCTION public.create_group_chat_for_verified_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  group_chat_id uuid;
BEGIN
  -- Only proceed if contact was just verified (status changed from non-verified to verified)
  IF OLD.verification_status != 'verified' AND NEW.verification_status = 'verified' THEN
    -- Check if a group chat already exists for this user
    SELECT id INTO group_chat_id 
    FROM public.group_chats 
    WHERE owner_id = NEW.user_id AND is_active = true 
    LIMIT 1;
    
    -- Create group chat if it doesn't exist
    IF group_chat_id IS NULL THEN
      INSERT INTO public.group_chats (owner_id, name, description)
      VALUES (NEW.user_id, 'Emergency Network', 'Emergency contact group chat for verified contacts only')
      RETURNING id INTO group_chat_id;
    END IF;
    
    -- Add the verified contact as a member to the group chat
    INSERT INTO public.group_chat_members (group_id, user_id, emergency_contact_id, display_name, email, phone)
    VALUES (
      group_chat_id, 
      NULL, -- Emergency contacts don't have user accounts
      NEW.id, 
      NEW.name, 
      NEW.email, 
      NEW.phone
    )
    ON CONFLICT (group_id, emergency_contact_id) DO UPDATE SET 
      is_active = true,
      display_name = NEW.name,
      email = NEW.email,
      phone = NEW.phone;
      
  -- If contact verification status changes from verified to pending/failed, remove from group
  ELSIF OLD.verification_status = 'verified' AND NEW.verification_status != 'verified' THEN
    UPDATE public.group_chat_members 
    SET is_active = false 
    WHERE emergency_contact_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_emergency_contact_verified ON public.emergency_contacts;
CREATE TRIGGER on_emergency_contact_verified
  AFTER UPDATE ON public.emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION public.create_group_chat_for_verified_contact();
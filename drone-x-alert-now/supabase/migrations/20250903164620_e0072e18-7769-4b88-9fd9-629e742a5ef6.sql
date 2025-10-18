-- Add verification fields to emergency_contacts
ALTER TABLE public.emergency_contacts 
ADD COLUMN verification_status text DEFAULT 'pending',
ADD COLUMN verification_code text,
ADD COLUMN verification_type text DEFAULT 'email',
ADD COLUMN verified_at timestamp with time zone,
ADD COLUMN verification_expires_at timestamp with time zone;

-- Create group chats table
CREATE TABLE public.group_chats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create group chat members table
CREATE TABLE public.group_chat_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emergency_contact_id uuid REFERENCES public.emergency_contacts(id) ON DELETE CASCADE,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(group_id, user_id)
);

-- Create group chat messages table
CREATE TABLE public.group_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message_type text DEFAULT 'text',
  content text,
  file_url text,
  file_name text,
  file_size integer,
  location_latitude numeric,
  location_longitude numeric,
  location_duration_hours integer,
  location_expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for group_chats
CREATE POLICY "Users can manage own group chats"
ON public.group_chats
FOR ALL
USING (auth.uid() = owner_id);

CREATE POLICY "Users can view group chats they're members of"
ON public.group_chats
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_chat_members 
    WHERE group_id = id AND user_id = auth.uid() AND is_active = true
  )
);

-- RLS policies for group_chat_members
CREATE POLICY "Group owners can manage members"
ON public.group_chat_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.group_chats 
    WHERE id = group_id AND owner_id = auth.uid()
  )
);

CREATE POLICY "Users can view group memberships"
ON public.group_chat_members
FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.group_chats 
    WHERE id = group_id AND owner_id = auth.uid()
  )
);

-- RLS policies for group_chat_messages
CREATE POLICY "Group members can view messages"
ON public.group_chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_chat_members 
    WHERE group_id = group_chat_messages.group_id 
    AND user_id = auth.uid() 
    AND is_active = true
  )
);

CREATE POLICY "Group members can send messages"
ON public.group_chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.group_chat_members 
    WHERE group_id = group_chat_messages.group_id 
    AND user_id = auth.uid() 
    AND is_active = true
  )
);

CREATE POLICY "Users can update own messages"
ON public.group_chat_messages
FOR UPDATE
USING (auth.uid() = sender_id);

-- Add updated_at trigger for group_chats
CREATE OR REPLACE FUNCTION public.update_group_chats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_group_chats_updated_at
BEFORE UPDATE ON public.group_chats
FOR EACH ROW
EXECUTE FUNCTION public.update_group_chats_updated_at();

-- Add updated_at trigger for group_chat_messages
CREATE OR REPLACE FUNCTION public.update_group_chat_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_group_chat_messages_updated_at
BEFORE UPDATE ON public.group_chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_group_chat_messages_updated_at();

-- Create function to auto-create group chat when emergency contact is verified
CREATE OR REPLACE FUNCTION public.create_group_chat_for_verified_contact()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_create_group_chat_on_verification
AFTER UPDATE ON public.emergency_contacts
FOR EACH ROW
EXECUTE FUNCTION public.create_group_chat_for_verified_contact();
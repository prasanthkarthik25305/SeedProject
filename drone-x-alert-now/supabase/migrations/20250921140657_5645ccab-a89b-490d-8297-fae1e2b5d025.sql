-- Fix migration (remove problematic DO block around function)

-- 1) Add contact_user_id to emergency_contacts to link to a real Supabase user when available
ALTER TABLE public.emergency_contacts
ADD COLUMN IF NOT EXISTS contact_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_contact_user_id
  ON public.emergency_contacts (contact_user_id);

-- 2) Strengthen RLS for group chat tables so members (not just owners) can access
ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop conflicting policy if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'group_chats' AND policyname = 'owners_only'
  ) THEN
    DROP POLICY "owners_only" ON public.group_chats;
  END IF;
END $$;

-- group_chats policies
CREATE POLICY IF NOT EXISTS "Owners can manage their group chats"
ON public.group_chats
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY IF NOT EXISTS "Members can view group chats"
ON public.group_chats
FOR SELECT
USING (
  auth.uid() = owner_id OR EXISTS (
    SELECT 1 FROM public.group_chat_members m
    WHERE m.group_id = id
      AND m.user_id = auth.uid()
      AND m.is_active = true
  )
);

-- group_chat_members policies
CREATE POLICY IF NOT EXISTS "Owners can manage members"
ON public.group_chat_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.group_chats g
    WHERE g.id = group_id AND g.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_chats g
    WHERE g.id = group_id AND g.owner_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "Members can view members of their groups"
ON public.group_chat_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_chats g
    WHERE g.id = group_id AND g.owner_id = auth.uid()
  )
  OR user_id = auth.uid()
);

-- group_chat_messages policies
CREATE POLICY IF NOT EXISTS "Members can read messages"
ON public.group_chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_chats g
    WHERE g.id = group_id AND (
      g.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.group_chat_members m
        WHERE m.group_id = g.id AND m.user_id = auth.uid() AND m.is_active = true
      )
    )
  )
);

CREATE POLICY IF NOT EXISTS "Members can send messages"
ON public.group_chat_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_chats g
    WHERE g.id = group_id AND (
      g.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.group_chat_members m
        WHERE m.group_id = g.id AND m.user_id = auth.uid() AND m.is_active = true
      )
    )
  )
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_group_chat_members_group_user 
  ON public.group_chat_members (group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_group_created 
  ON public.group_chat_messages (group_id, created_at);

-- Update timestamp trigger function (idempotent via OR REPLACE)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Attach triggers
DROP TRIGGER IF EXISTS update_group_chats_updated_at ON public.group_chats;
CREATE TRIGGER update_group_chats_updated_at
BEFORE UPDATE ON public.group_chats
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_chat_messages_updated_at ON public.group_chat_messages;
CREATE TRIGGER update_group_chat_messages_updated_at
BEFORE UPDATE ON public.group_chat_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Re-apply policies without IF NOT EXISTS using idempotent DROP POLICY IF EXISTS

-- Ensure RLS enabled
ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_messages ENABLE ROW LEVEL SECURITY;

-- Remove old/conflicting policies
DROP POLICY IF EXISTS "owners_only" ON public.group_chats;
DROP POLICY IF EXISTS "Owners can manage their group chats" ON public.group_chats;
DROP POLICY IF EXISTS "Members can view group chats" ON public.group_chats;

DROP POLICY IF EXISTS "Owners can manage members" ON public.group_chat_members;
DROP POLICY IF EXISTS "Members can view members of their groups" ON public.group_chat_members;

DROP POLICY IF EXISTS "Members can read messages" ON public.group_chat_messages;
DROP POLICY IF EXISTS "Members can send messages" ON public.group_chat_messages;

-- Recreate policies
CREATE POLICY "Owners can manage their group chats"
ON public.group_chats
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Members can view group chats"
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

CREATE POLICY "Owners can manage members"
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

CREATE POLICY "Members can view members of their groups"
ON public.group_chat_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_chats g
    WHERE g.id = group_id AND g.owner_id = auth.uid()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Members can read messages"
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

CREATE POLICY "Members can send messages"
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

-- Add contact_user_id column if still missing
ALTER TABLE public.emergency_contacts
ADD COLUMN IF NOT EXISTS contact_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_contact_user_id
  ON public.emergency_contacts (contact_user_id);

-- Recreate/update timestamp trigger function and triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_group_chats_updated_at ON public.group_chats;
CREATE TRIGGER update_group_chats_updated_at
BEFORE UPDATE ON public.group_chats
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_chat_messages_updated_at ON public.group_chat_messages;
CREATE TRIGGER update_group_chat_messages_updated_at
BEFORE UPDATE ON public.group_chat_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

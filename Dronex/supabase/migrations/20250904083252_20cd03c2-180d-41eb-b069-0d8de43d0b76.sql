-- Fix the infinite recursion in group_chats RLS policy
DROP POLICY IF EXISTS "Users can view group chats they're members of" ON group_chats;

-- Create the correct policy without recursion
CREATE POLICY "Users can view group chats they're members of" 
ON group_chats 
FOR SELECT 
USING (
  (auth.uid() = owner_id) OR 
  (EXISTS ( 
    SELECT 1 
    FROM group_chat_members 
    WHERE group_chat_members.group_id = group_chats.id 
      AND group_chat_members.user_id = auth.uid() 
      AND group_chat_members.is_active = true
  ))
);
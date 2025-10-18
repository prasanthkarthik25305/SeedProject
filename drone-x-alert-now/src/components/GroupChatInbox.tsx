// components/GroupChatInbox.tsx

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import EmergencyGroupChat from './EmergencyGroupChat';
import { Button } from '@/components/ui/button';
import { Plus, MessageCircle, Users, ChevronLeft, ChevronRight, Menu } from 'lucide-react';

// Helper function to avoid type inference issues
interface Profile {
  user_id: string;
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  try {
    const result = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .limit(1);
    return result.data?.[0]?.user_id || null;
  } catch {
    return null;
  }
}

interface Group {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

const GroupChatInbox = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Collapsible sidebar state

  useEffect(() => { loadUserGroups(); }, []);

  const loadUserGroups = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has any verified emergency contacts
      const { data: verifiedContacts } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id)
        .eq('verification_status', 'verified');

      // Auto-create a group if user has verified contacts but no group exists
      if (verifiedContacts && verifiedContacts.length > 0) {
        const { data: existingGroup } = await supabase
          .from('group_chats')
          .select('*')
          .eq('owner_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (!existingGroup) {
          // Create group automatically
          const { data: newGroup, error: createError } = await supabase
            .from('group_chats')
            .insert({
              name: 'Emergency Network',
              description: 'Your emergency contact group chat',
              owner_id: user.id,
              is_active: true
            })
            .select()
            .single();

          if (createError) throw createError;

          // Add verified contacts as members
          interface MemberToAdd {
            group_id: string;
            user_id: string;
            display_name: string;
            is_active: boolean;
          }
          
          const membersToAdd: MemberToAdd[] = [];
          for (const contact of verifiedContacts) {
            const userId = await findUserIdByEmail(contact.email);
            if (userId) {
              membersToAdd.push({
                group_id: newGroup.id,
                user_id: userId,
                display_name: contact.name,
                is_active: true
              });
            }
          }

          if (membersToAdd.length > 0) {
            await supabase.from('group_chat_members').insert(membersToAdd);
          }
        }
      }

      // Load all groups user is a member of or owns
      const { data: memberGroups } = await supabase
        .from('group_chat_members')
        .select('group_chats!inner(id, name, description, created_at)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const { data: ownedGroups } = await supabase
        .from('group_chats')
        .select('id, name, description, created_at')
        .eq('owner_id', user.id)
        .eq('is_active', true);

      // Combine and dedupe
      const allGroups = [...(memberGroups?.map(mg => mg.group_chats) || []), ...(ownedGroups || [])];
      const uniqueGroups = allGroups.filter(
        (group, i, self) => i === self.findIndex(g => g.id === group.id)
      );

      setGroups(uniqueGroups);
      if (uniqueGroups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(uniqueGroups[0].id);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewGroup = async () => {
    const name = prompt('Enter group name:');
    if (!name) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: newGroup, error } = await supabase
        .from('group_chats')
        .insert({ name, description: 'Emergency group', owner_id: user.id, is_active: true })
        .select()
        .single();
      if (error) throw error;

      // Add creator as member
      await supabase
        .from('group_chat_members')
        .insert({ group_id: newGroup.id, user_id: user.id, display_name: user.email || 'You', is_active: true });

      await loadUserGroups();
      setSelectedGroupId(newGroup.id);
    } catch (error) {
      alert('Failed to create group');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[700px] border rounded-lg overflow-hidden relative">
      {/* Collapsible Sidebar Toggle */}
      <Button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute top-4 left-4 z-10 h-8 w-8 p-0"
        variant="outline"
        size="sm"
      >
        {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Inbox Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 border-r bg-gray-50 flex flex-col overflow-hidden`}>
        <div className="p-4 pt-12 border-b bg-white flex items-center justify-between">
          <h3 className="font-semibold text-lg">Inbox</h3>
          <Button size="sm" onClick={createNewGroup}>
            <Plus className="h-4 w-4 mr-1" /> New Group
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {groups.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm mb-3">No group chats yet</p>
              <Button size="sm" onClick={createNewGroup}>Create Your First Group</Button>
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group.id}
                onClick={() => setSelectedGroupId(group.id)}
                className={`p-4 border-b cursor-pointer hover:bg-white transition-colors ${
                  selectedGroupId === group.id ? 'bg-blue-50 border-l-4 border-l-blue-500 font-medium' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm truncate">{group.name}</h4>
                    {group.description && <p className="text-xs text-muted-foreground mt-1 truncate">{group.description}</p>}
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {new Date(group.created_at).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white">
        {selectedGroupId ? (
          <EmergencyGroupChat chatId={selectedGroupId} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">Select a Group Chat</h3>
              <p className="text-sm">Choose a group from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupChatInbox;

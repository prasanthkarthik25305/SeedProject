import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, MessageCircle, Phone, Video, Users, Plus, Settings, Zap } from 'lucide-react';
import { ContactAvatar } from '@/components/ui/contact-avatar';
import { Database } from '@/types/database';
import { cn } from '@/lib/utils';
import EmergencyGroupChat from './EmergencyGroupChat';
import DirectChat from './DirectChat';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type EmergencyContact = Database['public']['Tables']['emergency_contacts']['Row'] & {
  profile?: {
    display_name?: string;
    avatar_url?: string;
    gender?: 'male' | 'female' | 'other';
    is_online?: boolean;
    last_seen?: string;
  };
  lastMessage?: {
    content: string;
    created_at: string;
    is_emergency: boolean;
    unread_count: number;
  };
};

interface InboxProps {
  onContactSelect?: (contact: EmergencyContact) => void;
}

export const Inbox: React.FC<InboxProps> = ({ onContactSelect }) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [groups, setGroups] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<EmergencyContact | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'contacts' | 'groups' | 'search'>('contacts');
  const [globalQuery, setGlobalQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ id: string; type: 'direct' | 'group'; snippet: string; at: string; groupId?: string; otherUserId?: string }>>([]);
  const { toast } = useToast();

  // UI state: New Group dialog and Preferences dialog
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefCompactList, setPrefCompactList] = useState<boolean>(() => localStorage.getItem('inbox.compact') === '1');
  const [prefShowOnline, setPrefShowOnline] = useState<boolean>(() => localStorage.getItem('inbox.showOnline') !== '0');

  useEffect(() => {
    fetchContacts();
    fetchGroups();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Fetch emergency contacts with basic info first
        const { data: contactsData, error: contactsError } = await supabase
          .from('emergency_contacts')
          .select('*')
          .eq('user_id', user.id)
          .eq('verification_status', 'verified')
          .order('priority', { ascending: true });

        if (contactsError) throw contactsError;

        // For each contact, get the last message
        const contactsWithMessages = await Promise.all(
          (contactsData || []).map(async (contact) => {
            let lastMessage = null;
            let unreadCount = 0;

            if (contact.contact_user_id) {
              // Try to get last message
              const { data: messageData } = await supabase
                .from('emergency_chat_messages')
                .select('content, created_at, is_emergency')
                .or(`and(sender_id.eq.${user.id},recipient_id.eq.${contact.contact_user_id}),and(sender_id.eq.${contact.contact_user_id},recipient_id.eq.${user.id})`)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              lastMessage = messageData;

              // Get unread count
              const { count } = await supabase
                .from('emergency_chat_messages')
                .select('*', { count: 'exact' })
                .eq('sender_id', contact.contact_user_id)
                .eq('recipient_id', user.id)
                .neq('status', 'read');

              unreadCount = count || 0;
            }

            return {
              ...contact,
              lastMessage: lastMessage ? {
                ...lastMessage,
                unread_count: unreadCount
              } : undefined
            };
          })
        );

        setContacts(contactsWithMessages);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from('group_chat_members')
          .select('group_id, group_chats!inner(id, name, description)')
          .eq('user_id', user.id);
          
        if (data) {
          setGroups(data.map(x => x.group_chats));
        }
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.profile?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone.includes(searchQuery)
  );

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ensureContactLinked = async (contact: EmergencyContact): Promise<EmergencyContact> => {
    try {
      if (contact.contact_user_id || !contact.email || !contact.id) return contact;
      // Use secure RPC to resolve auth.users by email
      const { data: userId } = await supabase.rpc('find_user_id_by_email', { p_email: contact.email });
      if (userId) {
        await supabase
          .from('emergency_contacts')
          .update({ contact_user_id: userId })
          .eq('id', contact.id);
        const updated = { ...contact, contact_user_id: userId } as EmergencyContact;
        setContacts(prev => prev.map(c => (c.id === contact.id ? updated : c)));
        return updated;
      }
    } catch (_) {}
    return contact;
  };

  const handleContactSelect = async (contact: EmergencyContact) => {
    const linked = await ensureContactLinked(contact);
    setSelectedContact(linked);
    setSelectedGroupId(null);
    onContactSelect?.(linked);
  };

  const handleGroupSelect = (groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectedContact(null);
  };

  const runGlobalSearch = async () => {
    const q = globalQuery.trim();
    if (!q) { setSearchResults([]); return; }
    try {
      setSearching(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Direct messages involving the user
      const { data: dm } = await supabase
        .from('emergency_chat_messages')
        .select('id, sender_id, recipient_id, content, created_at')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .ilike('content', `%${q}%`)
        .order('created_at', { ascending: false })
        .limit(25);

      // Group messages for groups the user is member of
      const groupIds = groups.map(g => g.id);
      let gm: any[] = [];
      if (groupIds.length > 0) {
        const { data } = await supabase
          .from('group_chat_messages')
          .select('id, group_id, sender_id, content, created_at')
          .in('group_id', groupIds)
          .ilike('content', `%${q}%`)
          .order('created_at', { ascending: false })
          .limit(25);
        gm = data || [];
      }

      const results: Array<{ id: string; type: 'direct' | 'group'; snippet: string; at: string; groupId?: string; otherUserId?: string }> = [];
      (dm || []).forEach(m => {
        const otherUserId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
        results.push({ id: m.id, type: 'direct', snippet: m.content || '', at: m.created_at, otherUserId });
      });
      gm.forEach(m => {
        results.push({ id: m.id, type: 'group', snippet: m.content || '', at: m.created_at, groupId: m.group_id });
      });

      setSearchResults(results.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()));
    } finally {
      setSearching(false);
    }
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const truncateMessage = (content: string, maxLength: number = 50) => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([fetchContacts(), fetchGroups()]);
    setLoading(false);
  };

  const openNewGroup = () => {
    setNewGroupName('');
    setNewGroupDesc('');
    setSelectedMemberIds([]);
    setShowNewGroup(true);
  };

  const createGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: newGroup, error } = await supabase
        .from('group_chats')
        .insert({ name, description: newGroupDesc || 'Emergency group', owner_id: user.id, is_active: true })
        .select()
        .single();
      if (error) throw error;

      // Build member list: creator + selected members that have user_id
      const membersToAdd = [
        { group_id: newGroup.id, user_id: user.id, display_name: 'You', is_active: true }
      ] as Array<{ group_id: string; user_id: string; display_name: string; is_active: boolean }>;

      contacts
        .filter(c => !!c.contact_user_id && selectedMemberIds.includes(c.id as string))
        .forEach(c => {
          membersToAdd.push({
            group_id: newGroup.id,
            user_id: c.contact_user_id as string,
            display_name: c.name || 'Member',
            is_active: true
          });
        });

      if (membersToAdd.length > 0) {
        await supabase.from('group_chat_members').insert(membersToAdd);
      }

      await fetchGroups();
      setSelectedGroupId(newGroup.id);
      setShowNewGroup(false);
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to create group', variant: 'destructive' });
    }
  };

  const savePreferences = () => {
    localStorage.setItem('inbox.compact', prefCompactList ? '1' : '0');
    localStorage.setItem('inbox.showOnline', prefShowOnline ? '1' : '0');
    setShowPrefs(false);
  };

  return (
    <div className="flex h-[700px]">
      {/* Sidebar */}
      <div className={`w-80 border-r bg-white flex flex-col ${prefCompactList ? 'text-sm' : ''}`}
      >
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-sky-50 to-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg text-gray-900">Messages</h2>
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="outline" className="border-sky-200" onClick={openNewGroup}>
                <Users className="h-4 w-4 mr-1" />
                New Group
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="border-sky-200">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Settings</DropdownMenuLabel>
                  <DropdownMenuItem onClick={openNewGroup}>
                    <Users className="h-4 w-4 mr-2"/> New Group
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={refreshAll}>Refresh</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowPrefs(true)}>Preferences</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-sky-200 focus:border-sky-400"
            />
          </div>
          
          {/* Tabs */}
          <div className="flex mt-3 space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('contacts')}
              className={cn(
                "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                activeTab === 'contacts'
                  ? "bg-white text-sky-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Contacts
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={cn(
                "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                activeTab === 'groups'
                  ? "bg-white text-sky-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Groups
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={cn(
                "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                activeTab === 'search'
                  ? "bg-white text-sky-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Search
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-gray-500">
              Loading conversations...
            </div>
          ) : activeTab === 'contacts' ? (
            filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No conversations yet</p>
                <p className="text-sm">Start a conversation with your emergency contacts</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleContactSelect(contact)}
                    className={cn(
                      "flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors",
                      selectedContact?.id === contact.id && "bg-sky-50 border-r-2 border-sky-500"
                    )}
                  >
                    <ContactAvatar
                      photoUrl={contact.photo_url || contact.profile?.avatar_url}
                      name={contact.profile?.display_name || contact.name}
                      size="md"
                      gender={contact.gender || contact.profile?.gender}
                      isOnline={contact.profile?.is_online}
                      isMutual={contact.is_mutual}
                      showOnlineStatus={true}
                    />

                    <div className="flex-1 min-w-0 ml-3">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {contact.profile?.display_name || contact.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {contact.lastMessage && (
                            <span className="text-xs text-gray-500">
                              {formatMessageTime(contact.lastMessage.created_at)}
                            </span>
                          )}
                          {contact.lastMessage?.unread_count > 0 && (
                            <Badge className="bg-sky-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full">
                              {contact.lastMessage.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          {contact.lastMessage ? (
                            <div className="flex items-center space-x-2">
                              {contact.lastMessage.is_emergency && (
                                <Zap className="h-3 w-3 text-red-500 flex-shrink-0" />
                              )}
                              <p className={cn(
                                "text-sm truncate",
                                contact.lastMessage.is_emergency 
                                  ? "text-red-600 font-medium"
                                  : "text-gray-600"
                              )}>
                                {truncateMessage(contact.lastMessage.content)}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">
                              {contact.profile?.is_online ? 'Online' : `Last seen ${formatLastSeen(contact.profile?.last_seen)}`}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center space-x-1 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-green-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`tel:${contact.phone}`, '_self');
                            }}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'search' ? (
            <div className="p-3 space-y-3">
              <div className="flex gap-2">
                <Input placeholder="Search across all chats" value={globalQuery} onChange={(e) => setGlobalQuery(e.target.value)} />
                <Button onClick={runGlobalSearch} disabled={searching || !globalQuery.trim()}>Search</Button>
              </div>
              {searching ? (
                <div className="p-6 text-center text-gray-500">Searching…</div>
              ) : searchResults.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No results</div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((r) => (
                    <div key={`${r.type}-${r.id}`} className="p-3 border rounded hover:bg-gray-50 cursor-pointer" onClick={async () => {
                      if (r.type === 'group' && r.groupId) {
                        setActiveTab('groups');
                        handleGroupSelect(r.groupId);
                      } else if (r.type === 'direct' && r.otherUserId) {
                        // find a contact with this other user id
                        const contact = contacts.find(c => c.contact_user_id === r.otherUserId);
                        if (contact) {
                          setActiveTab('contacts');
                          await handleContactSelect(contact);
                        } else {
                          toast({ title: 'Contact not found', description: 'Result refers to a user not in your verified contacts.' });
                        }
                      }
                    }}>
                      <div className="text-xs text-muted-foreground">{new Date(r.at).toLocaleString()}</div>
                      <div className="text-sm line-clamp-2">{r.snippet}</div>
                      <div className="text-xs mt-1">{r.type === 'group' ? 'Group message' : 'Direct message'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Groups tab
            filteredGroups.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No groups yet</p>
                <p className="text-sm">Create a group to start group conversations</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredGroups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => handleGroupSelect(group.id)}
                    className={cn(
                      "flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors",
                      selectedGroupId === group.id && "bg-sky-50 border-r-2 border-sky-500"
                    )}
                  >
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0 ml-3">
                      <h3 className="font-medium text-gray-900 truncate">{group.name}</h3>
                      {group.description && (
                        <p className="text-sm text-gray-600 truncate">{group.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex">
        {selectedGroupId ? (
          <EmergencyGroupChat chatId={selectedGroupId} />
        ) : selectedContact ? (
          selectedContact.contact_user_id ? (
            <DirectChat contact={selectedContact} onMessagesRead={fetchContacts} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-medium mb-2">
                  Chat with {selectedContact.profile?.display_name || selectedContact.name}
                </h3>
                <p className="text-sm">This contact is not connected to a user yet.</p>
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-medium mb-2">Select a conversation</h3>
              <p className="text-sm">Choose a contact or group to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* New Group Dialog */}
      <Dialog open={showNewGroup} onOpenChange={setShowNewGroup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>Select verified contacts to add.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Group name" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
            <Input placeholder="Description (optional)" value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} />
            <div className="max-h-64 overflow-y-auto border rounded">
              {contacts.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">No verified contacts</div>
              ) : (
                contacts.map(c => (
                  <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-accent/50 cursor-pointer">
                    <Checkbox
                      checked={selectedMemberIds.includes(c.id as string)}
                      onCheckedChange={(checked) => {
                        const id = c.id as string;
                        setSelectedMemberIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
                      }}
                      disabled={!c.contact_user_id}
                    />
                    <ContactAvatar
                      name={c.profile?.display_name || c.name}
                      photoUrl={c.photo_url || c.profile?.avatar_url}
                      size={28}
                      gender={c.gender || c.profile?.gender}
                      showOnlineStatus={c.profile?.is_online}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{c.profile?.display_name || c.name}</div>
                      {!c.contact_user_id && (
                        <div className="text-[11px] text-muted-foreground">Cannot add - not connected</div>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewGroup(false)}>Cancel</Button>
            <Button onClick={createGroup} disabled={!newGroupName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preferences Dialog */}
      <Dialog open={showPrefs} onOpenChange={setShowPrefs}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inbox Preferences</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <Checkbox checked={prefCompactList} onCheckedChange={(v) => setPrefCompactList(Boolean(v))} />
              <span className="text-sm">Compact list density</span>
            </label>
            <label className="flex items-center gap-3">
              <Checkbox checked={prefShowOnline} onCheckedChange={(v) => setPrefShowOnline(Boolean(v))} />
              <span className="text-sm">Show online status</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrefs(false)}>Close</Button>
            <Button onClick={savePreferences}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inbox;

// New Group Dialog and Preferences Dialog JSX blocks
// Placed after default export would not render; append above return? Instead, include Dialogs within component return.

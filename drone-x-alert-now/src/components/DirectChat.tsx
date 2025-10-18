import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContactAvatar } from '@/components/ui/contact-avatar';
import { supabase } from '@/integrations/supabase/client';
import { Send, MessageCircle, Wifi, WifiOff, Paperclip, Check, CheckCheck, Image as ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Database } from '@/types/database';

interface DirectChatProps {
  contact: Database['public']['Tables']['emergency_contacts']['Row'] & {
    profile?: {
      display_name?: string;
      avatar_url?: string;
      gender?: 'male' | 'female' | 'other';
      is_online?: boolean;
    }
  };
  onMessagesRead?: () => void;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  is_emergency?: boolean;
  status?: string | null;
}

const DirectChat: React.FC<DirectChatProps> = ({ contact, onMessagesRead }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' && window.navigator.onLine);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [peerOnline, setPeerOnline] = useState(false);
  const [peerOnlineApp, setPeerOnlineApp] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
    loadMessages();
    // simple polling for now; can be replaced with Realtime later
    const id = setInterval(loadMessages, 10000);
    return () => { clearInterval(id); };
  }, []);

  // Realtime subscriptions only after both IDs are known
  useEffect(() => {
    if (!currentUserId || !contact?.contact_user_id) {
      return;
    }

    const key = [currentUserId, contact.contact_user_id].sort().join('-');

    // Messages changes for this DM
    const channel = supabase.channel('dc-'.concat(key))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'emergency_chat_messages',
        filter: `or(and(sender_id.eq.${currentUserId},recipient_id.eq.${contact.contact_user_id}),and(sender_id.eq.${contact.contact_user_id},recipient_id.eq.${currentUserId}))`,
      }, () => { loadMessages(); })
      .subscribe();

    // Typing indicator broadcast channel
    const typingChannel = supabase.channel(`typing-${key}`, { config: { broadcast: { ack: false }}})
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        if (payload?.payload?.userId && payload.payload.userId !== currentUserId) {
          setPeerTyping(true);
          window.clearTimeout((window as any).__dc_peer_typing);
          (window as any).__dc_peer_typing = window.setTimeout(() => setPeerTyping(false), 1200);
        }
      })
      .subscribe();

    // Presence channel to detect peer online status for this DM
    const presenceKey = `presence-dm-${key}`;
    const presenceChannel = supabase.channel(presenceKey, { config: { presence: { key: currentUserId } } });

    presenceChannel.on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      const keys = Object.keys(state || {});
      setPeerOnline(keys.length > 1);
    });

    let presenceHeartbeat: number | undefined;

    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try { await presenceChannel.track({ at: Date.now() }); } catch {}
        // re-track every 20s as heartbeat
        presenceHeartbeat = window.setInterval(() => {
          try { presenceChannel.track({ at: Date.now() }); } catch {}
        }, 20000);
      }
    });

    // Global app presence read-only channel
    const appPresence = supabase.channel('presence-app', { config: { presence: { key: currentUserId } } });
    appPresence.on('presence', { event: 'sync' }, () => {
      const state = appPresence.presenceState() as Record<string, any>;
      setPeerOnlineApp(Boolean(state && (contact.contact_user_id as string) in state));
    });
    appPresence.subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(typingChannel);
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(appPresence);
      if (presenceHeartbeat) window.clearInterval(presenceHeartbeat);
      setPeerOnline(false);
      setPeerOnlineApp(false);
    };
  }, [currentUserId, contact?.contact_user_id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !contact?.contact_user_id) { setMessages([]); setLoading(false); return; }

      const { data } = await supabase
        .from('emergency_chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${contact.contact_user_id}),and(sender_id.eq.${contact.contact_user_id},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .limit(200);

      setMessages((data || []) as unknown as ChatMessage[]);

      // Mark incoming unread messages as read
      await supabase
        .from('emergency_chat_messages')
        .update({ status: 'read' })
        .eq('sender_id', contact.contact_user_id as string)
        .eq('recipient_id', user.id)
        .neq('status', 'read');
      onMessagesRead?.();
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    const text = newMessage.trim();
    if (!text && !selectedFile) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !contact?.contact_user_id) return;

    let finalContent = text;
    if (selectedFile) {
      try {
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('chat-files').upload(filePath, selectedFile);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(filePath);
          const url = urlData.publicUrl;
          finalContent = text ? `${text}\n${url}` : url; // embed URL in content to avoid schema changes
        }
      } catch {
        // ignore upload failure; still send text if any
      }
    }

    await supabase.from('emergency_chat_messages').insert({
      sender_id: user.id,
      recipient_id: contact.contact_user_id,
      content: finalContent,
      is_emergency: false,
      status: 'sent'
    });
    setNewMessage('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    await loadMessages();
  };

  const displayName = contact.profile?.display_name || contact.name || 'Contact';

  return (
    <Card className="flex flex-col h-[700px]">
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ContactAvatar
              name={displayName}
              photoUrl={contact.photo_url || contact.profile?.avatar_url}
              gender={contact.gender || contact.profile?.gender}
              size={36}
              showOnlineStatus={contact.profile?.is_online}
            />
            <span className="truncate">{displayName}</span>
            {isOnline ? <Wifi className="h-4 w-4 text-green-500"/> : <WifiOff className="h-4 w-4 text-red-500"/>}
          </div>
          <Badge variant={(peerOnline || peerOnlineApp) ? 'default' : 'secondary'} className="text-xs">
            {peerTyping ? 'typing…' : ((peerOnline || peerOnlineApp) ? 'Online' : 'Offline')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 p-4">
        {/* Per-chat search */}
        <div className="mb-2">
          <Input placeholder="Search in chat" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Loading chat...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-10">
            <MessageCircle className="w-16 h-16 mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">No messages</h3>
            <p className="text-sm">Say hello to start chatting</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 p-2">
            {messages
              .filter((m) => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((m) => {
                const isMine = m.sender_id === currentUserId;
                const tick = m.status === 'read' ? <CheckCheck className="inline h-3 w-3 ml-1" /> : <Check className="inline h-3 w-3 ml-1" />;
                // basic link/preview detection for images
                const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(m.content || '');
                const isUrl = /https?:\/\//i.test(m.content || '');
                return (
                  <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs rounded-xl px-3 py-2 shadow border ${isMine ? 'bg-blue-500 text-white border-blue-600' : 'bg-white text-gray-900 border-gray-200'}`}>
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {isUrl && !m.content?.includes('\n') ? (
                          <a href={m.content!} target="_blank" rel="noopener noreferrer" className={isMine ? 'underline text-white' : 'underline text-blue-600'}>
                            {m.content}
                          </a>
                        ) : (
                          m.content
                        )}
                        {isUrl && isImage && (
                          <div className="mt-2">
                            {/* image preview */}
                            <img src={m.content!} alt="shared" className="max-w-[220px] rounded" />
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] opacity-70 text-right mt-1 flex items-center justify-end">
                        {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                        {isMine && tick}
                      </div>
                    </div>
                  </div>
                );
              })}
            <div ref={messagesEndRef} />
          </div>
        )}

        <div className="space-y-2">
          {/* Selected file chip */}
          {selectedFile && (
            <div className="text-xs border rounded px-2 py-1 inline-flex items-center gap-2">
              <ImageIcon className="h-3 w-3" /> {selectedFile.name}
              <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => setSelectedFile(null)}>x</Button>
            </div>
          )}
          <Textarea
            placeholder={isOnline ? 'Type a message' : 'Offline'}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              setIsTyping(true);
              // local typing indicator timeout
              window.clearTimeout((window as any).__dc_typing);
              (window as any).__dc_typing = window.setTimeout(() => setIsTyping(false), 1200);
              // broadcast typing
              try {
                const a = currentUserId || 'me';
                const b = contact?.contact_user_id || 'peer';
                const typingKey = [a, b].sort().join('-');
                supabase.channel(`typing-${typingKey}`, { config: { broadcast: { ack: false }}})
                  .send({ type: 'broadcast', event: 'typing', payload: { userId: currentUserId } });
              } catch {}
            }}
            className="resize-none min-h-[56px]"
            disabled={!isOnline}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*,application/pdf,application/zip,text/plain" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={!isOnline}>
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={sendMessage} disabled={(!newMessage.trim() && !selectedFile) || !isOnline}>
              <Send className="h-4 w-4 mr-1"/> Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DirectChat;

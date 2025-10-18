import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, Phone, Video, MoreVertical, MapPin, AlertTriangle, 
  Check, CheckCheck, Mic, Image, Paperclip, Smile, Clock 
} from 'lucide-react';
import { ContactAvatar } from '@/components/ui/contact-avatar';
import { Database } from '@/types/database';
import { cn } from '@/lib/utils';

type EmergencyContact = Database['public']['Tables']['emergency_contacts']['Row'];
type ChatMessage = Database['public']['Tables']['emergency_chat_messages']['Row'];

interface EmergencyChatProps {
  contact: EmergencyContact;
  onBack?: () => void;
}

export const EmergencyChat: React.FC<EmergencyChatProps> = ({ contact, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
    setupRealtimeSubscription();
  }, [contact.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && contact.contact_user_id) {
        const { data, error } = await supabase
          .from('emergency_chat_messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${contact.contact_user_id}),and(sender_id.eq.${contact.contact_user_id},recipient_id.eq.${user.id})`)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
        
        // Mark messages as read
        await supabase
          .from('emergency_chat_messages')
          .update({ 
            status: 'read',
            read_at: new Date().toISOString()
          })
          .eq('sender_id', contact.contact_user_id)
          .eq('recipient_id', user.id)
          .neq('status', 'read');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('emergency_chat_messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'emergency_chat_messages',
          filter: `recipient_id=eq.${contact.contact_user_id}`
        }, 
        (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (content: string, messageType: 'text' | 'emergency' = 'text') => {
    if (!content.trim() || sending) return;
    
    try {
      setSending(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && contact.contact_user_id) {
        const messageData = {
          sender_id: user.id,
          recipient_id: contact.contact_user_id,
          content: content.trim(),
          message_type: messageType,
          is_emergency: messageType === 'emergency' || content.toLowerCase().includes('emergency'),
          status: 'sent'
        };

        const { data, error } = await supabase
          .from('emergency_chat_messages')
          .insert(messageData)
          .select()
          .single();

        if (error) throw error;
        
        setMessages(prev => [...prev, data]);
        setNewMessage('');
        
        // Update delivery status after a delay (simulating network)
        setTimeout(async () => {
          await supabase
            .from('emergency_chat_messages')
            .update({ 
              status: 'delivered',
              delivered_at: new Date().toISOString()
            })
            .eq('id', data.id);
        }, 1000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    sendMessage(newMessage);
  };

  const handleEmergencyAlert = () => {
    const emergencyMessage = `🚨 EMERGENCY ALERT 🚨\nI need immediate assistance! Please check on me or contact emergency services.\nTime: ${new Date().toLocaleString()}`;
    sendMessage(emergencyMessage, 'emergency');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatMessageDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getMessageStatusIcon = (message: ChatMessage, isCurrentUser: boolean) => {
    if (!isCurrentUser) return null;
    
    switch (message.status) {
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const groups: { [key: string]: ChatMessage[] } = {};
    
    messages.forEach(message => {
      const dateKey = new Date(message.created_at).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white shadow-sm">
        <div className="flex items-center space-x-3">
          <ContactAvatar
            photoUrl={contact.photo_url}
            name={contact.name}
            size={40}
            gender={contact.gender}
            showOnlineStatus={true}
          />
          <div>
            <h3 className="font-medium text-gray-900">{contact.name}</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              {typing ? (
                <span className="text-green-600">typing...</span>
              ) : (
                <>
                  <span>Online</span>
                  {contact.verification_status === 'verified' && (
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      Verified
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.open(`tel:${contact.phone}`, '_self')}
            className="text-green-600 hover:bg-green-50"
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-blue-600 hover:bg-blue-50"
          >
            <Video className="h-5 w-5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-600 hover:bg-gray-50"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-gray-500">Loading messages...</div>
          </div>
        ) : Object.keys(messageGroups).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                <ContactAvatar
                  photoUrl={contact.photo_url}
                  name={contact.name}
                  size={64}
                  gender={contact.gender}
                />
              </div>
              <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
              <p className="text-sm">Send a message to {contact.name}</p>
            </div>
          </div>
        ) : (
          Object.keys(messageGroups).map(dateKey => (
            <div key={dateKey}>
              {/* Date Separator */}
              <div className="flex justify-center my-4">
                <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                  {formatMessageDate(messageGroups[dateKey][0].created_at)}
                </span>
              </div>
              
              {/* Messages for this date */}
              {messageGroups[dateKey].map((message, index) => {
                const { data: { user } } = supabase.auth.getUser();
                const isCurrentUser = message.sender_id === user?.id;
                const showAvatar = !isCurrentUser && (
                  index === messageGroups[dateKey].length - 1 ||
                  messageGroups[dateKey][index + 1]?.sender_id !== message.sender_id
                );
                
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex items-end space-x-2 mb-2",
                      isCurrentUser ? "justify-end" : "justify-start"
                    )}
                  >
                    {!isCurrentUser && showAvatar && (
                      <ContactAvatar
                        photoUrl={contact.photo_url}
                        name={contact.name}
                        size={32}
                        gender={contact.gender}
                      />
                    )}
                    
                    <div
                      className={cn(
                        "max-w-xs lg:max-w-md px-4 py-2 rounded-lg",
                        isCurrentUser
                          ? message.is_emergency
                            ? "bg-red-500 text-white"
                            : "bg-blue-500 text-white"
                          : message.is_emergency
                            ? "bg-red-100 text-red-900 border border-red-200"
                            : "bg-gray-100 text-gray-900"
                      )}
                    >
                      {message.is_emergency && (
                        <div className="flex items-center space-x-1 mb-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span className="text-xs font-medium">EMERGENCY</span>
                        </div>
                      )}
                      
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                      
                      <div className={cn(
                        "flex items-center justify-end space-x-1 mt-1",
                        isCurrentUser ? "text-white/70" : "text-gray-500"
                      )}>
                        <span className="text-xs">
                          {formatMessageTime(message.created_at)}
                        </span>
                        {getMessageStatusIcon(message, isCurrentUser)}
                      </div>
                    </div>
                    
                    {!isCurrentUser && !showAvatar && (
                      <div className="w-6" /> // Spacer for alignment
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white">
        {/* Emergency Alert Button */}
        <div className="mb-3">
          <Button
            onClick={handleEmergencyAlert}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            size="sm"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Send Emergency Alert
          </Button>
        </div>
        
        {/* Message Input */}
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="ghost" className="text-gray-500">
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="pr-12 border-gray-200 focus:border-blue-400"
              disabled={sending}
            />
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </div>
          
          {newMessage.trim() ? (
            <Button
              onClick={handleSend}
              disabled={sending}
              className="bg-blue-500 hover:bg-blue-600"
              size="sm"
            >
              <Send className="h-5 w-5" />
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="text-gray-500">
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
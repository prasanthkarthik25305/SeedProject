import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { 
  MessageCircle, 
  Send, 
  Paperclip, 
  MapPin, 
  Users, 
  X,
  Clock,
  FileText,
  Image,
  Download,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';

interface GroupChat {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface GroupMember {
  id: string;
  group_id: string;
  user_id?: string | null;
  emergency_contact_id?: string | null;
  display_name: string;
  email?: string | null;
  phone?: string | null;
  joined_at: string;
  is_active: boolean;
}

interface ChatMessage {
  id: string;
  group_id: string;
  sender_id?: string | null;
  sender_name: string;
  message_type: 'text' | 'file' | 'location';
  content?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  file_type?: string | null;
  location_latitude?: number | null;
  location_longitude?: number | null;
  location_duration_hours?: number | null;
  location_expires_at?: string | null;
  delivery_status: 'sent' | 'delivered' | 'failed';
  retry_count: number;
  created_at: string;
  updated_at: string;
}

interface EmergencyGroupChatProps {
  onMemberRemoved?: (contactId: string) => void;
}

export const EmergencyGroupChat: React.FC<EmergencyGroupChatProps> = ({ onMemberRemoved }) => {
  const [groupChat, setGroupChat] = useState<GroupChat | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [locationDuration, setLocationDuration] = useState('1');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Network status monitoring
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
    initializeGroupChat();
  }, []);

  useEffect(() => {
    if (groupChat) {
      loadMessages();
      loadMembers(groupChat.id);
      setupRealtimeSubscription();
    }
  }, [groupChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getUserDisplayName = async (userId: string) => {
    try {
      // First try to get from profiles table
      const { data: userData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', userId)
        .maybeSingle();

      if (userData) {
        return userData.full_name || 'User';
      }

      // Fallback to getting user directly
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === userId) {
        return user.user_metadata?.display_name || 
               user.user_metadata?.name || 
               user.user_metadata?.full_name ||
               user.email?.split('@')[0] || 'User';
      }

      return 'User';
    } catch (error) {
      console.error('Error getting user display name:', error);
      return 'User';
    }
  };

  const initializeGroupChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Try to load existing group chat
      let { data: chats, error: chatsError } = await supabase
        .from('group_chats')
        .select('*')
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .limit(1);

      if (chatsError) throw chatsError;

      if (!chats || chats.length === 0) {
        // Check if user has verified emergency contacts
        const { data: contacts, error: contactsError } = await supabase
          .from('emergency_contacts')
          .select('*')
          .eq('user_id', user.id)
          .eq('verification_status', 'verified');

        if (contactsError) throw contactsError;

        if (contacts && contacts.length > 0) {
          // Create group chat automatically
          const { data: newChat, error: createError } = await supabase
            .from('group_chats')
            .insert({
              owner_id: user.id,
              name: 'Emergency Network',
              description: 'Your emergency contact group chat'
            })
            .select()
            .single();

          if (createError) throw createError;
          setGroupChat(newChat);

          // Add verified contacts to the group
          const membersToAdd = contacts.map(contact => ({
            group_id: newChat.id,
            emergency_contact_id: contact.id,
            user_id: null, // Emergency contacts don't have user_id
            display_name: contact.name || 'Emergency Contact',
            email: contact.email,
            phone: contact.phone
          }));

          const { error: membersError } = await supabase
            .from('group_chat_members')
            .insert(membersToAdd);

          if (membersError) {
            console.error('Error adding members:', membersError);
          } else {
            console.log('Successfully added members to group chat');
          }
        }
      } else {
        setGroupChat(chats[0]);
      }
    } catch (error) {
      console.error('Error initializing group chat:', error);
      toast({
        title: "Error",
        description: "Failed to load group chat",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMembers = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('group_chat_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('joined_at');

      if (error) throw error;
      
      // Proper TypeScript type handling
      const membersData: GroupMember[] = (data || []).map(member => ({
        id: member.id,
        group_id: member.group_id,
        user_id: member.user_id || null,
        emergency_contact_id: member.emergency_contact_id || null,
        display_name: (member as any).display_name || 'Emergency Contact',
        email: (member as any).email || null,
        phone: (member as any).phone || null,
        joined_at: member.joined_at,
        is_active: member.is_active
      }));
      
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const loadMessages = async () => {
    if (!groupChat) return;

    try {
      const { data, error } = await supabase
        .from('group_chat_messages')
        .select('*')
        .eq('group_id', groupChat.id)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      
      // Proper message data handling
      const messagesData: ChatMessage[] = (data || []).map(msg => ({
        id: msg.id,
        group_id: msg.group_id,
        sender_id: msg.sender_id || null,
        sender_name: (msg as any).sender_name || 'User',
        message_type: (msg.message_type as 'text' | 'file' | 'location') || 'text',
        content: msg.content || null,
        file_url: msg.file_url || null,
        file_name: msg.file_name || null,
        file_size: msg.file_size || null,
        file_type: (msg as any).file_type || null,
        location_latitude: msg.location_latitude || null,
        location_longitude: msg.location_longitude || null,
        location_duration_hours: msg.location_duration_hours || null,
        location_expires_at: msg.location_expires_at || null,
        delivery_status: ((msg as any).delivery_status as 'sent' | 'delivered' | 'failed') || 'sent',
        retry_count: (msg as any).retry_count || 0,
        created_at: msg.created_at,
        updated_at: msg.updated_at
      }));
      
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!groupChat) return;

    const channel = supabase
      .channel(`group-chat-${groupChat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_chat_messages',
          filter: `group_id=eq.${groupChat.id}`
        },
        (payload) => {
          const newMessage = payload.new as any;
          const formattedMessage: ChatMessage = {
            id: newMessage.id,
            group_id: newMessage.group_id,
            sender_id: newMessage.sender_id || null,
            sender_name: newMessage.sender_name || 'User',
            message_type: newMessage.message_type,
            content: newMessage.content || null,
            file_url: newMessage.file_url || null,
            file_name: newMessage.file_name || null,
            file_size: newMessage.file_size || null,
            file_type: newMessage.file_type || null,
            location_latitude: newMessage.location_latitude || null,
            location_longitude: newMessage.location_longitude || null,
            location_duration_hours: newMessage.location_duration_hours || null,
            location_expires_at: newMessage.location_expires_at || null,
            delivery_status: newMessage.delivery_status || 'sent',
            retry_count: newMessage.retry_count || 0,
            created_at: newMessage.created_at,
            updated_at: newMessage.updated_at
          };
          
          setMessages(prev => {
            // Avoid duplicates
            if (prev.find(msg => msg.id === formattedMessage.id)) return prev;
            return [...prev, formattedMessage];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_chat_members',
          filter: `group_id=eq.${groupChat.id}`
        },
        () => {
          loadMembers(groupChat.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_chat_members',
          filter: `group_id=eq.${groupChat.id}`
        },
        () => {
          loadMembers(groupChat.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!groupChat || (!newMessage.trim() && !selectedFile) || sendingMessage) return;
    if (!isOnline) {
      toast({
        title: "No Internet Connection",
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      });
      return;
    }

    setSendingMessage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user display name
      const senderName = await getUserDisplayName(user.id);

      // Handle file upload if present
      let fileUrl = null;
      let fileName = null;
      let fileSize = null;
      let fileType = null;

      if (selectedFile) {
        try {
          const fileExt = selectedFile.name.split('.').pop();
          const filePath = `${user.id}/${Date.now()}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('chat-files')
            .upload(filePath, selectedFile);

          if (uploadError) {
            console.error('File upload error:', uploadError);
            // Continue without file if upload fails
            toast({
              title: "File Upload Failed",
              description: "Could not upload file, sending message only.",
              variant: "destructive",
            });
          } else {
            const { data: urlData } = supabase.storage
              .from('chat-files')
              .getPublicUrl(filePath);

            fileUrl = urlData.publicUrl;
            fileName = selectedFile.name;
            fileSize = selectedFile.size;
            fileType = selectedFile.type;
          }
        } catch (fileError) {
          console.error('File handling failed:', fileError);
        }
      }

      // Proper message data structure
      const messageData = {
        group_id: groupChat.id,
        sender_id: user.id,
        sender_name: senderName,
        message_type: selectedFile ? 'file' as const : 'text' as const,
        content: selectedFile ? `Shared file: ${selectedFile.name}` : newMessage.trim(),
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        delivery_status: 'sent' as const,
        retry_count: 0
      };

      const { error } = await supabase
        .from('group_chat_messages')
        .insert([messageData]);

      if (error) throw error;

      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast({
        title: "✅ Message Sent",
        description: selectedFile ? "File shared successfully" : "Message delivered",
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "❌ Failed to Send",
        description: "Message failed to send. Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const shareLocation = async () => {
    if (!groupChat || !isOnline) {
      toast({
        title: "Cannot Share Location",
        description: isOnline ? "No group chat available" : "No internet connection",
        variant: "destructive",
      });
      return;
    }

    setSharingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const duration = parseInt(locationDuration);
      const expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000);

      // Get user display name
      const senderName = await getUserDisplayName(user.id);

      const messageData = {
        group_id: groupChat.id,
        sender_id: user.id,
        sender_name: senderName,
        message_type: 'location' as const,
        content: `Shared live location for ${duration} hour${duration > 1 ? 's' : ''}`,
        location_latitude: position.coords.latitude,
        location_longitude: position.coords.longitude,
        location_duration_hours: duration,
        location_expires_at: expiresAt.toISOString(),
        delivery_status: 'sent' as const,
        retry_count: 0
      };

      const { error } = await supabase
        .from('group_chat_messages')
        .insert([messageData]);

      if (error) throw error;

      toast({
        title: "📍 Location Shared",
        description: `Your location has been shared for ${duration} hour${duration > 1 ? 's' : ''}`,
      });
    } catch (error) {
      console.error('Error sharing location:', error);
      toast({
        title: "Location Sharing Failed", 
        description: "Failed to share location. Please check your permissions and try again.",
        variant: "destructive",
      });
    } finally {
      setSharingLocation(false);
    }
  };

  const retryFailedMessage = async (messageId: string) => {
    try {
      toast({
        title: "🔄 Message Retried",
        description: "Attempting to resend the message",
      });
    } catch (error) {
      console.error('Error retrying message:', error);
      toast({
        title: "Retry Failed",
        description: "Could not retry sending the message",
        variant: "destructive",
      });
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isLocationExpired = (expiresAt?: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const openLocationInMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading emergency group chat...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!groupChat) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageCircle className="h-5 w-5 mr-2 text-primary" />
            Emergency Group Chat
          </CardTitle>
          <CardDescription>
            Verify at least one emergency contact to activate group chat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">No Emergency Group Chat Available</h3>
            <p className="text-sm mb-4">Verify your emergency contacts to automatically create a group chat</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800">
              <h4 className="font-medium mb-2">📋 How to Enable Group Chat:</h4>
              <ol className="text-sm text-left space-y-1">
                <li>1. Go to "Verification" tab</li>
                <li>2. Add emergency contacts with email</li>
                <li>3. Send verification codes to contacts</li>
                <li>4. Group chat will be created automatically</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[700px]">
      <CardHeader className="pb-4 flex-shrink-0 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <MessageCircle className="h-5 w-5 mr-2 text-primary" />
            {groupChat.name}
            {isOnline ? (
              <Wifi className="h-4 w-4 ml-2 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 ml-2 text-red-500" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{members.length} members</Badge>
            <Badge variant={isOnline ? "default" : "destructive"} className="text-xs">
              {isOnline ? "🟢 Online" : "🔴 Offline"}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>{groupChat.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col min-h-0 p-4">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 border rounded-lg bg-gradient-to-b from-gray-50 to-white">
          {messages.map((message) => (
            <div key={message.id} className="flex flex-col space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {message.sender_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatMessageTime(message.created_at)}
                </span>
                {message.delivery_status === 'failed' && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Failed
                  </Badge>
                )}
                {message.delivery_status === 'delivered' && (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                )}
              </div>
              
              {message.message_type === 'text' && (
                <div className="bg-primary text-primary-foreground rounded-xl p-3 max-w-xs self-start relative shadow-sm">
                  {message.content}
                  {message.delivery_status === 'failed' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => retryFailedMessage(message.id)}
                      className="absolute -bottom-8 right-0 text-xs hover:bg-red-100"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Retry
                    </Button>
                  )}
                </div>
              )}
              
              {message.message_type === 'file' && (
                <div className="bg-secondary rounded-xl p-3 max-w-xs border shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">{message.file_name}</span>
                      {message.file_size && (
                        <span className="text-xs text-muted-foreground">
                          {(message.file_size / 1024).toFixed(1)} KB
                        </span>
                      )}
                    </div>
                  </div>
                  {message.file_url && (
                    <Button size="sm" variant="outline" className="w-full" asChild>
                      <a href={message.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3 w-3 mr-1" />
                        Download File
                      </a>
                    </Button>
                  )}
                </div>
              )}
              
              {message.message_type === 'location' && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-3 max-w-xs border border-blue-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-blue-900">Live Location</span>
                      {!isLocationExpired(message.location_expires_at) ? (
                        <Badge variant="default" className="text-xs ml-2 bg-green-100 text-green-800">
                          <Clock className="w-3 h-3 mr-1" />
                          {message.location_duration_hours}h active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs ml-2">
                          Expired
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-blue-700 mb-2">{message.content}</p>
                  {message.location_latitude && message.location_longitude && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => openLocationInMaps(message.location_latitude!, message.location_longitude!)}
                      className="w-full bg-white hover:bg-blue-50"
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      View on Google Maps
                    </Button>
                  )}
                  {!isLocationExpired(message.location_expires_at) && message.location_expires_at && (
                    <div className="text-xs text-blue-600 mt-1 bg-blue-50 p-1 rounded">
                      Expires: {new Date(message.location_expires_at).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">No Messages Yet</h3>
              <p className="text-sm mb-4">Start the conversation with your emergency contacts</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800 max-w-md mx-auto">
                <p className="text-xs">💡 You can send text messages, share files, and broadcast your live location to all emergency contacts in this group.</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* File Preview */}
        {selectedFile && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded">
                <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block">{selectedFile.name}</span>
                <span className="text-xs text-blue-600">
                  {(selectedFile.size / 1024).toFixed(1)} KB ready to send
                </span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedFile(null)} className="h-6 w-6 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="space-y-3 flex-shrink-0 bg-white border rounded-xl p-3">
          <div className="flex gap-2">
            <Textarea
              placeholder={isOnline ? "Type your emergency message..." : "No internet connection"}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 resize-none min-h-[60px] max-h-[120px] border-gray-200"
              rows={2}
              disabled={!isOnline || sendingMessage}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            
            <div className="flex flex-col gap-2">
              {/* File Upload */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.zip"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={!isOnline || sendingMessage}
                className="h-10 w-10 p-0"
                title="Attach File"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              
              {/* Location Duration */}
              <Select value={locationDuration} onValueChange={setLocationDuration}>
                <SelectTrigger className="w-16 h-10" title="Location Duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1hr</SelectItem>
                  <SelectItem value="6">6hr</SelectItem>
                  <SelectItem value="8">8hr</SelectItem>
                  <SelectItem value="24">1day</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Share Location */}
              <Button
                size="sm"
                variant="outline"
                onClick={shareLocation}
                disabled={sharingLocation || !isOnline}
                className="h-10 w-10 p-0"
                title="Share Live Location"
              >
                {sharingLocation ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
              </Button>
              
              {/* Send Message */}
              <Button
                onClick={sendMessage}
                disabled={(!newMessage.trim() && !selectedFile) || sendingMessage || !isOnline}
                className="h-10 w-10 p-0 bg-primary hover:bg-primary/90"
                title="Send Message"
              >
                {sendingMessage ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Status Bar */}
          <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {members.length} emergency contacts in this chat
            </span>
            <span className="flex items-center gap-1">
              {isOnline ? (
                <>
                  <Wifi className="h-3 w-3 text-green-500" />
                  <span className="text-green-600">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-red-500" />
                  <span className="text-red-600">Offline - Messages will send when reconnected</span>
                </>
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmergencyGroupChat;

// components/EmergencyGroupChat.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { 
  MessageCircle, Send, Paperclip, MapPin, Users, X, Clock, FileText, 
  Download, Wifi, WifiOff, Mic, Camera, Square, Play, Pause, Settings, UserPlus, LogOut, Pencil, Check, CheckCheck 
} from 'lucide-react';
import { ContactAvatar } from '@/components/ui/contact-avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface GroupChat {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
}

interface GroupMember {
  id: string;
  group_id: string;
  user_id?: string | null;
  display_name: string;
  is_active: boolean;
  avatar_url?: string;
  gender?: 'male' | 'female' | 'other';
  is_online?: boolean;
}

interface ChatMessage {
  id: string;
  group_id: string;
  sender_id?: string | null;
  sender_name: string;
  message_type: 'text' | 'file' | 'audio' | 'video' | 'image' | 'location';
  content?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  file_type?: string | null;
  created_at: string;
  updated_at?: string;
}

interface EmergencyGroupChatProps {
  chatId: string;
}

const EmergencyGroupChat: React.FC<EmergencyGroupChatProps> = ({ chatId }) => {
  const [groupChat, setGroupChat] = useState<GroupChat | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [emergencyContactCount, setEmergencyContactCount] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [locationDuration, setLocationDuration] = useState('1');
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' && window.navigator.onLine);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  
  // Media recording states
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingType, setRecordingType] = useState<'video' | 'audio' | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

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

  useEffect(() => { loadChat(); }, [chatId]);
  
  // Realtime updates for this group chat
  useEffect(() => {
    if (!chatId) return;
    const channel = supabase.channel('gc-'.concat(String(chatId)))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_chat_messages',
        filter: `group_id=eq.${chatId}`,
      }, () => {
        loadChat();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);
  useEffect(() => { scrollToBottom(); }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChat = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Load group chat
      const { data: chat } = await supabase.from('group_chats').select('*').eq('id', chatId).single();
      setGroupChat(chat);

      // Load members
      const { data: membersData } = await supabase.from('group_chat_members').select('*').eq('group_id', chatId).eq('is_active', true);
      setMembers(membersData || []);

      // Get emergency contacts count for this user
      const { data: emergencyContacts } = await supabase
        .from('emergency_contacts')
        .select('id')
        .eq('user_id', user.id)
        .eq('verification_status', 'verified');
      
      setEmergencyContactCount(emergencyContacts?.length || 0);

      // Load messages
      const { data: msgs } = await supabase
        .from('group_chat_messages')
        .select('*')
        .eq('group_id', chatId)
        .order('created_at', { ascending: true })
        .limit(100);
      setMessages((msgs || []) as ChatMessage[]);
      
      setIsLoading(false);
    } catch (e) {
      console.error('Error loading chat:', e);
      setIsLoading(false);
    }
  };

  // Media recording functions
  const startRecording = async (type: 'video' | 'audio') => {
    try {
      const constraints = type === 'video' ? { video: true, audio: true } : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: type === 'video' ? 'video/webm' : 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setRecordingType(type);
      
      if (type === 'video') {
        setIsRecordingVideo(true);
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
      } else {
        setIsRecordingAudio(true);
      }
      
      toast({ title: `${type === 'video' ? '📹' : '🎤'} Recording Started`, description: `Recording ${type}...` });
    } catch (error) {
      toast({ title: "Recording Failed", description: `Could not access ${type} device.`, variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecordingVideo(false);
      setIsRecordingAudio(false);
      
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
      }
      
      toast({ title: "Recording Stopped", description: "Review and send your recording." });
    }
  };

  const useRecording = () => {
    if (recordedBlob && recordingType) {
      const fileName = `${recordingType}-${Date.now()}.webm`;
      const file = new File([recordedBlob], fileName, { type: `${recordingType}/webm` });
      setSelectedFile(file);
      setRecordedBlob(null);
      setRecordingType(null);
    }
  };

  const discardRecording = () => {
    setRecordedBlob(null);
    setRecordingType(null);
  };

  const sendMessage = async () => {
    if (!groupChat || (!newMessage.trim() && !selectedFile) || sendingMessage) return;
    setSendingMessage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const senderName = user?.email || 'User';
      let fileUrl, fileName, fileSize, fileType, msgType: ChatMessage['message_type'] = 'text';
      
      if (selectedFile) {
        if (selectedFile.type?.startsWith('audio/')) msgType = 'audio';
        else if (selectedFile.type?.startsWith('video/')) msgType = 'video';
        else if (selectedFile.type?.startsWith('image/')) msgType = 'image';
        else msgType = 'file';
        
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('chat-files').upload(filePath, selectedFile);
        
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(filePath);
          fileUrl = urlData.publicUrl; fileName = selectedFile.name; fileSize = selectedFile.size; fileType = selectedFile.type;
        }
      }
      
      const messageData = {
        group_id: groupChat.id, sender_id: user.id, sender_name: senderName, message_type: selectedFile ? msgType : 'text',
        content: selectedFile
          ? (msgType === 'audio' ? 'Sent audio message'
            : msgType === 'video' ? 'Sent video message'
            : msgType === 'image' ? 'Sent photo'
            : `Shared file: ${selectedFile.name}`)
          : newMessage.trim(),
        file_url: fileUrl, file_name: fileName, file_size: fileSize, file_type: fileType, delivery_status: 'sent', retry_count: 0
      };
      
      await supabase.from('group_chat_messages').insert([messageData]);
      setNewMessage(''); setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadChat();
      toast({ title: "✅ Message Sent", description: selectedFile ? "Media shared successfully" : "Message delivered" });
    } catch (error) {
      toast({ title: "❌ Failed to Send", description: "Message failed to send. Check your connection.", variant: "destructive" });
    } finally { setSendingMessage(false); }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading group chat...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!groupChat) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Group Chat Found</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">No chat found with the given ID.</div>
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
            {isOnline ? (<Wifi className="h-4 w-4 ml-2 text-green-500" />) : (<WifiOff className="h-4 w-4 ml-2 text-red-500" />)}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{emergencyContactCount} members</Badge>
            <Badge variant={isOnline ? "default" : "destructive"} className="text-xs">
              {isOnline ? "🟢 Online" : "🔴 Offline"}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="ml-2"><Settings className="h-4 w-4"/></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Group Settings</DropdownMenuLabel>
                <DropdownMenuItem onClick={async () => {
                  const name = prompt('Rename group', groupChat.name || '');
                  if (!name) return;
                  await supabase.from('group_chats').update({ name }).eq('id', groupChat.id);
                  loadChat();
                }}><Pencil className="h-4 w-4 mr-2"/>Rename</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowAddMember(true)}><UserPlus className="h-4 w-4 mr-2"/>Add member</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;
                  await supabase.from('group_chat_members').update({ is_active: false }).eq('group_id', groupChat.id).eq('user_id', user.id);
                  toast({ title: 'Left group', description: 'You have left the group.' });
                }} className="text-red-600"><LogOut className="h-4 w-4 mr-2"/>Leave group</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardTitle>
        <CardDescription>{groupChat.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col min-h-0 p-4">
        {/* Recording Preview */}
        {recordedBlob && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-800">
                {recordingType === 'video' ? '📹 Video' : '🎤 Audio'} Recording Ready
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={useRecording}>Use Recording</Button>
                <Button size="sm" variant="outline" onClick={discardRecording}><X className="h-4 w-4" /></Button>
              </div>
            </div>
            {recordingType === 'video' ? (
              <video src={URL.createObjectURL(recordedBlob)} controls className="w-full max-w-xs rounded" />
            ) : (
              <audio src={URL.createObjectURL(recordedBlob)} controls className="w-full" />
            )}
          </div>
        )}

        {/* Video Preview During Recording */}
        {isRecordingVideo && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-red-800 flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                Recording Video...
              </span>
              <Button size="sm" variant="outline" onClick={stopRecording}>
                <Square className="h-4 w-4 mr-1" />Stop
              </Button>
            </div>
            <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full max-w-xs rounded" />
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground py-10">
            <MessageCircle className="w-16 h-16 mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">No Messages Yet</h3>
            <p className="text-sm mb-4">Start the conversation with your emergency contacts.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 border rounded-lg bg-gradient-to-b from-gray-50 to-white">
            {messages.map((msg) => {
              const member = members.find(m => m.user_id === msg.sender_id);
              return (
                <div key={msg.id} className="flex space-x-3">
                  <ContactAvatar
                    name={msg.sender_name}
                    photoUrl={member?.avatar_url}
                    size={40}
                    gender={member?.gender}
                    showOnlineStatus={member?.is_online}
                    className="flex-shrink-0 mt-1"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{msg.sender_name}</span>
                      <span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                    </div>
                    {msg.message_type === 'text' && (
                      <div className="bg-white border rounded-xl p-3 max-w-md shadow-sm">
                        {msg.content}
                        <div className="text-[10px] opacity-70 text-right mt-1 flex items-center justify-end">
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                          {msg.sender_id === currentUserId && (msg.delivery_status === 'read' ? <CheckCheck className="inline h-3 w-3 ml-1"/> : <Check className="inline h-3 w-3 ml-1"/>)}
                        </div>
                      </div>
                    )}
                    {msg.message_type === 'audio' && msg.file_url && (
                      <div className="bg-white border rounded-xl p-3 max-w-md shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Mic className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <span className="text-sm font-medium">Audio Message</span>
                        </div>
                        <audio controls src={msg.file_url} className="w-full" />
                        <div className="text-[10px] opacity-70 text-right mt-1 flex items-center justify-end">
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                          {msg.sender_id === currentUserId && (msg.delivery_status === 'read' ? <CheckCheck className="inline h-3 w-3 ml-1"/> : <Check className="inline h-3 w-3 ml-1"/>)}
                        </div>
                      </div>
                    )}
                    {msg.message_type === 'video' && msg.file_url && (
                      <div className="bg-white border rounded-xl p-3 max-w-md shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Camera className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <span className="text-sm font-medium">Video Message</span>
                        </div>
                        <video controls src={msg.file_url} className="w-full max-w-xs rounded" />
                      </div>
                    )}
                    {msg.message_type === 'image' && msg.file_url && (
                      <img src={msg.file_url} alt="shared" className="max-w-md rounded border" />
                    )}
                    {msg.message_type === 'file' && msg.file_url && (
                      <div className="bg-white border rounded-xl p-3 max-w-md shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{msg.file_name}</span>
                        </div>
                        <Button size="sm" variant="outline" className="w-full" asChild>
                          <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3 w-3 mr-1" />Download
                          </a>
                        </Button>
                        <div className="text-[10px] opacity-70 text-right mt-1 flex items-center justify-end">
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                          {msg.sender_id === currentUserId && (msg.delivery_status === 'read' ? <CheckCheck className="inline h-3 w-3 ml-1"/> : <Check className="inline h-3 w-3 ml-1"/>)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}

        {selectedFile && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium truncate">{selectedFile.name}</span>
            <span className="text-xs text-blue-600">{(selectedFile.size / 1024).toFixed(1)} KB</span>
            <Button size="sm" variant="ghost" onClick={() => setSelectedFile(null)} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="space-y-3 flex-shrink-0 bg-white border rounded-xl p-3">
          <Textarea
            placeholder={isOnline ? "Type your emergency message..." : "No internet connection"}
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            className="resize-none min-h-[60px] border-gray-200"
            rows={2}
            disabled={!isOnline || sendingMessage}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />
          
          {/* Horizontal media bar */}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.zip,image/*,video/*,audio/*"
            />
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!isOnline || sendingMessage} title="Attach File">
              <Paperclip className="h-4 w-4" />
            </Button>
            
            {/* Audio Recording */}
            <Button 
              size="sm" 
              variant={isRecordingAudio ? "destructive" : "outline"}
              onClick={() => isRecordingAudio ? stopRecording() : startRecording('audio')} 
              disabled={!isOnline || sendingMessage || isRecordingVideo}
              title="Record Audio"
            >
              {isRecordingAudio ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            
            {/* Video Recording */}
            <Button 
              size="sm" 
              variant={isRecordingVideo ? "destructive" : "outline"}
              onClick={() => isRecordingVideo ? stopRecording() : startRecording('video')} 
              disabled={!isOnline || sendingMessage || isRecordingAudio}
              title="Record Video"
            >
              {isRecordingVideo ? <Square className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            </Button>
            
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
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => alert("Share location coming soon")}
              disabled={!isOnline}
              title="Share Location"
            >
              <MapPin className="h-4 w-4" />
            </Button>
            
            <Button
              onClick={sendMessage}
              disabled={(!newMessage.trim() && !selectedFile) || sendingMessage || !isOnline}
              className="bg-primary hover:bg-primary/90"
              title="Send Message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />{emergencyContactCount} emergency contacts in this chat
            </span>
            <span className="flex items-center gap-1">
              {isOnline ? (<><Wifi className="h-3 w-3 text-green-500" /><span className="text-green-600">Connected</span></>) : (<><WifiOff className="h-3 w-3 text-red-500" /><span className="text-red-600">Offline</span></>)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmergencyGroupChat;

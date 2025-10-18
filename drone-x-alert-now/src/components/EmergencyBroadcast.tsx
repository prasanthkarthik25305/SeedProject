import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, Send, Clock, Check, CheckCheck, MapPin, 
  Users, Zap, Shield, Heart, Phone, X, Eye, MessageCircle 
} from 'lucide-react';
import { ContactAvatar } from '@/components/ui/contact-avatar';
import { Database } from '@/types/database';
import { cn } from '@/lib/utils';

type EmergencyBroadcast = Database['public']['Tables']['emergency_broadcasts']['Row'];
type BroadcastRecipient = Database['public']['Tables']['emergency_broadcast_recipients']['Row'];
type EmergencyContact = Database['public']['Tables']['emergency_contacts']['Row'];

interface BroadcastWithRecipients extends EmergencyBroadcast {
  recipients?: (BroadcastRecipient & {
    contact?: EmergencyContact;
  })[];
}

export const EmergencyBroadcast: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState<BroadcastWithRecipients[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<'emergency' | 'status_update' | 'safe_check'>('emergency');
  const [urgencyLevel, setUrgencyLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
  const { toast } = useToast();

  useEffect(() => {
    fetchContacts();
    fetchBroadcasts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('emergency_contacts')
          .select('*')
          .eq('user_id', user.id)
          .order('priority', { ascending: true });

        if (error) throw error;
        setContacts(data || []);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts.",
        variant: "destructive",
      });
    }
  };

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('emergency_broadcasts')
          .select(`
            *,
            recipients:emergency_broadcast_recipients(
              *,
              contact:emergency_contacts!emergency_broadcast_recipients_recipient_id_fkey(*)
            )
          `)
          .eq('sender_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setBroadcasts(data || []);
      }
    } catch (error) {
      console.error('Error fetching broadcasts:', error);
      toast({
        title: "Error",
        description: "Failed to load broadcast history.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim() || selectedContacts.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields and select recipients.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSending(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Create the broadcast
        const { data: broadcast, error: broadcastError } = await supabase
          .from('emergency_broadcasts')
          .insert({
            sender_id: user.id,
            title: broadcastTitle,
            message: broadcastMessage,
            broadcast_type: broadcastType,
            urgency_level: urgencyLevel,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (broadcastError) throw broadcastError;

        // Create recipient records
        const recipientData = selectedContacts.map(contactId => ({
          broadcast_id: broadcast.id,
          recipient_id: contactId,
          status: 'sent',
          delivered_at: new Date().toISOString()
        }));

        const { error: recipientsError } = await supabase
          .from('emergency_broadcast_recipients')
          .insert(recipientData);

        if (recipientsError) throw recipientsError;

        // Reset form
        setBroadcastTitle('');
        setBroadcastMessage('');
        setSelectedContacts([]);
        
        // Refresh broadcasts
        await fetchBroadcasts();

        toast({
          title: "Broadcast Sent",
          description: `Emergency alert sent to ${selectedContacts.length} contacts.`,
        });

        // Switch to history tab to see the sent broadcast
        setActiveTab('history');
      }
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast({
        title: "Error",
        description: "Failed to send broadcast.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const selectAllContacts = () => {
    setSelectedContacts(contacts.map(c => c.contact_user_id).filter(Boolean));
  };

  const clearAllContacts = () => {
    setSelectedContacts([]);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle className="h-4 w-4" />;
      case 'safe_check':
        return <Shield className="h-4 w-4" />;
      case 'status_update':
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getDeliveryStats = (recipients?: BroadcastRecipient[]) => {
    if (!recipients) return { sent: 0, delivered: 0, read: 0, responded: 0 };
    
    return {
      sent: recipients.length,
      delivered: recipients.filter(r => ['delivered', 'read', 'responded'].includes(r.status)).length,
      read: recipients.filter(r => ['read', 'responded'].includes(r.status)).length,
      responded: recipients.filter(r => r.status === 'responded').length
    };
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'send' | 'history')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="send">Send Broadcast</TabsTrigger>
          <TabsTrigger value="history">Broadcast History</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-6">
          <Card className="border-red-100">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span>Emergency Broadcast</span>
              </CardTitle>
              <CardDescription>
                Send emergency alerts to multiple contacts simultaneously
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6 p-6">
              {/* Broadcast Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Alert Title *</Label>
                  <Input
                    id="title"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="Emergency Alert Title"
                    className="border-red-200 focus:border-red-400"
                  />
                </div>
                
                <div>
                  <Label htmlFor="type">Alert Type</Label>
                  <Select value={broadcastType} onValueChange={(value: any) => setBroadcastType(value)}>
                    <SelectTrigger className="border-red-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="emergency">🚨 Emergency</SelectItem>
                      <SelectItem value="safe_check">✅ Safety Check</SelectItem>
                      <SelectItem value="status_update">📢 Status Update</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="urgency">Urgency Level</Label>
                  <Select value={urgencyLevel} onValueChange={(value: any) => setUrgencyLevel(value)}>
                    <SelectTrigger className="border-red-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">🔴 Critical</SelectItem>
                      <SelectItem value="high">🟠 High</SelectItem>
                      <SelectItem value="medium">🟡 Medium</SelectItem>
                      <SelectItem value="low">🔵 Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Message */}
              <div>
                <Label htmlFor="message">Emergency Message *</Label>
                <Textarea
                  id="message"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Describe the emergency situation and any immediate actions needed..."
                  className="min-h-[120px] border-red-200 focus:border-red-400"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {broadcastMessage.length}/500 characters
                </p>
              </div>

              {/* Recipients Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Recipients ({selectedContacts.length} selected)</Label>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={selectAllContacts}
                      className="text-xs"
                    >
                      Select All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearAllContacts}
                      className="text-xs"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-2">
                    {contacts.map((contact) => (
                      <div
                        key={contact.id}
                        onClick={() => contact.contact_user_id && toggleContactSelection(contact.contact_user_id)}
                        className={cn(
                          "flex items-center p-3 rounded-lg cursor-pointer transition-colors",
                          selectedContacts.includes(contact.contact_user_id || '')
                            ? "bg-red-50 border border-red-200"
                            : "hover:bg-gray-50 border border-transparent"
                        )}
                      >
                        <div className="flex items-center flex-1 space-x-3">
                          <div className="relative">
                            <ContactAvatar
                              src={contact.photo_url}
                              name={contact.name}
                              size="sm"
                              gender={contact.gender}
                              showStatus={false}
                            />
                            {selectedContacts.includes(contact.contact_user_id || '') && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                <Check className="h-2 w-2 text-white" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <p className="font-medium text-sm">{contact.name}</p>
                            <p className="text-xs text-gray-500">{contact.phone}</p>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            {contact.verification_status === 'verified' && (
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                Verified
                              </Badge>
                            )}
                            {contact.priority === 1 && (
                              <Badge className="bg-red-100 text-red-700 text-xs">
                                Primary
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {contacts.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No emergency contacts available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Send Button */}
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setBroadcastTitle('');
                    setBroadcastMessage('');
                    setSelectedContacts([]);
                  }}
                >
                  Clear Form
                </Button>
                <Button
                  onClick={sendBroadcast}
                  disabled={sending || !broadcastTitle.trim() || !broadcastMessage.trim() || selectedContacts.length === 0}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {sending ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Emergency Broadcast
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <span>Broadcast History</span>
              </CardTitle>
              <CardDescription>
                Track your sent emergency broadcasts and delivery status
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading broadcast history...
                </div>
              ) : broadcasts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No broadcasts sent yet</p>
                  <p className="text-sm">Your emergency broadcasts will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {broadcasts.map((broadcast) => {
                    const stats = getDeliveryStats(broadcast.recipients);
                    
                    return (
                      <div
                        key={broadcast.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {getTypeIcon(broadcast.broadcast_type)}
                              <h3 className="font-medium text-gray-900">{broadcast.title}</h3>
                              <Badge className={`text-xs ${getUrgencyColor(broadcast.urgency_level)}`}>
                                {broadcast.urgency_level.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{broadcast.message}</p>
                            <p className="text-xs text-gray-500">
                              Sent {formatDateTime(broadcast.created_at)}
                            </p>
                          </div>
                        </div>

                        {/* Delivery Status */}
                        <div className="border-t pt-3">
                          <div className="grid grid-cols-4 gap-4 text-center">
                            <div>
                              <div className="text-lg font-bold text-blue-600">{stats.sent}</div>
                              <div className="text-xs text-gray-500">Sent</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-green-600">{stats.delivered}</div>
                              <div className="text-xs text-gray-500">Delivered</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-purple-600">{stats.read}</div>
                              <div className="text-xs text-gray-500">Read</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-orange-600">{stats.responded}</div>
                              <div className="text-xs text-gray-500">Responded</div>
                            </div>
                          </div>
                        </div>

                        {/* Recipients List */}
                        {broadcast.recipients && broadcast.recipients.length > 0 && (
                          <div className="border-t pt-3 mt-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Recipients ({broadcast.recipients.length})</span>
                            </div>
                            <div className="space-y-2">
                              {broadcast.recipients.map((recipient, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center space-x-2">
                                    <ContactAvatar
                                      src={recipient.contact?.photo_url}
                                      name={recipient.contact?.name || 'Unknown'}
                                      size="xs"
                                      gender={recipient.contact?.gender}
                                      showStatus={false}
                                    />
                                    <span>{recipient.contact?.name || 'Unknown Contact'}</span>
                                  </div>
                                  <Badge 
                                    className={cn(
                                      "text-xs",
                                      recipient.status === 'sent' && "bg-blue-100 text-blue-700",
                                      recipient.status === 'delivered' && "bg-green-100 text-green-700",
                                      recipient.status === 'read' && "bg-purple-100 text-purple-700",
                                      recipient.status === 'responded' && "bg-orange-100 text-orange-700"
                                    )}
                                  >
                                    {recipient.status === 'sent' && <Send className="h-3 w-3 mr-1" />}
                                    {recipient.status === 'delivered' && <Check className="h-3 w-3 mr-1" />}
                                    {recipient.status === 'read' && <Eye className="h-3 w-3 mr-1" />}
                                    {recipient.status === 'responded' && <MessageCircle className="h-3 w-3 mr-1" />}
                                    {recipient.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
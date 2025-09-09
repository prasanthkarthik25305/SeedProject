import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Users, Plus, Edit, Trash2, Network, Phone, Mail, User, Save, List, Heart, Check, Clock, X } from 'lucide-react';
import { EmergencyContactsGraph } from './EmergencyContactsGraph';
import EmergencyContactVerification from './EmergencyContactVerification';
import EmergencyGroupChat from './EmergencyGroupChat';

interface EmergencyContact {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  relationship?: string;
  priority?: number;
  verification_status?: 'pending' | 'verified' | 'failed';
  verification_type?: 'email' | 'sms';
  verified_at?: string;
}

interface EmergencyContactsProps {
  readOnly?: boolean;
}

export const EmergencyContacts = ({ readOnly = false }: EmergencyContactsProps) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('emergency_contacts')
          .select('*')
          .eq('user_id', user.id)
          .order('priority');

        if (error) throw error;
        setContacts((data || []) as EmergencyContact[]);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load emergency contacts.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveContact = async () => {
    if (!editingContact) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingContact.id) {
        // Update existing contact
        const { error } = await supabase
          .from('emergency_contacts')
          .update({
            name: editingContact.name,
            phone: editingContact.phone,
            email: editingContact.email,
            relationship: editingContact.relationship,
            priority: editingContact.priority,
          })
          .eq('id', editingContact.id);

        if (error) throw error;
      } else {
        // Create new contact
        const { error } = await supabase
          .from('emergency_contacts')
          .insert({
            user_id: user.id,
            name: editingContact.name,
            phone: editingContact.phone,
            email: editingContact.email,
            relationship: editingContact.relationship,
            priority: editingContact.priority,
          });

        if (error) throw error;
      }

      await fetchContacts();
      setEditingContact(null);
      toast({
        title: "Success",
        description: "Emergency contact saved successfully.",
      });
    } catch (error: any) {
      console.error('Error saving contact:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save contact.",
        variant: "destructive",
      });
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchContacts();
      toast({
        title: "Success",
        description: "Emergency contact deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: "Error",
        description: "Failed to delete contact.",
        variant: "destructive",
      });
    }
  };

  const startEditing = (contact?: EmergencyContact) => {
    if (contact) {
      setEditingContact(contact);
    } else {
      // Find next available priority
      const usedPriorities = contacts.map(c => c.priority || 1);
      const nextPriority = [1, 2, 3, 4, 5].find(p => !usedPriorities.includes(p)) || 1;
      
      setEditingContact({
        name: '',
        phone: '',
        email: '',
        relationship: '',
        priority: nextPriority,
      });
    }
  };

  const getPriorityLabel = (priority?: number) => {
    if (!priority) return 'No Priority';
    const labels = {
      1: 'Primary',
      2: 'Secondary', 
      3: 'Tertiary',
      4: 'Backup'
    };
    return labels[priority as keyof typeof labels] || `Priority ${priority}`;
  };

  const getPriorityColor = (priority?: number) => {
    if (!priority) return 'bg-secondary text-secondary-foreground';
    const colors = {
      1: 'bg-destructive text-destructive-foreground',
      2: 'bg-primary text-primary-foreground',
      3: 'bg-secondary text-secondary-foreground',
      4: 'bg-muted text-muted-foreground'
    };
    return colors[priority as keyof typeof colors] || 'bg-secondary text-secondary-foreground';
  };

  if (readOnly) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-primary" />
              Emergency Contacts
            </div>
            <span className="text-sm text-muted-foreground">Your configured emergency contacts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-medium text-sm truncate">{contact.name}</h4>
                    {contact.verification_status === 'verified' && (
                      <Badge variant="default" className="bg-green-100 text-green-800 text-xs whitespace-nowrap">
                        <Check className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                    {contact.relationship && (
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {contact.relationship}
                      </Badge>
                    )}
                    {contact.priority && (
                      <Badge 
                        variant="secondary" 
                        className={`text-xs whitespace-nowrap ${getPriorityColor(contact.priority)}`}
                      >
                        {getPriorityLabel(contact.priority)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{contact.phone}</span>
                    </span>
                    {contact.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {contacts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No emergency contacts configured</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="contacts" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="chat">Group Chat</TabsTrigger>
          <TabsTrigger value="graph">Network</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-primary" />
                  Emergency Contacts
                </div>
                <Button onClick={() => startEditing()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </CardTitle>
              <CardDescription>
                Manage your emergency contacts and their verification status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editingContact !== null && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>
                      {editingContact.id ? 'Edit Contact' : 'Add New Contact'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          value={editingContact.name || ''}
                          onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                          placeholder="Contact name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                          id="phone"
                          value={editingContact.phone || ''}
                          onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                          placeholder="Phone number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={editingContact.email || ''}
                          onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                          placeholder="Email address"
                        />
                      </div>
                      <div>
                        <Label htmlFor="relationship">Relationship</Label>
                        <Select
                          value={editingContact.relationship || ''}
                          onValueChange={(value) => setEditingContact({ ...editingContact, relationship: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="parent">Parent</SelectItem>
                            <SelectItem value="spouse">Spouse</SelectItem>
                            <SelectItem value="sibling">Sibling</SelectItem>
                            <SelectItem value="child">Child</SelectItem>
                            <SelectItem value="friend">Friend</SelectItem>
                            <SelectItem value="colleague">Colleague</SelectItem>
                            <SelectItem value="neighbor">Neighbor</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                          value={editingContact.priority?.toString() || ''}
                          onValueChange={(value) => setEditingContact({ ...editingContact, priority: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 - Highest</SelectItem>
                            <SelectItem value="2">2 - High</SelectItem>
                            <SelectItem value="3">3 - Medium</SelectItem>
                            <SelectItem value="4">4 - Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={saveContact}
                        disabled={loading || !editingContact.name || !editingContact.phone}
                      >
                        {loading ? 'Saving...' : editingContact.id ? 'Update Contact' : 'Add Contact'}
                      </Button>
                      <Button variant="outline" onClick={() => setEditingContact(null)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                {contacts.map((contact) => (
                  <div key={contact.id} className="flex items-start justify-between p-4 border rounded-lg bg-card">
                    {/* Content Section - Fixed width and spacing */}
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4 className="font-medium truncate">{contact.name}</h4>
                        {contact.verification_status === 'verified' && (
                          <Badge variant="default" className="bg-green-100 text-green-800 text-xs whitespace-nowrap">
                            <Check className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                        {contact.verification_status === 'pending' && (
                          <Badge variant="secondary" className="text-xs whitespace-nowrap">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                        {(!contact.verification_status || contact.verification_status === 'failed') && (
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            <X className="w-3 h-3 mr-1" />
                            Unverified
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{contact.phone}</span>
                        </span>
                        {contact.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{contact.email}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {contact.relationship && (
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {contact.relationship}
                          </Badge>
                        )}
                        {contact.priority && (
                          <Badge 
                            variant="secondary" 
                            className={`text-xs whitespace-nowrap ${getPriorityColor(contact.priority)}`}
                          >
                            {getPriorityLabel(contact.priority)}
                          </Badge>
                        )}
                      </div>
                      {contact.verified_at && (
                        <div className="text-xs text-green-600 mt-1">
                          Verified on {new Date(contact.verified_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons - Fixed alignment */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(contact)}
                        className="h-9 w-9 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteContact(contact.id!)}
                        className="text-destructive hover:text-destructive h-9 w-9 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {contacts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No emergency contacts added yet</p>
                    <p className="text-sm">Add your first contact to get started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification">
          <EmergencyContactVerification
            contacts={contacts as any}
            onVerificationUpdate={fetchContacts}
          />
        </TabsContent>

        <TabsContent value="chat">
          <EmergencyGroupChat
            onMemberRemoved={(contactId) => {
              // Mark contact as removed from group chat
              fetchContacts();
            }}
          />
        </TabsContent>

        <TabsContent value="graph">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Network className="h-5 w-5 mr-2 text-primary" />
                Emergency Network Graph
              </CardTitle>
              <CardDescription>
                Visual representation of your emergency contact network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmergencyContactsGraph contacts={contacts as any} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmergencyContacts;

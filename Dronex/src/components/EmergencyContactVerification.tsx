import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Phone, Check, Clock, X, Send, CheckCircle, AlertCircle } from 'lucide-react';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  verification_status: 'pending' | 'verified' | 'failed';
  verification_type: 'email' | 'sms';
  verification_code?: string;
  verification_expires_at?: string;
  verified_at?: string;
}

interface EmergencyContactVerificationProps {
  contacts: EmergencyContact[];
  onVerificationUpdate: () => void;
}

// Updated Resend email sending function
const sendVerificationEmail = async (email: string, name: string, code: string) => {
  try {
    console.log(`Sending verification email to: ${email}`);
    
    const { data, error } = await supabase.functions.invoke('send-verification-email', {
      body: {
        to: email,
        name: name,
        verificationCode: code
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    if (data && data.success) {
      console.log('✅ Email sent successfully! Email ID:', data.emailId);
      return { 
        success: true, 
        message: 'Email sent successfully',
        emailId: data.emailId 
      };
    } else {
      throw new Error(data?.error || 'Unknown error occurred');
    }
    
  } catch (error) {
    console.error('❌ Email sending error:', error);
    throw error;
  }
};

export const EmergencyContactVerification: React.FC<EmergencyContactVerificationProps> = ({
  contacts,
  onVerificationUpdate
}) => {
  const [verifyingContact, setVerifyingContact] = useState<string | null>(null);
  const [verificationCodes, setVerificationCodes] = useState<{[key: string]: string}>({});
  const [verificationType, setVerificationType] = useState<'email' | 'sms'>('email');
  const { toast } = useToast();

  const sendVerification = async (contactId: string, type: 'email' | 'sms') => {
    setVerifyingContact(contactId);
    
    try {
      const contact = contacts.find(c => c.id === contactId);
      if (!contact) return;

      // Generate 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiration to 30 minutes from now
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      // Update contact with verification code in database
      const { error: updateError } = await supabase
        .from('emergency_contacts')
        .update({
          verification_code: code,
          verification_type: type,
          verification_expires_at: expiresAt,
          verification_status: 'pending'
        })
        .eq('id', contactId);

      if (updateError) throw updateError;

      // Send email or SMS
      if (type === 'email' && contact.email) {
        try {
          const result = await sendVerificationEmail(contact.email, contact.name, code);
          
          toast({
            title: "✅ Verification Email Sent!",
            description: (
              <div className="space-y-1">
                <p>Verification code sent to <strong>{contact.email}</strong></p>
                <p className="text-xs opacity-75">Email ID: {result.emailId}</p>
              </div>
            ),
            duration: 8000,
          });
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          toast({
            title: "⚠️ Email Service Error",
            description: `Failed to send email to ${contact.email}. Please try again or contact support.`,
            variant: "destructive",
            duration: 10000,
          });
          
          // Reset status on failure
          await supabase
            .from('emergency_contacts')
            .update({
              verification_status: 'failed',
              verification_code: null,
              verification_expires_at: null
            })
            .eq('id', contactId);
        }
      } else if (type === 'sms') {
        // SMS functionality - placeholder for future implementation
        console.log(`SMS code for ${contact.phone}: ${code}`);
        toast({
          title: "📱 SMS Feature Coming Soon",
          description: `SMS verification will be available soon. For now, use email verification.`,
          duration: 8000,
        });
        
        // Reset to allow email attempt
        await supabase
          .from('emergency_contacts')
          .update({
            verification_status: 'failed',
            verification_code: null,
            verification_expires_at: null
          })
          .eq('id', contactId);
      }

      onVerificationUpdate();
    } catch (error) {
      console.error('Error sending verification:', error);
      toast({
        title: "❌ Verification Failed",
        description: "Failed to send verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifyingContact(null);
    }
  };

  const verifyCode = async (contactId: string, inputCode: string) => {
    try {
      const contact = contacts.find(c => c.id === contactId);
      if (!contact) return;

      // Check if code matches and hasn't expired
      if (contact.verification_code !== inputCode) {
        toast({
          title: "❌ Invalid Code",
          description: "The verification code you entered is incorrect. Please check and try again.",
          variant: "destructive",
        });
        return;
      }

      if (contact.verification_expires_at && new Date(contact.verification_expires_at) < new Date()) {
        toast({
          title: "⏰ Code Expired",
          description: "The verification code has expired. Please request a new one.",
          variant: "destructive",
        });
        return;
      }

      // Mark as verified
      const { error } = await supabase
        .from('emergency_contacts')
        .update({
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
          verification_code: null,
          verification_expires_at: null
        })
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: "🎉 Contact Verified Successfully!",
        description: (
          <div className="space-y-1">
            <p><strong>{contact.name}</strong> has been verified</p>
            <p className="text-xs opacity-75">Emergency network activated</p>
          </div>
        ),
      });

      // Clear the verification code input
      setVerificationCodes(prev => ({ ...prev, [contactId]: '' }));
      onVerificationUpdate();
    } catch (error) {
      console.error('Error verifying code:', error);
      toast({
        title: "❌ Verification Error",
        description: "Failed to verify contact. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (contact: EmergencyContact) => {
    switch (contact.verification_status) {
      case 'verified':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 whitespace-nowrap">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 whitespace-nowrap">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="whitespace-nowrap">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="whitespace-nowrap">
            <Clock className="w-3 h-3 mr-1" />
            Not Started
          </Badge>
        );
    }
  };

  const handleCodeChange = (contactId: string, code: string) => {
    setVerificationCodes(prev => ({ ...prev, [contactId]: code }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Mail className="h-5 w-5 mr-2 text-primary" />
          Contact Verification
        </CardTitle>
        <CardDescription>
          Verify your emergency contacts to enable group chat and location sharing. 
          Verification emails are sent instantly via our secure email service.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {contacts.map((contact) => (
            <div key={contact.id} className="flex items-start justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h4 className="font-medium truncate">{contact.name}</h4>
                  {getStatusBadge(contact)}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{contact.phone}</span>
                  </div>
                  {contact.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.verified_at && (
                    <div className="text-xs text-green-600 font-medium">
                      ✓ Verified on {new Date(contact.verified_at).toLocaleDateString()}
                    </div>
                  )}
                  {contact.verification_expires_at && contact.verification_status === 'pending' && (
                    <div className="text-xs text-blue-600">
                      Code expires: {new Date(contact.verification_expires_at).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {contact.verification_status === 'verified' ? (
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium whitespace-nowrap">
                    <CheckCircle className="w-4 h-4" />
                    Verified
                  </div>
                ) : contact.verification_status === 'pending' && contact.verification_code ? (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Enter 6-digit code"
                      value={verificationCodes[contact.id] || ''}
                      onChange={(e) => handleCodeChange(contact.id, e.target.value)}
                      className="w-32 h-9 text-center font-mono"
                      maxLength={6}
                    />
                    <Button
                      size="sm"
                      onClick={() => verifyCode(contact.id, verificationCodes[contact.id] || '')}
                      disabled={(verificationCodes[contact.id] || '').length !== 6}
                      className="h-9 whitespace-nowrap"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Verify
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select
                      value={verificationType}
                      onValueChange={(value: 'email' | 'sms') => setVerificationType(value)}
                    >
                      <SelectTrigger className="w-24 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {contact.email && (
                          <SelectItem value="email">Email</SelectItem>
                        )}
                        <SelectItem value="sms" disabled>SMS (Soon)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => sendVerification(contact.id, verificationType)}
                      disabled={
                        verifyingContact === contact.id || 
                        (!contact.email && verificationType === 'email')
                      }
                      className="h-9 whitespace-nowrap"
                    >
                      {verifyingContact === contact.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-1" />
                          Send Code
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {contacts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">No Emergency Contacts</h3>
              <p className="text-sm">Add emergency contacts first to enable verification</p>
            </div>
          )}
        </div>

        {/* Verification Instructions */}
        {contacts.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">📧 How Verification Works:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Click "Send Code" to send a verification email</li>
              <li>• Check your email inbox for the 6-digit verification code</li>
              <li>• Enter the code and click "Verify" to activate the contact</li>
              <li>• Verified contacts can receive emergency notifications</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmergencyContactVerification;

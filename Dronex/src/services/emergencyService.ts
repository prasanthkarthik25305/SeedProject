import { supabase } from '@/lib/supabase';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: string;
  is_primary: boolean;
}

export interface EmergencyImage {
  id: string;
  image_url: string;
  location: { lat: number; lng: number };
  description: string;
  emergency_type: string;
  sent_to_contacts: boolean;
  sent_to_officials: boolean;
  created_at: string;
}

class EmergencyService {
  // Send emergency image to contacts and officials
  async sendEmergencyImage(
    imageBlob: Blob,
    location: { lat: number; lng: number },
    description: string,
    emergencyType: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Upload image to Supabase storage
      const fileName = `emergency_${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('emergency-images')
        .upload(fileName, imageBlob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('Image upload error:', uploadError);
        return { success: false, message: 'Failed to upload image' };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('emergency-images')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // Save emergency record
      const { data: emergencyData, error: emergencyError } = await supabase
        .from('emergency_images')
        .insert({
          image_url: imageUrl,
          location: location,
          description: description,
          emergency_type: emergencyType,
          sent_to_contacts: false,
          sent_to_officials: false
        })
        .select()
        .single();

      if (emergencyError) {
        console.error('Emergency record error:', emergencyError);
        return { success: false, message: 'Failed to save emergency record' };
      }

      // Send to emergency contacts
      await this.notifyEmergencyContacts(imageUrl, location, description, emergencyType);

      // Send to officials (simulate API call)
      await this.notifyOfficials(imageUrl, location, description, emergencyType);

      // Update record as sent
      await supabase
        .from('emergency_images')
        .update({ 
          sent_to_contacts: true, 
          sent_to_officials: true 
        })
        .eq('id', emergencyData.id);

      return { 
        success: true, 
        message: 'Emergency image sent to contacts and officials successfully' 
      };

    } catch (error) {
      console.error('Emergency service error:', error);
      return { 
        success: false, 
        message: 'Failed to process emergency image' 
      };
    }
  }

  // Get emergency contacts
  async getEmergencyContacts(): Promise<EmergencyContact[]> {
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .order('is_primary', { ascending: false });

      if (error) {
        console.error('Error fetching contacts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Emergency contacts error:', error);
      return [];
    }
  }

  // Notify emergency contacts
  private async notifyEmergencyContacts(
    imageUrl: string,
    location: { lat: number; lng: number },
    description: string,
    emergencyType: string
  ) {
    try {
      const contacts = await this.getEmergencyContacts();
      
      for (const contact of contacts) {
        // Send SMS (simulate)
        await this.sendSMS(contact.phone, {
          message: `EMERGENCY ALERT: ${emergencyType}\nLocation: ${location.lat}, ${location.lng}\nDescription: ${description}\nImage: ${imageUrl}`,
          imageUrl: imageUrl
        });

        // Send Email if available
        if (contact.email) {
          await this.sendEmail(contact.email, {
            subject: `EMERGENCY ALERT - ${emergencyType}`,
            message: description,
            location: location,
            imageUrl: imageUrl
          });
        }
      }
    } catch (error) {
      console.error('Error notifying contacts:', error);
    }
  }

  // Notify officials
  private async notifyOfficials(
    imageUrl: string,
    location: { lat: number; lng: number },
    description: string,
    emergencyType: string
  ) {
    try {
      // Simulate API call to emergency services
      const officialData = {
        emergency_type: emergencyType,
        location: location,
        description: description,
        image_url: imageUrl,
        timestamp: new Date().toISOString(),
        priority: this.getEmergencyPriority(emergencyType)
      };

      // In real implementation, this would call actual emergency services API
      console.log('Sending to emergency officials:', officialData);
      
      // Save to database for tracking
      await supabase
        .from('official_notifications')
        .insert({
          emergency_type: emergencyType,
          location: location,
          description: description,
          image_url: imageUrl,
          status: 'sent',
          priority: this.getEmergencyPriority(emergencyType)
        });

    } catch (error) {
      console.error('Error notifying officials:', error);
    }
  }

  // Send SMS (simulate)
  private async sendSMS(phone: string, data: { message: string; imageUrl: string }) {
    try {
      // In real implementation, integrate with SMS service like Twilio
      console.log(`SMS sent to ${phone}:`, data.message);
      
      // Save SMS record
      await supabase
        .from('sms_logs')
        .insert({
          phone_number: phone,
          message: data.message,
          image_url: data.imageUrl,
          status: 'sent',
          sent_at: new Date().toISOString()
        });

      return { success: true };
    } catch (error) {
      console.error('SMS sending error:', error);
      return { success: false };
    }
  }

  // Send Email (simulate)
  private async sendEmail(email: string, data: {
    subject: string;
    message: string;
    location: { lat: number; lng: number };
    imageUrl: string;
  }) {
    try {
      // In real implementation, integrate with email service
      console.log(`Email sent to ${email}:`, data);
      
      // Save email record
      await supabase
        .from('email_logs')
        .insert({
          email_address: email,
          subject: data.subject,
          message: data.message,
          image_url: data.imageUrl,
          status: 'sent',
          sent_at: new Date().toISOString()
        });

      return { success: true };
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false };
    }
  }

  // Get emergency priority
  private getEmergencyPriority(emergencyType: string): string {
    const priorities: { [key: string]: string } = {
      'Fire Emergency': 'critical',
      'Medical Emergency': 'critical',
      'Earthquake': 'high',
      'Flood Emergency': 'high',
      'Cyclone/Storm': 'high',
      'General Emergency': 'medium'
    };

    return priorities[emergencyType] || 'medium';
  }

  // Share current location
  async shareLocation(): Promise<{ success: boolean; message: string }> {
    try {
      if (!navigator.geolocation) {
        return { success: false, message: 'Geolocation not supported' };
      }

      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy
            };

            // Send location to emergency contacts
            const contacts = await this.getEmergencyContacts();
            
            for (const contact of contacts) {
              await this.sendSMS(contact.phone, {
                message: `EMERGENCY LOCATION SHARE\nLatitude: ${location.lat}\nLongitude: ${location.lng}\nAccuracy: ${location.accuracy}m\nGoogle Maps: https://maps.google.com/?q=${location.lat},${location.lng}`,
                imageUrl: ''
              });
            }

            resolve({ 
              success: true, 
              message: `Location shared with ${contacts.length} emergency contacts` 
            });
          },
          (error) => {
            console.error('Geolocation error:', error);
            resolve({ 
              success: false, 
              message: 'Failed to get current location' 
            });
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      });
    } catch (error) {
      console.error('Location sharing error:', error);
      return { success: false, message: 'Failed to share location' };
    }
  }

  // Call emergency services
  async callEmergencyServices(serviceType: 'all' | 'police' | 'fire' | 'medical' = 'all'): Promise<void> {
    const numbers: { [key: string]: string } = {
      all: '112',
      police: '100',
      fire: '101',
      medical: '108'
    };

    const number = numbers[serviceType];
    
    try {
      // Log the emergency call
      await supabase
        .from('emergency_calls')
        .insert({
          service_type: serviceType,
          phone_number: number,
          status: 'initiated',
          called_at: new Date().toISOString()
        });

      // Initiate the call
      window.open(`tel:${number}`, '_self');
    } catch (error) {
      console.error('Emergency call error:', error);
    }
  }
}

export const emergencyService = new EmergencyService();
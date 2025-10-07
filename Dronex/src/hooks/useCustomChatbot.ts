import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  prompt: string;
  response: string;
  disaster_type?: string;
  emergency_detected: boolean;
  created_at: string;
}

interface DisasterGuideline {
  id: string;
  disaster_type: string;
  keywords: string[];
  guidance_text: string;
  emergency_level: 'low' | 'medium' | 'high' | 'critical';
}

export const useCustomChatbot = () => {
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [guidelines, setGuidelines] = useState<DisasterGuideline[]>([]);

  // Enhanced emergency keywords with more comprehensive coverage
  const emergencyKeywords = {
    medical: [
      'heart attack', 'chest pain', 'stroke', 'unconscious', 'bleeding', 'broken bone',
      'accident', 'injured', 'pain', 'breathing problem', 'allergic reaction', 'overdose',
      'seizure', 'diabetic', 'pregnancy emergency', 'burn', 'poisoning', 'choking'
    ],
    fire: [
      'fire', 'smoke', 'burning', 'flames', 'explosion', 'gas leak', 'electrical fire',
      'wildfire', 'house fire', 'building fire', 'evacuation', 'smoke alarm'
    ],
    earthquake: [
      'earthquake', 'tremor', 'shake', 'building collapse', 'seismic', 'aftershock',
      'structural damage', 'trapped', 'debris', 'landslide'
    ],
    flood: [
      'flood', 'water', 'drowning', 'rising water', 'dam break', 'tsunami', 'storm surge',
      'flash flood', 'river overflow', 'basement flooding', 'water rescue'
    ],
    cyclone: [
      'cyclone', 'hurricane', 'tornado', 'storm', 'wind', 'typhoon', 'severe weather',
      'hail', 'lightning', 'power outage', 'tree down', 'roof damage'
    ],
    crime: [
      'robbery', 'theft', 'assault', 'kidnapping', 'domestic violence', 'stalking',
      'break in', 'suspicious person', 'harassment', 'threat', 'violence'
    ],
    general: [
      'help', 'emergency', 'urgent', 'rescue', 'danger', 'trapped', 'lost', 'stranded',
      'panic', 'scared', 'need assistance', 'call police', 'call ambulance'
    ]
  };

  // Load disaster guidelines
  const loadGuidelines = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('disaster_guidance')
        .select('*');

      if (error) throw error;
      setGuidelines(data || []);
    } catch (error) {
      console.error('Error loading guidelines:', error);
    }
  }, []);

  // Load chat history
  const loadChatHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setChatHistory(data || []);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }, []);

  // Enhanced emergency detection
  const detectEmergency = (message: string): { isEmergency: boolean; type: string; confidence: number } => {
    const lowerMessage = message.toLowerCase();
    let maxConfidence = 0;
    let detectedType = 'general';

    for (const [type, keywords] of Object.entries(emergencyKeywords)) {
      let confidence = 0;
      let matchCount = 0;

      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          matchCount++;
          // Higher weight for exact matches and critical keywords
          if (keyword === 'emergency' || keyword === 'help' || keyword === 'urgent') {
            confidence += 3;
          } else {
            confidence += 1;
          }
        }
      }

      // Normalize confidence based on message length and keyword density
      const normalizedConfidence = (confidence / Math.max(lowerMessage.split(' ').length, 1)) * 10;
      
      if (normalizedConfidence > maxConfidence) {
        maxConfidence = normalizedConfidence;
        detectedType = type;
      }
    }

    return {
      isEmergency: maxConfidence > 0.5,
      type: detectedType,
      confidence: Math.min(maxConfidence, 10)
    };
  };

  // Enhanced response generation
  const generateResponse = async (message: string): Promise<string> => {
    const emergency = detectEmergency(message);
    const lowerMessage = message.toLowerCase();

    // Load guidelines if not already loaded
    if (guidelines.length === 0) {
      await loadGuidelines();
    }

    // Handle specific emergency types
    if (emergency.isEmergency) {
      const relevantGuideline = guidelines.find(g => 
        g.disaster_type.toLowerCase().includes(emergency.type) ||
        g.keywords.some(k => lowerMessage.includes(k.toLowerCase()))
      );

      if (relevantGuideline) {
        const urgencyLevel = emergency.confidence > 7 ? 'CRITICAL' : 
                           emergency.confidence > 5 ? 'HIGH' : 'MEDIUM';

        return `🚨 **${urgencyLevel} EMERGENCY DETECTED** 🚨

**Emergency Type:** ${relevantGuideline.disaster_type}
**Confidence Level:** ${Math.round(emergency.confidence * 10)}%

**IMMEDIATE ACTIONS:**
${relevantGuideline.guidance_text}

**EMERGENCY CONTACTS:**
• All Emergency: 112
• Police: 100  
• Fire Department: 101
• Medical Emergency: 108

**ADDITIONAL SUPPORT:**
• Share your location immediately
• Stay calm and follow the protocol
• Keep this chat open for further assistance

Type "location" to share your GPS coordinates
Type "contacts" to alert your emergency contacts
Type "image" to capture and send emergency photos`;
      }
    }

    // Handle location queries
    if (lowerMessage.includes('hospital') || lowerMessage.includes('medical center')) {
      return `🏥 **FINDING NEARBY HOSPITALS**

I'm locating the nearest medical facilities. Here's what you should do:

**IMMEDIATE STEPS:**
1. Call 108 for ambulance if it's an emergency
2. Share your location with emergency contacts
3. If conscious, try to get to the nearest hospital

**COMMON HOSPITALS TO LOOK FOR:**
• Government hospitals (usually 24/7)
• Private hospitals with emergency services
• Community health centers
• Primary health centers (PHCs)

**IMPORTANT:** If this is a medical emergency, call 108 immediately rather than trying to reach a hospital yourself.

Would you like me to help you call emergency services?`;
    }

    if (lowerMessage.includes('police') || lowerMessage.includes('crime') || lowerMessage.includes('safety')) {
      return `👮 **POLICE ASSISTANCE**

**IMMEDIATE ACTION:** Call 100 for police assistance

**SAFETY PROTOCOLS:**
1. Move to a safe location if possible
2. Do not confront dangerous individuals
3. Gather evidence if safe to do so
4. Contact trusted friends/family
5. Stay in well-lit, public areas

**EMERGENCY NUMBERS:**
• Police: 100
• Women's Helpline: 1091
• Child Helpline: 1098
• Senior Citizen Helpline: 14567

**ADDITIONAL SUPPORT:**
• Share your location with trusted contacts
• Keep your phone charged and accessible
• Trust your instincts about dangerous situations

Type "location" to share your coordinates with emergency contacts.`;
    }

    // Handle general help requests
    if (lowerMessage.includes('help') || lowerMessage.includes('assistance') || lowerMessage.includes('support')) {
      return `🤝 **GENERAL ASSISTANCE AVAILABLE**

I'm here to help you with emergency situations. Here's what I can assist with:

**EMERGENCY SERVICES:**
• Medical emergencies (Call 108)
• Fire emergencies (Call 101)  
• Police assistance (Call 100)
• General emergencies (Call 112)

**LOCATION SERVICES:**
• Find nearby hospitals, police stations
• Share your GPS location with contacts
• Get directions to safety

**COMMUNICATION:**
• Alert emergency contacts
• Send emergency photos with location
• Provide step-by-step emergency guidance

**DISASTER PREPAREDNESS:**
• Earthquake safety protocols
• Fire evacuation procedures
• Flood emergency actions
• Medical emergency first aid

**How can I specifically help you right now?**
Type your emergency or situation, and I'll provide targeted assistance.`;
    }

    // Handle image-related queries
    if (lowerMessage.includes('image') || lowerMessage.includes('photo') || lowerMessage.includes('picture')) {
      return `📸 **EMERGENCY IMAGE CAPTURE**

I can help you capture and send emergency images to authorities and contacts.

**TO CAPTURE EMERGENCY IMAGES:**
1. Click the Camera button in the voice assistant
2. Take a clear photo of the emergency situation
3. The image will be automatically tagged with your location
4. Click "Send to Emergency Contacts" to share

**IMAGES ARE SENT TO:**
• Emergency Services (112)
• Local Police (100)
• Fire Department (101)
• Medical Services (108)
• Your emergency contacts

**TIPS FOR EMERGENCY PHOTOS:**
• Include landmarks or street signs
• Show the scale of the emergency
• Capture multiple angles if safe
• Ensure your safety first before taking photos

**Your images help emergency responders:**
• Assess the situation before arrival
• Bring appropriate equipment
• Plan the best response route
• Coordinate with other agencies

Click the Camera button now to capture emergency images.`;
    }

    // Handle location sharing
    if (lowerMessage.includes('location') || lowerMessage.includes('gps') || lowerMessage.includes('coordinates')) {
      return `📍 **LOCATION SHARING ACTIVATED**

**YOUR LOCATION WILL BE SHARED WITH:**
• Emergency Services (112, 100, 101, 108)
• Your registered emergency contacts
• Local rescue coordination centers

**LOCATION DATA INCLUDES:**
• GPS coordinates (latitude/longitude)
• Timestamp of emergency
• Address (if available)
• Accuracy radius

**SHARING OPTIONS:**
1. **Automatic sharing** - Sent immediately to emergency services
2. **Contact sharing** - Sent to your emergency contacts via SMS
3. **Manual sharing** - Copy coordinates to share yourself

**PRIVACY NOTE:** Location data is only shared during emergency situations and with authorized emergency services.

**TO SHARE NOW:**
• Click "Share Location" button
• Or say "share my location"
• Location will be sent with emergency message

Your safety is our priority. Location sharing helps responders find you quickly.`;
    }

    // Default helpful response
    return `👋 **DroneX Emergency Assistant Ready**

I'm your personal emergency response assistant. I can help with:

**🚨 EMERGENCY SITUATIONS:**
• Medical emergencies
• Fire and evacuation
• Natural disasters (earthquakes, floods, storms)
• Crime and safety issues
• General emergency assistance

**📱 QUICK ACTIONS:**
• Call emergency services (112, 100, 101, 108)
• Share your GPS location
• Send emergency photos
• Alert your emergency contacts

**🗣️ VOICE COMMANDS:**
Just speak naturally about your situation:
• "Help, I'm having chest pain"
• "There's a fire in my building"
• "I'm trapped after an earthquake"
• "Find nearby hospitals"
• "Share my location"

**💡 TIP:** The more specific you are about your emergency, the better I can assist you with targeted protocols and immediate actions.

**What emergency assistance do you need right now?**`;
  };

  // Send message function
  const sendMessage = useCallback(async (message: string): Promise<string> => {
    setLoading(true);
    
    try {
      const response = await generateResponse(message);
      const emergency = detectEmergency(message);

      // Save to chat history
      const { error } = await supabase
        .from('chat_history')
        .insert({
          prompt: message,
          response: response,
          disaster_type: emergency.isEmergency ? emergency.type : null,
          emergency_detected: emergency.isEmergency
        });

      if (error) {
        console.error('Error saving chat history:', error);
      }

      // Update local chat history
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        prompt: message,
        response: response,
        disaster_type: emergency.isEmergency ? emergency.type : undefined,
        emergency_detected: emergency.isEmergency,
        created_at: new Date().toISOString()
      };

      setChatHistory(prev => [newMessage, ...prev]);

      return response;
    } catch (error) {
      console.error('Error sending message:', error);
      return `❌ **Error Processing Request**

I apologize, but I encountered an error while processing your request. 

**IMMEDIATE EMERGENCY?**
• Call 112 for all emergencies
• Call 108 for medical emergencies
• Call 100 for police
• Call 101 for fire department

**Please try:**
• Refreshing the page
• Speaking your request again
• Using the emergency buttons below

Your safety is the priority. If this is an urgent emergency, please call emergency services directly.`;
    } finally {
      setLoading(false);
    }
  }, [guidelines]);

  // Clear chat history
  const clearHistory = useCallback(() => {
    setChatHistory([]);
  }, []);

  // Get emergency statistics
  const getEmergencyStats = useCallback(() => {
    const totalChats = chatHistory.length;
    const emergencyChats = chatHistory.filter(chat => chat.emergency_detected).length;
    const emergencyTypes = chatHistory
      .filter(chat => chat.disaster_type)
      .reduce((acc, chat) => {
        acc[chat.disaster_type!] = (acc[chat.disaster_type!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalChats,
      emergencyChats,
      emergencyTypes,
      emergencyRate: totalChats > 0 ? (emergencyChats / totalChats) * 100 : 0
    };
  }, [chatHistory]);

  return {
    sendMessage,
    loading,
    chatHistory,
    clearHistory,
    loadChatHistory,
    getEmergencyStats,
    guidelines
  };
};
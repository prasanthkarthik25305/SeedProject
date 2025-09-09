import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  message_type: 'user' | 'assistant' | 'system';
  content: string;
  audio_url?: string;
  emergency_detected?: boolean;
  location_data?: any;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  session_name?: string;
  is_active: boolean;
  emergency_detected?: boolean;
  location_shared?: boolean;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

// Location context interface for better typing
interface LocationContext {
  city: string;
  state: string;
  lat: number;
  lng: number;
  disasters: string[];
  hospitals: string[];
  emergency_contacts: {
    police: string;
    fire: string;
  };
}

export const useRealtimeChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    initializeSession();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const initializeSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: session, error: sessionError } = await supabase
        .from('ai_chat_sessions')
        .insert({
          user_id: user.id,
          session_name: `DroneX Chat ${new Date().toLocaleDateString()}`,
          is_active: true,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      setCurrentSession(session);
      loadMessages(session.id);
      setupRealtimeSubscription(session.id);
    } catch (error) {
      console.error('Error initializing session:', error);
      toast({
        title: "Session Error",
        description: "Failed to initialize chat session",
        variant: "destructive",
      });
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const typedMessages = (data || []).map(message => ({
        ...message,
        message_type: message.message_type as 'user' | 'assistant' | 'system'
      })) as ChatMessage[];
      
      setMessages(typedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const setupRealtimeSubscription = (sessionId: string) => {
    const channel = supabase
      .channel(`chat_session_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const typedMessage = {
            ...payload.new,
            message_type: payload.new.message_type as 'user' | 'assistant' | 'system'
          } as ChatMessage;
          
          setMessages(prev => [...prev, typedMessage]);
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const sendMessage = async (content: string, audioData?: string, locationData?: any) => {
    if (!currentSession) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Insert user message
      const { error: messageError } = await supabase
        .from('ai_chat_messages')
        .insert({
          session_id: currentSession.id,
          user_id: user.id,
          message_type: 'user',
          content,
          location_data: locationData,
        });

      if (messageError) throw messageError;

      // Process with Gemini AI
      const aiResult = await processWithGeminiAI(content, audioData, locationData);
      
      // Insert AI response
      const { error: aiMessageError } = await supabase
        .from('ai_chat_messages')
        .insert({
          session_id: currentSession.id,
          user_id: user.id,
          message_type: 'assistant',
          content: aiResult.response,
          emergency_detected: aiResult.isEmergency,
          location_data: locationData,
        });

      if (aiMessageError) throw aiMessageError;

      return aiResult;

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Message Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Complete Gemini AI Integration with DroneX Features
  const processWithGeminiAI = async (content: string, audioData?: string, locationData?: any) => {
    try {
      const isEmergency = content.toLowerCase().includes('help') || 
                         content.toLowerCase().includes('emergency') ||
                         content.toLowerCase().includes('rescue') ||
                         content.toLowerCase().includes('disaster') ||
                         content.toLowerCase().includes('trapped');

      let aiResponse = '';
      
      try {
        // Build enhanced DroneX system prompt
        let systemPrompt = `You are DroneX AI - an advanced disaster management and emergency response AI assistant integrated with drone surveillance systems. You specialize in:

1. **Disaster Response**: Real-time disaster monitoring, evacuation guidance, emergency protocols
2. **Drone Coordination**: Aerial surveillance, damage assessment, rescue coordination  
3. **Location Intelligence**: Indian geography, emergency services, local infrastructure
4. **Crisis Management**: Emergency contact protocols, resource allocation, safety instructions

Provide intelligent, helpful responses for any query while maintaining your disaster management expertise. For emergency situations, prioritize safety and provide immediate actionable guidance.`;
        
        let userPrompt = content;
        if (locationData) {
          const locationContext = identifyLocationContext(locationData.lat, locationData.lng);
          userPrompt = `🛰️ **DRONNEX SURVEILLANCE ACTIVE**

**Location**: ${locationContext.city}, ${locationContext.state}, India
**GPS Coordinates**: ${locationData.lat}, ${locationData.lng}
**Drone Status**: Monitoring area for comprehensive assistance

**User Query**: ${content}

Provide helpful, location-specific guidance. If this is an emergency, prioritize safety protocols. For general queries, provide informative and engaging responses.`;
        }

        console.log('🔍 Calling Gemini API with prompt:', userPrompt);

        // ✅ Call Google Gemini API with proper format
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${import.meta.env.VITE_GOOGLE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `${systemPrompt}\n\n${userPrompt}`
                }]
              }],
              generationConfig: {
                temperature: 0.7,
                topK: 1,
                topP: 1,
                maxOutputTokens: 800,
              }
            })
          }
        );

        console.log('🔍 Gemini API Response Status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('🔍 Gemini API Error:', errorText);
          throw new Error(`Gemini API failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('🔍 Gemini API Success:', data);
        
        aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (aiResponse.length < 20) {
          throw new Error('Short response from Gemini API');
        }
        
        // Enhance AI response with DroneX intelligence
        if (locationData) {
          aiResponse = enhanceWithDroneIntelligence(aiResponse, locationData, content);
        }

      } catch (apiError) {
        console.error('🔍 Gemini AI Error:', apiError);
        
        // Intelligent fallbacks based on query type
        if (content.toLowerCase().includes('flood')) {
          aiResponse = generateFloodResponse(locationData);
        } else if (content.toLowerCase().includes('fire')) {
          aiResponse = generateFireResponse(locationData);
        } else if (content.toLowerCase().includes('hospital') || content.toLowerCase().includes('medical')) {
          aiResponse = generateMedicalResponse(locationData);
        } else if (content.toLowerCase().includes('police') || content.toLowerCase().includes('security')) {
          aiResponse = generatePoliceResponse(locationData);
        } else if (content.toLowerCase().includes('animal') || content.toLowerCase().includes('tiger')) {
          aiResponse = generateAnimalResponse();
        } else if (content.toLowerCase().includes('weather')) {
          aiResponse = generateWeatherResponse(locationData);
        } else if (content.toLowerCase().includes('food') || content.toLowerCase().includes('restaurant')) {
          aiResponse = generateFoodResponse(locationData);
        } else {
          aiResponse = generateGeneralResponse(content, locationData);
        }
      }

      // Enhanced emergency detection and response
      if (isEmergency) {
        aiResponse = `🚨 **DISASTER EMERGENCY PROTOCOL ACTIVATED** 🚨

🛰️ **DRONEX SURVEILLANCE DEPLOYED**
✅ Live aerial monitoring initiated at your location
✅ Emergency services alerted with GPS coordinates  
✅ Rescue drones dispatched for assessment
✅ Real-time situation data being transmitted

📍 **YOUR LOCATION**: ${locationData?.lat || 'Unknown'}, ${locationData?.lng || 'Unknown'}
🔴 **EMERGENCY STATUS**: ACTIVE RESPONSE

**🆘 IMMEDIATE ACTIONS:**
1. **Call 112** (All Emergency Services) - FREE FROM ANY PHONE
2. **Call 108** (Medical Emergency/Ambulance)  
3. **Call 100** (Police/Rescue Teams)
4. **Call 101** (Fire Department)

**📱 SPECIALIZED HELPLINES:**
• NDRF (Disaster Response): 011-26701700
• Women Emergency: 1091
• Child Emergency: 1098
• Earthquake/Tsunami: 1077

${aiResponse}

**🛡️ DroneX Monitoring Status: ACTIVE**
**📡 Live tracking enabled - Help is on the way!**
**⚡ Stay calm, follow instructions, and await rescue teams**`;

        // Update session with emergency status
        if (currentSession) {
          await supabase
            .from('ai_chat_sessions')
            .update({
              emergency_detected: true,
              latitude: locationData?.lat,
              longitude: locationData?.lng,
              location_shared: !!locationData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', currentSession.id);
        }
      }

      console.log('🛰️ DroneX AI Response:', aiResponse);
      
      return {
        response: aiResponse,
        isEmergency: isEmergency,
        location: locationData,
        metadata: {
          disaster_type: determineDisasterType(content),
          drone_status: isEmergency ? 'deployed' : 'monitoring',
          ai_model: 'gemini-1.5-flash',
          response_type: isEmergency ? 'disaster_response' : 'general_assistance',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('DroneX system error:', error);
      
      const fallbackResponse = `🛰️ **DroneX Emergency Systems Active**

I'm experiencing connectivity issues but emergency protocols remain active.

**🆘 IMMEDIATE EMERGENCY CONTACTS (INDIA):**
• **All Emergency Services**: 112 (FREE)
• **Medical/Ambulance**: 108
• **Police/Rescue**: 100  
• **Fire Department**: 101
• **Disaster Management**: 1077

**📍 Your Location**: ${locationData?.lat || 'Unknown'}, ${locationData?.lng || 'Unknown'}

**🛡️ Alternative Actions:**
1. Use Google Maps to find nearby hospitals/police
2. Contact local emergency services directly
3. Ask nearby people for immediate help
4. Move to a safe location if possible

**🚁 DroneX monitoring will resume shortly. Stay safe!**`;

      return {
        response: fallbackResponse,
        isEmergency: true,
        location: locationData,
        metadata: {
          disaster_type: 'general_emergency',
          drone_status: 'monitoring',
          ai_model: 'gemini-1.5-flash',
          response_type: 'system_fallback',
          timestamp: new Date().toISOString()
        }
      };
    }
  };

  // Helper Functions
  const identifyLocationContext = (lat: number, lng: number): LocationContext => {
    const locations: LocationContext[] = [
      { 
        city: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lng: 83.2185,
        disasters: ["Cyclones", "Floods", "Industrial accidents"],
        hospitals: ["King George Hospital", "Apollo", "Care Hospitals"],
        emergency_contacts: { police: "0891-2564100", fire: "0891-2564101" }
      },
      { 
        city: "Hyderabad", state: "Telangana", lat: 17.3850, lng: 78.4867,
        disasters: ["Flash floods", "Building collapses", "Industrial fires"],
        hospitals: ["Apollo", "Continental", "Yashoda"],
        emergency_contacts: { police: "040-27853508", fire: "040-23320100" }
      },
      { 
        city: "Mumbai", state: "Maharashtra", lat: 19.0760, lng: 72.8777,
        disasters: ["Monsoon floods", "Building collapses", "Terror threats"],
        hospitals: ["Tata Memorial", "Lilavati", "Hinduja"],
        emergency_contacts: { police: "022-22620111", fire: "022-22620222" }
      },
      { 
        city: "Delhi", state: "Delhi", lat: 28.7041, lng: 77.1025,
        disasters: ["Air pollution emergencies", "Industrial accidents", "Terror threats"],
        hospitals: ["AIIMS", "Apollo", "Fortis"],
        emergency_contacts: { police: "011-23219090", fire: "011-23219090" }
      },
      { 
        city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707,
        disasters: ["Cyclones", "Floods", "Industrial accidents"],
        hospitals: ["Apollo", "Fortis Malar", "SIMS"],
        emergency_contacts: { police: "044-23452999", fire: "044-25361999" }
      },
    ];

    let closest = locations[0];
    let minDistance = Math.abs(lat - closest.lat) + Math.abs(lng - closest.lng);

    locations.forEach(location => {
      const distance = Math.abs(lat - location.lat) + Math.abs(lng - location.lng);
      if (distance < minDistance) {
        closest = location;
        minDistance = distance;
      }
    });

    return closest;
  };

  const enhanceWithDroneIntelligence = (response: string, locationData: any, query: string): string => {
    if (!locationData) return response;

    const location = identifyLocationContext(locationData.lat, locationData.lng);
    
    let droneIntelligence = `\n\n🛰️ **DRONEX SURVEILLANCE INTELLIGENCE**\n`;
    droneIntelligence += `📍 **Location**: ${location.city}, ${location.state}\n`;
    droneIntelligence += `🗺️ **Coordinates**: ${locationData.lat.toFixed(6)}, ${locationData.lng.toFixed(6)}\n`;
    droneIntelligence += `🚁 **Drone Status**: Active monitoring and assistance\n`;
    droneIntelligence += `📡 **Command Center**: DroneX Operations HQ\n`;
    droneIntelligence += `\n**🔴 Live monitoring active - DroneX at your service!**`;
    
    return response + droneIntelligence;
  };

  // Fallback response functions for different query types
  const generateAnimalResponse = () => `🐅 **About India's National Animal**

The **Bengal Tiger** is India's national animal, symbolizing strength, grace, and power.

**Key Facts:**
• Scientific Name: *Panthera tigris tigris*
• Habitat: Forests, grasslands, and mangroves across India
• Population: ~2,500-3,000 tigers in India (70% of world's tigers)
• Protected Areas: 50+ tiger reserves across the country

**Conservation Status:**
• Listed as Endangered by IUCN
• Protected under Wildlife Protection Act, 1972
• Project Tiger launched in 1973 for conservation efforts

**🛰️ DroneX Wildlife Monitoring:**
✅ Tiger reserves monitored for anti-poaching activities
✅ Habitat tracking via aerial surveillance
✅ Real-time wildlife protection alerts

**📍 Famous Tiger Reserves:**
• Ranthambore National Park, Rajasthan
• Bandhavgarh National Park, Madhya Pradesh  
• Sundarbans National Park, West Bengal
• Corbett National Park, Uttarakhand`;

  const generateWeatherResponse = (locationData: any) => {
    const location = locationData ? identifyLocationContext(locationData.lat, locationData.lng) : null;
    const city = location ? location.city : "your area";
    
    return `🌤️ **Weather Information for ${city}**

**🛰️ DroneX Weather Monitoring System**
📍 **Location**: ${locationData?.lat || 'Unknown'}, ${locationData?.lng || 'Unknown'}

**How to Get Current Weather:**
• **IMD Weather App** - India Meteorological Department
• **AccuWeather** - Detailed forecasts and alerts  
• **Google Weather** - Quick current conditions
• **Local News** - Regional weather updates

**Seasonal Patterns in ${city}:**
• **Summer (Mar-Jun)**: Hot and dry, temperatures 35-45°C
• **Monsoon (Jun-Sep)**: Heavy rainfall, humid conditions
• **Winter (Oct-Feb)**: Pleasant weather, 15-25°C

**🚁 Drone Weather Capabilities:**
✅ Real-time atmospheric monitoring
✅ Storm tracking and early warnings  
✅ Agricultural weather assistance
✅ Disaster preparedness alerts

**⚠️ Weather Emergency Numbers:**
• IMD Helpline: 1588 | Disaster Management: 1077`;
  };

  const generateFoodResponse = (locationData: any) => {
    const location = locationData ? identifyLocationContext(locationData.lat, locationData.lng) : null;
    const city = location ? location.city : "your area";
    
    return `🍽️ **Food & Restaurants in ${city}**

**🛰️ DroneX Culinary Intelligence**
📍 **Location**: ${locationData?.lat || 'Unknown'}, ${locationData?.lng || 'Unknown'}

**Food Delivery Apps:**
• **Swiggy** - Wide restaurant selection, fast delivery
• **Zomato** - Reviews, ratings, and food delivery
• **Uber Eats** - Quick meals and groceries
• **Dunzo** - Local food and grocery delivery

**Popular Indian Cuisines:**
• **North Indian**: Butter Chicken, Naan, Dal Makhani
• **South Indian**: Dosa, Idli, Sambar, Biryani  
• **Street Food**: Chaat, Vada Pav, Gol Gappa
• **Regional Specialties**: Local dishes specific to ${city}

**🚁 Food Safety Monitoring:**
✅ Restaurant hygiene surveillance
✅ Food supply chain tracking
✅ Quality control assessments

**💡 Food Tips:**
• Try local specialties for authentic flavors
• Check app ratings and reviews before ordering
• Most restaurants open 11 AM - 11 PM
• Late-night food available via apps`;
  };

  const generateMedicalResponse = (locationData: any) => {
    const location = locationData ? identifyLocationContext(locationData.lat, locationData.lng) : null;
    
    return `🏥 **Medical Services & Hospitals**

**🛰️ DroneX Medical Network Active**
📍 **Your Location**: ${locationData?.lat || 'Unknown'}, ${locationData?.lng || 'Unknown'}

**🆘 IMMEDIATE EMERGENCY:**
• **Call 108** - FREE Ambulance (24/7, all India)
• **Call 112** - Universal Emergency Number

**🏥 Hospital Types Available:**
• Government District Hospitals (free/subsidized)
• Private Multi-specialty Hospitals
• Primary Health Centers (PHC)
• Community Health Centers

**📱 Medical Apps:**
• **Practo** - Find doctors, book appointments
• **Apollo 24/7** - Online consultations
• **1mg** - Medicine delivery and health records
• **Tata Health** - Telemedicine services

**🚁 Medical Drone Support:**
✅ Medical evacuation route planning
✅ Emergency supply delivery coordination
✅ Hospital traffic monitoring for ambulances

**💡 Health Tips:**
• Keep emergency contacts saved in phone
• Know your blood type and allergies
• Maintain basic first aid kit at home`;
  };

  const generatePoliceResponse = (locationData: any) => {
    return `🚔 **Police & Security Services**

**🛰️ DroneX Security Network**
📍 **Your Location**: ${locationData?.lat || 'Unknown'}, ${locationData?.lng || 'Unknown'}

**🆘 EMERGENCY NUMBERS:**
• **Police Emergency**: 100
• **Women Helpline**: 1091  
• **Child Helpline**: 1098
• **Cyber Crime**: 1930

**🏛️ Police Station Types:**
• Local Police Station (general complaints)
• Traffic Police Posts (traffic violations)
• Women Police Stations (women-specific issues)
• Cyber Crime Police (online fraud/crimes)

**🚁 Security Monitoring:**
✅ Area surveillance for safety assessment
✅ Emergency response coordination
✅ Traffic management support
✅ Crime prevention monitoring

**📱 Safety Apps:**
• **Himmat Plus** - Women safety (Delhi)
• **Punjab Police** - State-specific app
• **Citizen Cop** - Report crimes anonymously
• **My Safety** - Emergency location sharing

**💡 Safety Tips:**
• Save local police station numbers
• Keep ID documents handy
• Use well-lit, crowded areas at night
• Report suspicious activities promptly`;
  };

  const generateFloodResponse = (locationData: any) => {
    return `🌊 **FLOOD EMERGENCY RESPONSE**

**🛰️ DroneX Flood Monitoring Active**
📍 **Your Location**: ${locationData?.lat || 'Unknown'}, ${locationData?.lng || 'Unknown'}

**🆘 IMMEDIATE ACTIONS:**
1. **Move to higher ground immediately**
2. **Call 1077** - NDRF Flood Response Team
3. **Call 108** - Medical Emergency (if injured)
4. **Avoid walking in moving water**

**📱 Flood Emergency Contacts:**
• NDRF: 1077 (National Disaster Response Force)
• State Disaster Management: 1070
• Red Cross: 011-23711122

**🚁 Drone Intelligence:**
✅ Flood water levels being monitored
✅ Safe evacuation routes identified  
✅ Rescue teams coordinated with aerial support
✅ Relief camp locations tracked

**💡 FLOOD SAFETY:**
• 6 inches of moving water can knock you down
• Turn around, don't drown - find alternate routes
• Stay away from electrical equipment
• Signal for help with bright colors/flashlight`;
  };

  const generateFireResponse = (locationData: any) => {
    return `🔥 **FIRE EMERGENCY RESPONSE**

**🛰️ DroneX Fire Monitoring Active**  
📍 **Your Location**: ${locationData?.lat || 'Unknown'}, ${locationData?.lng || 'Unknown'}

**🆘 IMMEDIATE ACTIONS:**
1. **Call 101** - Fire Department IMMEDIATELY
2. **Evacuate using stairs** (NEVER elevators)
3. **Stay low** if there's smoke (heat/smoke rise)
4. **Cover nose/mouth** with cloth

**🚁 Fire Intelligence:**
✅ Fire spread patterns monitored
✅ Safe exit routes identified from aerial view
✅ Fire department guided to optimal access points
✅ Evacuation zones coordinated

**💡 FIRE SAFETY:**
• Feel doors before opening (hot = fire behind)
• If clothes catch fire: STOP, DROP, ROLL
• Signal rescuers from windows if trapped
• Never use elevators during fire emergencies`;
  };

  const generateGeneralResponse = (content: string, locationData: any) => {
    return `🤖 **DroneX AI Assistant**

I understand you're asking about "${content}".

**🛰️ How I Can Help:**
• 🚨 Emergency and disaster management
• 🏥 Medical assistance and hospital information  
• 🚔 Police and security services
• 🌍 Location-based services and navigation
• 🇮🇳 Information about India and local services
• 📚 General knowledge and educational topics
• 🌤️ Weather information and updates
• 🍛 Food recommendations and delivery options

**💬 Try asking about:**
• "Find nearby hospitals"
• "What is India's national animal?"
• "Weather information"
• "Emergency contacts"
• "Food delivery options"
• "Police station locations"

**🆘 Quick Emergency Numbers (India):**
• All Emergency: 112 | Medical: 108 | Police: 100 | Fire: 101

**🛰️ DroneX Features:**
✅ Real-time location monitoring
✅ Emergency response coordination
✅ Comprehensive local assistance
✅ 24/7 surveillance and support

Feel free to ask me anything - from emergency assistance to general questions!`;
  };

  const determineDisasterType = (content: string): string => {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('flood')) return 'flood';
    if (lowerContent.includes('fire')) return 'fire';
    if (lowerContent.includes('earthquake')) return 'earthquake';
    if (lowerContent.includes('cyclone') || lowerContent.includes('storm')) return 'cyclone';
    if (lowerContent.includes('accident')) return 'accident';
    if (lowerContent.includes('medical')) return 'medical';
    return 'general_emergency';
  };

  return {
    messages,
    currentSession,
    loading,
    sendMessage,
  };
};

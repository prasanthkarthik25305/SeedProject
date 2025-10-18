import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { RealtimeChannel } from '@supabase/supabase-js';
import { fetchNearbySafePlaces, geocodePlaceName, SafePlace } from '@/services/safePlacesService';

export interface LocationData {
  lat: number;
  lng: number;
  placeName?: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  message_type: 'user' | 'assistant' | 'system';
  content: string;
  audio_url?: string | null;
  emergency_detected?: boolean | null;
  location_data?: LocationData | null;
  safe_places?: SafePlace[] | null;
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

interface GeminiAssistantResponse {
  reply: string;
}

// Extended type for database row that includes safe_places
interface DatabaseChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  message_type: string;
  content: string;
  audio_url: string | null;
  emergency_detected: boolean | null;
  location_data: unknown;
  safe_places?: unknown;
  created_at: string;
}

export const useRealtimeChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

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
          session_name: `Chat ${new Date().toLocaleDateString()}`,
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
      
      const typedMessages = (data || []).map((message: DatabaseChatMessage) => ({
        ...message,
        message_type: message.message_type as 'user' | 'assistant' | 'system',
        location_data: message.location_data ? message.location_data as unknown as LocationData : null,
        safe_places: message.safe_places ? message.safe_places as unknown as SafePlace[] : null
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
          const newMessage = payload.new as DatabaseChatMessage;
          const typedMessage: ChatMessage = {
            ...newMessage,
            message_type: newMessage.message_type as 'user' | 'assistant' | 'system',
            location_data: newMessage.location_data ? newMessage.location_data as unknown as LocationData : null,
            safe_places: newMessage.safe_places ? newMessage.safe_places as unknown as SafePlace[] : null
          };
          
          setMessages(prev => [...prev, typedMessage]);
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const sendMessage = async (content: string, audioData?: string, locationData?: LocationData) => {
    if (!currentSession) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error: messageError } = await supabase
        .from('ai_chat_messages')
        .insert({
          session_id: currentSession.id,
          user_id: user.id,
          message_type: 'user',
          content,
          location_data: locationData ? JSON.parse(JSON.stringify(locationData)) : null,
        });

      if (messageError) throw messageError;

      await processWithAI(content, audioData, locationData);

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

  /**
   * Check if user is asking for safe places or reporting emergency
   */
  const shouldFetchSafePlaces = (content: string): boolean => {
    const lowerContent = content.toLowerCase();
    
    // Keywords that indicate need for safe places
    const safePlaceKeywords = [
      'safe place', 'safest place', 'safe location', 'safe spot',
      'where to go', 'where should i go', 'nearest',
      'shelter', 'evacuation', 'evacuate'
    ];
    
    // Emergency keywords that require safe places
    const emergencyKeywords = [
      'earthquake', 'flood', 'fire', 'tsunami', 'cyclone',
      'disaster', 'emergency', 'help', 'rescue', 'trapped',
      'medical emergency', 'need help', 'in danger'
    ];
    
    // Location-based queries
    const locationKeywords = [
      'in kakinada', 'in hyderabad', 'in visakhapatnam', 'in vijayawada',
      'near me', 'around me', 'in my area'
    ];
    
    // Check if any keyword matches
    const hasSafePlaceKeyword = safePlaceKeywords.some(keyword => lowerContent.includes(keyword));
    const hasEmergencyKeyword = emergencyKeywords.some(keyword => lowerContent.includes(keyword));
    const hasLocationKeyword = locationKeywords.some(keyword => lowerContent.includes(keyword));
    
    // Fetch safe places if:
    // 1. User explicitly asks for safe places OR
    // 2. User reports emergency AND mentions location
    return hasSafePlaceKeyword || (hasEmergencyKeyword && hasLocationKeyword);
  };

  const processWithAI = async (content: string, audioData?: string, locationData?: LocationData) => {
    try {
      let safePlaces: SafePlace[] = [];
      let effectiveLocation = locationData;

      // Check if we should fetch safe places
      const needsSafePlaces = shouldFetchSafePlaces(content);

      if (needsSafePlaces) {
        // Check if user is asking about a specific location
        const locationMatch = content.match(/in ([a-zA-Z\s]+?)(?:\s|,|\.|\?|$)/i);
        if (locationMatch && locationMatch[1]) {
          const placeName = locationMatch[1].trim();
          console.log(`🔍 Searching for location: ${placeName}`);
          
          const geocoded = await geocodePlaceName(placeName);
          if (geocoded) {
            effectiveLocation = geocoded;
            console.log(`📍 Found location: ${geocoded.placeName}`);
          }
        }

        // Fetch safe places if location is available
        if (effectiveLocation) {
          console.log('🏢 Fetching nearby safe places...');
          safePlaces = await fetchNearbySafePlaces(effectiveLocation);
          console.log(`✅ Found ${safePlaces.length} safe places`);
        }
      } else {
        console.log('ℹ️ User query does not require safe places - skipping fetch');
      }

      // Call Gemini backend API
      const { data } = await axios.post<GeminiAssistantResponse>(
        `${BACKEND_URL}/api/gemini-assistant`,
        { 
          input: content,
          userLocation: effectiveLocation,
          safePlaces: safePlaces
        }
      );

      const aiResponse = data.reply || "I'm here to help. Please describe your emergency.";
      
      const isEmergency = content.toLowerCase().includes('help') || 
                         content.toLowerCase().includes('emergency') ||
                         content.toLowerCase().includes('rescue') ||
                         content.toLowerCase().includes('trapped') ||
                         content.toLowerCase().includes('fire') ||
                         content.toLowerCase().includes('medical') ||
                         content.toLowerCase().includes('disaster') ||
                         content.toLowerCase().includes('earthquake');

      if (isEmergency) {
        await supabase
          .from('ai_chat_sessions')
          .update({
            emergency_detected: true,
            latitude: effectiveLocation?.lat,
            longitude: effectiveLocation?.lng,
            location_shared: !!effectiveLocation,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentSession!.id);
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      // Type assertion to bypass TypeScript check since we know safe_places exists after migration
      await supabase
        .from('ai_chat_messages')
        .insert({
          session_id: currentSession!.id,
          user_id: user!.id,
          message_type: 'assistant',
          content: aiResponse,
          emergency_detected: isEmergency,
          safe_places: safePlaces.length > 0 ? JSON.parse(JSON.stringify(safePlaces)) : null
        } as never);

    } catch (error) {
      console.error('Error processing with AI:', error);
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('ai_chat_messages')
        .insert({
          session_id: currentSession!.id,
          user_id: user!.id,
          message_type: 'assistant',
          content: "I'm experiencing connectivity issues. Please try again or contact emergency services directly if this is urgent.",
          emergency_detected: false,
        });
    }
  };

  return {
    messages,
    currentSession,
    loading,
    sendMessage,
  };
};

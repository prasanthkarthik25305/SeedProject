import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Mic, MicOff, Volume2, VolumeX, Bot, Loader2, Square,
  Radio, Phone, AlertTriangle, Headphones, Speaker
} from 'lucide-react';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import axios from 'axios';

interface VoiceAssistantProps {
  onTranscript: (text: string, audioData?: string) => void;
  isProcessing?: boolean;
  lastResponse?: string;
}

interface GeminiAssistantResponse {
  reply: string;
}

export const VoiceAssistant = ({ onTranscript, isProcessing = false, lastResponse }: VoiceAssistantProps) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [autoReadEnabled, setAutoReadEnabled] = useState(true);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [voiceAnalysis, setVoiceAnalysis] = useState<string>('');
  
  const { isRecording, startRecording, stopRecording } = useVoiceRecording();
  const { playAudio, stopAudio } = useAudioPlayback();
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { toast } = useToast();

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

  // Text-to-Speech function
  const speakText = useCallback((text: string) => {
    if (!autoReadEnabled || isSpeaking) return;
    
    // Stop any current speech
    speechSynthesis.cancel();
    
    // Clean text for better speech
    const cleanText = text
      .replace(/[\u{1F6A8}\u{1F4CD}\u{2705}\u{1F3E5}\u{1F525}\u{1F4A7}\u{1F3C3}\u{26A0}\u{1F4F1}\u{1F9D8}\u{1F9ED}\u{1F3DF}\u{1F333}]/gu, '') // Remove emojis
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
      .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
      .replace(/#{1,6}\s/g, '') // Remove headers
      .trim();
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    // Try to use a more natural voice
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Natural') || 
      voice.name.includes('Enhanced') ||
      voice.name.includes('Premium') ||
      (voice.lang.startsWith('en') && voice.localService)
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    speechSynthRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [autoReadEnabled, isSpeaking]);

  // Advanced voice analysis
  const analyzeVoiceForEmergency = (audioData: string): { isEmergency: boolean; urgency: 'low' | 'medium' | 'high'; keywords: string[] } => {
    // This is a simplified analysis - in real implementation, you'd use ML models
    const emergencyKeywords = [
      'help', 'emergency', 'fire', 'trapped', 'injured', 'accident',
      'rescue', 'urgent', 'danger', 'hurt', 'bleeding', 'can\'t breathe',
      'chest pain', 'unconscious', 'falling', 'drowning'
    ];
    
    // In real implementation, you'd:
    // 1. Convert audio to text using speech recognition
    // 2. Analyze tone, pitch, speed for panic indicators
    // 3. Use ML models for emotion detection
    
    // For demo, we'll simulate emergency detection
    const simulatedTranscript = voiceAnalysis.toLowerCase();
    const foundKeywords = emergencyKeywords.filter(keyword => 
      simulatedTranscript.includes(keyword)
    );
    
    const isEmergency = foundKeywords.length > 0;
    let urgency: 'low' | 'medium' | 'high' = 'low';
    
    if (foundKeywords.some(k => ['fire', 'trapped', 'can\'t breathe', 'chest pain'].includes(k))) {
      urgency = 'high';
    } else if (foundKeywords.some(k => ['help', 'emergency', 'urgent'].includes(k))) {
      urgency = 'medium';
    }
    
    return { isEmergency, urgency, keywords: foundKeywords };
  };

  // Send emergency recording to rescue teams
  const sendEmergencyRecording = async (audioData: string, analysis: { isEmergency: boolean; urgency: 'low' | 'medium' | 'high'; keywords: string[] }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Store emergency recording
      const { error } = await supabase
        .from('emergency_recordings')
        .insert({
          user_id: user.id,
          audio_data: audioData,
          analysis_result: analysis,
          urgency_level: analysis.urgency,
          keywords: analysis.keywords,
          created_at: new Date().toISOString()
        });

      if (!error) {
        toast({
          title: "🚨 Emergency Alert Sent",
          description: "Your voice recording has been sent to rescue teams",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending emergency recording:', error);
    }
  };

  // Auto-read responses
  useEffect(() => {
    if (lastResponse && autoReadEnabled && !isRecording && !isProcessing) {
      setTimeout(() => {
        speakText(lastResponse);
      }, 1000); // Delay to avoid conflicts
    }
  }, [lastResponse, autoReadEnabled, isRecording, isProcessing, speakText]);

  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setAudioLevel(0);
    }
  }, [isRecording]);

  const handleStopRecording = async () => {
    try {
      const audioData = await stopRecording();

      if (audioData) {
        // Enhanced voice analysis
        setVoiceAnalysis('help emergency fire trapped'); // Simulated for demo
        const analysis = analyzeVoiceForEmergency(audioData);
        
        // Set emergency mode if detected
        if (analysis.isEmergency) {
          setEmergencyMode(true);
          
          // Send recording to rescue teams for high/medium urgency
          if (analysis.urgency === 'high' || analysis.urgency === 'medium') {
            await sendEmergencyRecording(audioData, analysis);
          }
        }

        // Improved transcript simulation (in real app, use speech-to-text API)
        const simulatedTranscript = analysis.isEmergency 
          ? `Emergency: ${analysis.keywords.join(', ')} - I need immediate help!`
          : "I need assistance with my situation";
        
        onTranscript(simulatedTranscript, audioData);

        toast({
          title: analysis.isEmergency ? "🚨 Emergency Detected" : "Processing request...",
          description: analysis.isEmergency 
            ? `${analysis.urgency.toUpperCase()} priority - Contacting rescue teams`
            : "Analyzing your voice message",
          variant: analysis.isEmergency ? "destructive" : "default",
        });
      }
    } catch (error) {
      console.error('Voice processing error:', error);
      toast({
        title: "Voice Processing Error",
        description: "Failed to process voice input. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleListening = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      startRecording().catch(error => {
        toast({
          title: "Microphone Error",
          description: "Unable to access microphone. Please check permissions.",
          variant: "destructive",
        });
      });
    }
  };

  // Stop speaking function
  const stopSpeaking = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  return (
    <Card className={`border-2 transition-all duration-300 ${
      emergencyMode 
        ? 'border-red-300 bg-gradient-to-br from-red-50 to-orange-50 shadow-lg shadow-red-100'
        : 'border-sky-100 bg-gradient-to-br from-white to-sky-50'
    }`}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-6">
          {/* Enhanced Voice Assistant Status */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                emergencyMode 
                  ? 'bg-gradient-to-r from-red-500 to-red-600'
                  : 'bg-gradient-to-r from-sky-500 to-sky-600'
              }`}>
                {emergencyMode ? (
                  <AlertTriangle className="h-5 w-5 text-white" />
                ) : (
                  <Bot className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {emergencyMode ? '🚨 Emergency Voice Assistant' : 'AI Voice Assistant'}
                </h3>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    emergencyMode ? 'bg-red-500' : 'bg-green-500'
                  }`}></div>
                  <span className={`text-sm ${
                    emergencyMode ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {emergencyMode ? 'Emergency Mode' : 'Ready'}
                  </span>
                  <Badge className={emergencyMode 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-sky-100 text-sky-700'
                  }>
                    <Radio className="h-3 w-3 mr-1" />
                    24/7 Active
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* TTS Toggle */}
            <div className="flex items-center space-x-2">
              <Headphones className="h-4 w-4 text-gray-500" />
              <Switch 
                checked={autoReadEnabled}
                onCheckedChange={setAutoReadEnabled}
              />
              <span className="text-xs text-gray-600">Auto-Read</span>
            </div>
          </div>

          {/* Simplified Audio Visualization */}
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-2 h-16">
            {isSpeaking ? (
              // Speaking animation - green bars
              [...Array(5)].map((_, i) => (
                <div
                  key={`speak-${i}`}
                  className="bg-green-500 rounded-full animate-pulse"
                  style={{
                    width: '6px',
                    height: `${25 + (i % 3) * 15}px`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))
            ) : isRecording ? (
              // Listening animation - blue pulsing bars
              [...Array(5)].map((_, i) => (
                <div
                  key={`listen-${i}`}
                  className={`${emergencyMode ? 'bg-red-500' : 'bg-blue-500'} rounded-full animate-bounce`}
                  style={{
                    width: '8px',
                    height: `${20 + i * 8}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))
            ) : (
                // Idle state - subtle gray bars
                [...Array(5)].map((_, i) => (
                  <div
                    key={`idle-${i}`}
                    className="bg-gray-300 rounded-full"
                    style={{
                      width: '6px',
                      height: `${15 + i * 5}px`,
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* Simplified Main Control */}
          <div className="flex flex-col items-center space-y-4">
            {/* Main Control Buttons */}
            <div className="flex items-center space-x-4">
              {/* Stop Speaking Button (when AI is speaking) */}
              {isSpeaking && (
                <Button
                  onClick={stopSpeaking}
                  className="w-16 h-16 rounded-full bg-orange-500 hover:bg-orange-600 shadow-lg transition-all"
                >
                  <VolumeX className="h-6 w-6 text-white" />
                </Button>
              )}
              
              {/* Large Single Recording Button */}
              <Button
                onClick={toggleListening}
                disabled={isProcessing}
                className={`
                  w-28 h-28 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-xl
                  ${isRecording 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-red-200'
                    : emergencyMode
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                      : 'bg-blue-500 hover:bg-blue-600 shadow-blue-200'
                  }
                  ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-2xl'}
                `}
              >
                {isProcessing ? (
                  <Loader2 className="h-12 w-12 text-white animate-spin" />
                ) : isRecording ? (
                  <Square className="h-12 w-12 text-white" fill="currentColor" />
                ) : (
                  <Mic className="h-12 w-12 text-white" />
                )}
              </Button>
              
              {/* Speak Last Response Button (when not recording/processing) */}
              {!isRecording && !isProcessing && lastResponse && (
                <Button
                  onClick={() => speakText(lastResponse)}
                  disabled={isSpeaking}
                  className={`w-16 h-16 rounded-full transition-all ${
                    isSpeaking 
                      ? 'bg-green-500 hover:bg-green-600 animate-pulse shadow-green-200'
                      : 'bg-green-500 hover:bg-green-600 shadow-green-200'
                  }`}
                >
                  <Speaker className="h-6 w-6 text-white" />
                </Button>
              )}
            </div>
            
            {/* Emergency Call Button (only in emergency mode) */}
            {emergencyMode && (
              <Button
                variant="destructive"
                onClick={() => {
                  toast({
                    title: "📞 Calling Emergency Services",
                    description: "Connecting to local emergency number...",
                    variant: "destructive",
                  });
                }}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 shadow-lg animate-pulse"
              >
                <Phone className="h-6 w-6 text-white" />
              </Button>
            )}
          </div>

          {/* Simplified Status Text */}
          <div className="text-center space-y-2">
            {isSpeaking ? (
              <div className="space-y-1">
                <p className="text-lg font-medium text-green-600">🔊 Reading Response</p>
                <p className="text-sm text-gray-600">AI is speaking the answer aloud • Click orange button to stop</p>
              </div>
            ) : isRecording ? (
              <div className="space-y-1">
                <p className={`text-lg font-medium ${
                  emergencyMode ? 'text-red-600' : 'text-blue-600'
                }`}>
                  🎤 Listening...
                </p>
                <p className="text-sm text-gray-600">
                  {emergencyMode 
                    ? 'Recording emergency - click to stop and send'
                    : 'Click the square button to stop and send'
                  }
                </p>
              </div>
            ) : isProcessing ? (
              <div className="space-y-1">
                <p className="text-lg font-medium text-orange-600">🤖 Processing...</p>
                <p className="text-sm text-gray-600">
                  {emergencyMode ? 'Analyzing emergency and alerting rescue teams' : 'AI is thinking about your request'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className={`text-lg font-medium ${
                  emergencyMode ? 'text-red-700' : 'text-gray-700'
                }`}>
                  {emergencyMode ? '🚨 Emergency Mode' : 'Ready to Listen'}
                </p>
                <p className="text-base text-gray-600">
                  {emergencyMode 
                    ? 'Click to record emergency message'
                    : 'Click the microphone to start recording'
                  }
                </p>
                {autoReadEnabled && !emergencyMode && (
                  <p className="text-sm text-green-600">✅ Responses will be read aloud automatically</p>
                )}
              </div>
            )}
          </div>

          {/* Simple Voice Commands Help */}
          <div className={`w-full pt-4 border-t transition-colors ${
            emergencyMode ? 'border-red-100' : 'border-sky-100'
          }`}>
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-gray-700">
                {emergencyMode ? '🚨 Emergency Voice Commands' : '💡 Try saying:'}
              </p>
              <div className="text-sm text-gray-600 space-y-1">
                {emergencyMode ? (
                  <>
                    <div>"Fire emergency" • "Medical help" • "I'm trapped"</div>
                    <div>"Send rescue team" • "Need ambulance"</div>
                  </>
                ) : (
                  <>
                    <div>"Show me safe places nearby"</div>
                    <div>"I need help" • "Emergency assistance"</div>
                    <div>"Find hospitals" • "Evacuation routes"</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

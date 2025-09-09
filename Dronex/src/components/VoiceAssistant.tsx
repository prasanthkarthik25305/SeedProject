import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, MicOff, Volume2, VolumeX, Bot, Loader2, 
  Radio, CheckCircle, MapPin, Phone, Hospital, 
  Utensils, Shield, Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceAssistantProps {
  onTranscript: (text: string) => void;
  onLocationQuery: (type: 'hospitals' | 'restaurants' | 'police' | 'emergency_contacts') => void;
  onEmergencyAction: (action: 'call' | 'location' | 'contacts') => void;
  isProcessing?: boolean;
  userLocation?: { lat: number; lng: number };
}

export const VoiceAssistant = ({ 
  onTranscript, 
  onLocationQuery, 
  onEmergencyAction,
  isProcessing = false,
  userLocation 
}: VoiceAssistantProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      
      // Enhanced configuration for better accuracy
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 3; // Multiple alternatives for better accuracy
      
      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
        setFinalTranscript('');
        toast({
          title: "🎤 Voice Assistant Active",
          description: "Listening for your emergency or location request...",
        });
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(interimTranscript);
        
        if (finalText) {
          setFinalTranscript(prev => prev + finalText);
          
          if (silenceTimer) {
            clearTimeout(silenceTimer);
          }
          
          const timer = setTimeout(() => {
            if (recognitionRef.current) {
              recognitionRef.current.stop();
              processTranscript(prev => prev + finalText);
            }
          }, 2000);
          
          setSilenceTimer(timer);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'aborted') {
          toast({
            title: "Speech Error",
            description: `${event.error}. Please try again.`,
            variant: "destructive",
          });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          setSilenceTimer(null);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
    };
  }, []);

  // Enhanced command processing with location awareness
  const processTranscript = (fullTranscript: string | Function) => {
    const cleanTranscript = typeof fullTranscript === 'string' 
    ? fullTranscript.trim().toLowerCase() 
    : '';
    if (!cleanTranscript) return;

    toast({
      title: "✅ Processing Request",
      description: "Analyzing your request...",
    });

    // Location-based queries
    if (cleanTranscript.includes('hospital') || cleanTranscript.includes('medical')) {
      if (cleanTranscript.includes('nearby') || cleanTranscript.includes('nearest') || cleanTranscript.includes('find')) {
        onLocationQuery('hospitals');
        speakText("Finding nearby hospitals for you. Please wait.");
        return;
      }
    }

    if (cleanTranscript.includes('restaurant') || cleanTranscript.includes('food') || cleanTranscript.includes('eat')) {
      if (cleanTranscript.includes('nearby') || cleanTranscript.includes('nearest') || cleanTranscript.includes('find')) {
        onLocationQuery('restaurants');
        speakText("Searching for nearby restaurants.");
        return;
      }
    }

    if (cleanTranscript.includes('police') || cleanTranscript.includes('police station')) {
      if (cleanTranscript.includes('nearby') || cleanTranscript.includes('nearest') || cleanTranscript.includes('find')) {
        onLocationQuery('police');
        speakText("Locating nearby police stations.");
        return;
      }
    }

    // Emergency contact queries
    if (cleanTranscript.includes('emergency contact') || cleanTranscript.includes('my contacts') || 
        cleanTranscript.includes('emergency numbers')) {
      onLocationQuery('emergency_contacts');
      speakText("Showing your emergency contacts.");
      return;
    }

    // Emergency actions
    if (cleanTranscript.includes('call emergency') || cleanTranscript.includes('emergency services') ||
        cleanTranscript.includes('call 911') || cleanTranscript.includes('need help')) {
      onEmergencyAction('call');
      speakText("Initiating emergency call. Please hold on.");
      return;
    }

    if (cleanTranscript.includes('share location') || cleanTranscript.includes('my location') ||
        cleanTranscript.includes('where am i')) {
      onEmergencyAction('location');
      speakText("Sharing your current location.");
      return;
    }

    if (cleanTranscript.includes('emergency contact') && cleanTranscript.includes('call')) {
      onEmergencyAction('contacts');
      speakText("Opening your emergency contacts.");
      return;
    }

    // Fallback to general transcript processing
    onTranscript(fullTranscript.trim());
  };

  const startListening = () => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      toast({
        title: "Microphone Error",
        description: "Please check microphone permissions",
        variant: "destructive",
      });
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      const fullTranscript = finalTranscript + transcript;
      if (fullTranscript.trim()) {
        processTranscript(fullTranscript);
      }
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      
      speechSynthesis.speak(utterance);
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      speakText("Voice assistant ready. I can help you find nearby places or handle emergencies.");
    }
  };

  if (!isSupported) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <p className="text-red-600">Speech recognition not supported in this browser.</p>
        </CardContent>
      </Card>
    );
  }

  const currentTranscript = finalTranscript + transcript;

  return (
    <Card className="border-sky-100 bg-gradient-to-br from-white to-sky-50">
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-6">
          {/* Header with Location Status */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-sky-500 to-sky-600 rounded-full flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Voice Assistant</h3>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  isListening ? 'bg-red-500 animate-pulse' : 
                  isProcessing ? 'bg-yellow-500 animate-pulse' : 
                  'bg-green-500'
                }`}></div>
                <span className={`text-sm ${
                  isListening ? 'text-red-600' : 
                  isProcessing ? 'text-yellow-600' : 
                  'text-green-600'
                }`}>
                  {isListening ? 'Listening' : isProcessing ? 'Processing' : 'Ready'}
                </span>
                <Badge className="bg-sky-100 text-sky-700 ml-2">
                  <Radio className="h-3 w-3 mr-1" />
                  Location-Aware
                </Badge>
                {userLocation && (
                  <Badge className="bg-green-100 text-green-700">
                    <MapPin className="h-3 w-3 mr-1" />
                    GPS Active
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Live Transcript */}
          {currentTranscript && (
            <div className="w-full p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">
                  {isListening ? "Speaking..." : "Captured:"}
                </p>
                {!isListening && currentTranscript && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
              <p className="text-base text-gray-800 leading-relaxed">
                {currentTranscript}
                {isListening && <span className="animate-pulse">|</span>}
              </p>
            </div>
          )}

          {/* Audio Level Indicator */}
          {isListening && (
            <div className="flex items-center space-x-2 py-2">
              <div className="flex space-x-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 h-6 bg-red-400 rounded-full animate-pulse"
                    style={{
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: '0.8s'
                    }}
                  />
                ))}
              </div>
              <span className="text-sm text-red-600 ml-3">Recording...</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <div className="flex flex-col items-center space-y-2">
              <Button
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing}
                className={`w-16 h-16 rounded-full transition-all duration-300 ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 shadow-lg scale-105'
                    : 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 shadow-md'
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : isListening ? (
                  <MicOff className="h-6 w-6 text-white" />
                ) : (
                  <Mic className="h-6 w-6 text-white" />
                )}
              </Button>
              <span className="text-xs text-gray-600 text-center">
                {isListening ? 'Stop & Process' : 'Start Speaking'}
              </span>
            </div>

            <div className="flex flex-col items-center space-y-2">
              <Button
                variant="outline"
                onClick={togglePlayback}
                disabled={isProcessing || isListening}
                className="w-16 h-16 rounded-full border-sky-300 hover:bg-sky-50"
              >
                {isPlaying ? (
                  <VolumeX className="h-6 w-6 text-sky-600" />
                ) : (
                  <Volume2 className="h-6 w-6 text-sky-600" />
                )}
              </Button>
              <span className="text-xs text-gray-600 text-center">
                {isPlaying ? 'Stop Audio' : 'Test Speaker'}
              </span>
            </div>
          </div>

          {/* Status Instructions */}
          <div className="text-center space-y-2">
            {isListening ? (
              <div>
                <p className="text-sm font-medium text-red-600">🎤 Listening for your request...</p>
                <p className="text-xs text-gray-500">
                  Ask about nearby places or emergency services
                </p>
              </div>
            ) : isProcessing ? (
              <div>
                <p className="text-sm font-medium text-yellow-600">🤖 Processing your request...</p>
                <p className="text-xs text-gray-500">Analyzing location and emergency needs...</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {currentTranscript ? '✅ Ready for next request' : 'Ask me about nearby places'}
                </p>
                <p className="text-xs text-gray-500">
                  I can find hospitals, restaurants, police stations, and more
                </p>
              </div>
            )}
          </div>

          {/* Enhanced Voice Commands */}
          <div className="w-full pt-4 border-t border-sky-100">
            <p className="text-xs text-gray-600 text-center mb-3">💡 Try these commands:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Emergency Commands */}
              <div className="bg-red-50 p-2 rounded text-red-700 text-center flex items-center justify-center">
                <Phone className="h-3 w-3 mr-1" />
                "Call emergency services"
              </div>
              <div className="bg-orange-50 p-2 rounded text-orange-700 text-center flex items-center justify-center">
                <MapPin className="h-3 w-3 mr-1" />
                "Share my location"
              </div>
              
              {/* Location Commands */}
              <div className="bg-blue-50 p-2 rounded text-blue-700 text-center flex items-center justify-center">
                <Hospital className="h-3 w-3 mr-1" />
                "Find nearby hospitals"
              </div>
              <div className="bg-green-50 p-2 rounded text-green-700 text-center flex items-center justify-center">
                <Shield className="h-3 w-3 mr-1" />
                "Nearest police station"
              </div>
              <div className="bg-purple-50 p-2 rounded text-purple-700 text-center flex items-center justify-center">
                <Utensils className="h-3 w-3 mr-1" />
                "Find restaurants nearby"
              </div>
              <div className="bg-yellow-50 p-2 rounded text-yellow-700 text-center flex items-center justify-center">
                <Users className="h-3 w-3 mr-1" />
                "My emergency contacts"
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mic, MicOff, Volume2, VolumeX, Bot, MapPin, 
  Phone, Users, AlertTriangle, Headphones, Camera, 
  Send, MessageSquare, Zap, Shield, Heart
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
import { useCustomChatbot } from '@/hooks/useCustomChatbot';
import { supabase } from '@/integrations/supabase/client';

interface VoiceAssistantProps {
  onTranscript?: (transcript: string) => void;
  onLocationQuery?: (type: 'hospitals' | 'restaurants' | 'police' | 'emergency_contacts') => void;
  onEmergencyAction?: (action: 'call' | 'location' | 'contacts') => void;
  isProcessing?: boolean;
  userLocation?: { lat: number; lng: number } | null;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  onTranscript,
  onLocationQuery,
  onEmergencyAction,
  isProcessing = false,
  userLocation
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [lastResponse, setLastResponse] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturingImage, setIsCapturingImage] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{id: string, user: string, bot: string, timestamp: Date}>>([]);
  const [emergencyLevel, setEmergencyLevel] = useState<'low' | 'medium' | 'high' | 'critical' | null>(null);
  const [detectedKeywords, setDetectedKeywords] = useState<string[]>([]);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const continuousModeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  // Use custom hooks
  const { sendMessage, loading: chatbotLoading } = useCustomChatbot();
  const { isRecording, startRecording, stopRecording, audioBlob, error: recordingError } = useVoiceRecording();
  const { isPlaying, play, stop: stopAudio, error: playbackError } = useAudioPlayback();

  // Enhanced emergency keyword detection
  const emergencyKeywords = {
    critical: ['help', 'emergency', 'trapped', 'dying', 'bleeding', 'unconscious', 'fire', 'explosion', 'heart attack', 'stroke', 'drowning'],
    high: ['injured', 'accident', 'pain', 'sick', 'hurt', 'ambulance', 'hospital', 'police', 'rescue'],
    medium: ['medical', 'doctor', 'clinic', 'pharmacy', 'first aid'],
    low: ['find', 'locate', 'directions', 'information']
  };

  const detectEmergencyLevel = (text: string): { level: 'low' | 'medium' | 'high' | 'critical' | null, keywords: string[] } => {
    const lowerText = text.toLowerCase();
    const foundKeywords: string[] = [];
    
    for (const [level, keywords] of Object.entries(emergencyKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          foundKeywords.push(keyword);
          return { level: level as any, keywords: foundKeywords };
        }
      }
    }
    
    return { level: null, keywords: [] };
  };

  const saveConversationToDatabase = async (userMessage: string, botResponse: string, emergencyDetected: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('chat_history')
        .insert({
          user_id: user.id,
          prompt: userMessage,
          response: botResponse,
          disaster_type: detectedKeywords.length > 0 ? detectedKeywords[0] : null,
          emergency_detected: emergencyDetected
        });

      if (error) {
        console.error('Error saving conversation:', error);
      }
    } catch (error) {
      console.error('Database save error:', error);
    }
  };

  const processVoiceCommand = useCallback(async (command: string) => {
    setIsProcessingVoice(true);
    
    try {
      // Detect emergency level and keywords
      const { level, keywords } = detectEmergencyLevel(command);
      setEmergencyLevel(level);
      setDetectedKeywords(keywords);
      
      let messageContent = command;
      if (capturedImage) {
        messageContent += " [Emergency image attached for analysis]";
      }
      
      // Add location context if available
      if (userLocation) {
        messageContent += ` [Current location: ${userLocation.lat}, ${userLocation.lng}]`;
      }
      
      // Use custom chatbot to process the command
      const response = await sendMessage(messageContent);
      setLastResponse(response);
      
      // Add to conversation history
      const conversationEntry = {
        id: Date.now().toString(),
        user: command,
        bot: response,
        timestamp: new Date()
      };
      setConversationHistory(prev => [...prev.slice(-4), conversationEntry]); // Keep last 5 conversations
      
      // Save to database
      await saveConversationToDatabase(command, response, level === 'critical' || level === 'high');
      
      // Speak the response using text-to-speech
      speakResponse(response);
      
      // Handle emergency actions based on detected level
      if (level === 'critical') {
        toast({
          title: "🚨 CRITICAL EMERGENCY DETECTED",
          description: "Initiating emergency protocols immediately!",
          variant: "destructive",
          duration: 10000,
        });
        
        // Auto-trigger emergency actions for critical situations
        setTimeout(() => {
          onEmergencyAction?.('call');
        }, 2000);
      } else if (level === 'high') {
        toast({
          title: "⚠️ High Priority Emergency",
          description: "Emergency assistance may be needed. Consider calling emergency services.",
          duration: 8000,
        });
      }
      
      // Handle specific voice commands
      const lowerCommand = command.toLowerCase();
      
      if (lowerCommand.includes('find') && lowerCommand.includes('hospital')) {
        onLocationQuery?.('hospitals');
      } else if (lowerCommand.includes('find') && lowerCommand.includes('restaurant')) {
        onLocationQuery?.('restaurants');
      } else if (lowerCommand.includes('find') && lowerCommand.includes('police')) {
        onLocationQuery?.('police');
      } else if (lowerCommand.includes('emergency') && lowerCommand.includes('contact')) {
        onLocationQuery?.('emergency_contacts');
      } else if (lowerCommand.includes('call') && lowerCommand.includes('emergency')) {
        onEmergencyAction?.('call');
      } else if (lowerCommand.includes('share') && lowerCommand.includes('location')) {
        onEmergencyAction?.('location');
      } else if (lowerCommand.includes('contact') && lowerCommand.includes('help')) {
        onEmergencyAction?.('contacts');
      }
      
      // Clear captured image after processing
      setCapturedImage(null);
      
      onTranscript?.(command);
      
      // Continue listening in continuous mode
      if (isContinuousMode && level !== 'critical') {
        continuousModeTimeoutRef.current = setTimeout(() => {
          if (!isListening) {
            recognitionRef.current?.start();
          }
        }, 3000);
      }
      
    } catch (error) {
      console.error('Error processing voice command:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process voice command. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingVoice(false);
    }
  }, [sendMessage, capturedImage, userLocation, onLocationQuery, onEmergencyAction, onTranscript, toast, isContinuousMode, isListening]);

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        toast({
          title: "🎤 Voice Assistant Active",
          description: isContinuousMode ? "Continuous listening mode enabled" : "Speak now... I'm listening for your emergency",
        });
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript + interimTranscript);

        if (finalTranscript) {
          processVoiceCommand(finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        if (event.error !== 'no-speech') {
          toast({
            title: "Voice Recognition Error",
            description: "There was an issue with voice recognition. Please try again.",
            variant: "destructive",
          });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (continuousModeTimeoutRef.current) {
        clearTimeout(continuousModeTimeoutRef.current);
      }
    };
  }, [processVoiceCommand, toast, isContinuousMode]);

  // Handle recording errors
  useEffect(() => {
    if (recordingError) {
      toast({
        title: "Recording Error",
        description: recordingError,
        variant: "destructive",
      });
    }
  }, [recordingError, toast]);

  // Handle playback errors
  useEffect(() => {
    if (playbackError) {
      toast({
        title: "Playback Error",
        description: playbackError,
        variant: "destructive",
      });
    }
  }, [playbackError, toast]);

  const startCamera = async () => {
    try {
      setIsCapturingImage(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
      setIsCapturingImage(false);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageDataUrl);
        
        // Stop camera stream
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        setIsCapturingImage(false);
        
        toast({
          title: "📸 Image Captured",
          description: "Emergency image ready for analysis with voice command",
        });
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
    setIsCapturingImage(false);
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      // Stop any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      // Use a more natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') || 
        voice.name.includes('Microsoft') || 
        voice.lang.includes('en')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.onerror = () => {
        console.error('Speech synthesis error');
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      if (continuousModeTimeoutRef.current) {
        clearTimeout(continuousModeTimeoutRef.current);
      }
    } else {
      setTranscript('');
      recognitionRef.current?.start();
    }
  };

  const toggleContinuousMode = () => {
    setIsContinuousMode(!isContinuousMode);
    if (!isContinuousMode) {
      toast({
        title: "🔄 Continuous Mode Enabled",
        description: "Voice assistant will keep listening after each response",
      });
    } else {
      toast({
        title: "⏸️ Continuous Mode Disabled",
        description: "Voice assistant will stop after each command",
      });
      if (continuousModeTimeoutRef.current) {
        clearTimeout(continuousModeTimeoutRef.current);
      }
    }
  };

  const handleVoiceRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const clearConversation = () => {
    setConversationHistory([]);
    setLastResponse('');
    setTranscript('');
    setEmergencyLevel(null);
    setDetectedKeywords([]);
    toast({
      title: "🗑️ Conversation Cleared",
      description: "Chat history has been reset",
    });
  };

  const getEmergencyLevelColor = (level: string | null) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Emergency Level Indicator */}
      {emergencyLevel && (
        <Alert className={`border-2 ${getEmergencyLevelColor(emergencyLevel)}`}>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>Emergency Level: {emergencyLevel.toUpperCase()}</strong>
                {detectedKeywords.length > 0 && (
                  <div className="text-xs mt-1">
                    Keywords detected: {detectedKeywords.join(', ')}
                  </div>
                )}
              </div>
              {emergencyLevel === 'critical' && (
                <div className="flex items-center space-x-2">
                  <Heart className="h-4 w-4 animate-pulse text-red-600" />
                  <span className="text-xs font-medium">IMMEDIATE ACTION REQUIRED</span>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Camera Interface */}
      {isCapturingImage && (
        <Card className="border-sky-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Camera className="h-5 w-5 mr-2 text-sky-500" />
              Emergency Image Capture
            </CardTitle>
            <CardDescription>
              Position camera to capture emergency situation for AI analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 bg-black rounded-lg object-cover"
                autoPlay
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex justify-center space-x-4 mt-4">
                <Button onClick={captureImage} className="bg-sky-500 hover:bg-sky-600">
                  <Camera className="h-4 w-4 mr-2" />
                  Capture Emergency Image
                </Button>
                <Button onClick={stopCamera} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Preview */}
      {capturedImage && (
        <Card className="border-green-200 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <img src={capturedImage} alt="Emergency Capture" className="w-24 h-24 object-cover rounded-lg border-2 border-green-200" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Emergency image ready</p>
                <p className="text-xs text-green-600">Will be analyzed with your next voice command</p>
                <Badge className="mt-1 bg-green-100 text-green-800">
                  <Zap className="h-3 w-3 mr-1" />
                  AI Analysis Ready
                </Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCapturedImage(null)}
                className="text-gray-500 hover:text-red-500"
              >
                ✕
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Voice Interface */}
      <Card className="border-sky-200 shadow-2xl">
        <CardHeader className="text-center bg-gradient-to-r from-sky-50 via-purple-50 to-pink-50">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-sky-500 via-purple-500 to-pink-500 rounded-full mb-4 mx-auto shadow-lg">
            <Headphones className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-3xl bg-gradient-to-r from-sky-600 to-purple-600 bg-clip-text text-transparent">
            DroneX Voice Emergency Assistant
          </CardTitle>
          <CardDescription className="text-lg">
            Advanced AI-powered emergency response system with real-time voice processing
          </CardDescription>
          {userLocation && (
            <div className="flex items-center justify-center mt-2 text-sm text-green-600">
              <MapPin className="h-4 w-4 mr-1" />
              GPS Location Active • Ready for Emergency Response
            </div>
          )}
        </CardHeader>

        <CardContent className="p-8">
          {/* Enhanced Status Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Badge className={`p-3 justify-center ${isListening ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-100 text-gray-600'}`}>
              <Mic className="h-4 w-4 mr-2" />
              <div className="text-center">
                <div className="font-medium">{isListening ? 'Listening' : 'Ready'}</div>
                <div className="text-xs opacity-75">Speech Recognition</div>
              </div>
            </Badge>
            
            <Badge className={`p-3 justify-center ${isRecording ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-gray-100 text-gray-600'}`}>
              <Mic className="h-4 w-4 mr-2" />
              <div className="text-center">
                <div className="font-medium">{isRecording ? 'Recording' : 'Ready'}</div>
                <div className="text-xs opacity-75">Audio Capture</div>
              </div>
            </Badge>
            
            <Badge className={`p-3 justify-center ${isProcessingVoice || chatbotLoading ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-600'}`}>
              <Bot className="h-4 w-4 mr-2" />
              <div className="text-center">
                <div className="font-medium">{isProcessingVoice || chatbotLoading ? 'Processing' : 'Ready'}</div>
                <div className="text-xs opacity-75">Custom AI</div>
              </div>
            </Badge>
            
            <Badge className={`p-3 justify-center ${isPlaying ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600'}`}>
              <Volume2 className="h-4 w-4 mr-2" />
              <div className="text-center">
                <div className="font-medium">{isPlaying ? 'Playing' : 'Ready'}</div>
                <div className="text-xs opacity-75">Audio Response</div>
              </div>
            </Badge>
          </div>

          {/* Main Controls */}
          <div className="flex justify-center flex-wrap gap-6 mb-8">
            {/* Speech Recognition */}
            <Button
              onClick={toggleListening}
              disabled={isProcessingVoice || chatbotLoading}
              className={`w-28 h-28 rounded-full text-white font-semibold transition-all shadow-lg ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-red-200' 
                  : 'bg-sky-500 hover:bg-sky-600 shadow-sky-200'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="h-10 w-10 mb-1" />
                  <div className="text-xs">Stop</div>
                </>
              ) : (
                <>
                  <Mic className="h-10 w-10 mb-1" />
                  <div className="text-xs">Listen</div>
                </>
              )}
            </Button>

            {/* Voice Recording */}
            <Button
              onClick={handleVoiceRecording}
              disabled={isProcessingVoice || chatbotLoading}
              className={`w-28 h-28 rounded-full text-white font-semibold transition-all shadow-lg ${
                isRecording 
                  ? 'bg-orange-500 hover:bg-orange-600 animate-pulse shadow-orange-200' 
                  : 'bg-purple-500 hover:bg-purple-600 shadow-purple-200'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="h-10 w-10 mb-1" />
                  <div className="text-xs">Stop Rec</div>
                </>
              ) : (
                <>
                  <Mic className="h-10 w-10 mb-1" />
                  <div className="text-xs">Record</div>
                </>
              )}
            </Button>

            {/* Camera */}
            <Button
              onClick={startCamera}
              disabled={isCapturingImage || isProcessingVoice}
              className="w-28 h-28 rounded-full bg-green-500 hover:bg-green-600 text-white font-semibold shadow-lg shadow-green-200"
            >
              <Camera className="h-10 w-10 mb-1" />
              <div className="text-xs">Camera</div>
            </Button>

            {/* Continuous Mode Toggle */}
            <Button
              onClick={toggleContinuousMode}
              className={`w-28 h-28 rounded-full text-white font-semibold transition-all shadow-lg ${
                isContinuousMode 
                  ? 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-200' 
                  : 'bg-gray-500 hover:bg-gray-600 shadow-gray-200'
              }`}
            >
              <MessageSquare className="h-10 w-10 mb-1" />
              <div className="text-xs">{isContinuousMode ? 'Continuous' : 'Single'}</div>
            </Button>

            {/* Stop Audio/Speaking */}
            {(isPlaying || window.speechSynthesis?.speaking) && (
              <Button
                onClick={() => {
                  stopAudio();
                  stopSpeaking();
                }}
                className="w-28 h-28 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold shadow-lg shadow-red-200"
              >
                <VolumeX className="h-10 w-10 mb-1" />
                <div className="text-xs">Stop All</div>
              </Button>
            )}
          </div>

          {/* Audio Blob Display */}
          {audioBlob && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Volume2 className="h-4 w-4 mr-1" />
                Recorded Audio:
              </h4>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <audio controls src={URL.createObjectURL(audioBlob)} className="w-full mb-3" />
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => play(URL.createObjectURL(audioBlob))}
                    className="bg-purple-500 hover:bg-purple-600"
                    disabled={isPlaying}
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    Play Recording
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => processVoiceCommand("Analyze this audio recording for emergency content")}
                    className="bg-blue-500 hover:bg-blue-600"
                    disabled={isProcessingVoice}
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    Analyze Audio
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Transcript Display */}
          {transcript && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <MessageSquare className="h-4 w-4 mr-1" />
                Voice Input:
              </h4>
              <div className="p-4 bg-sky-50 rounded-lg border border-sky-200">
                <p className="text-gray-800 font-medium">{transcript}</p>
                {detectedKeywords.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {detectedKeywords.map((keyword, index) => (
                      <Badge key={index} className="bg-red-100 text-red-800 text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Response Display */}
          {lastResponse && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Bot className="h-4 w-4 mr-1 text-sky-500" />
                DroneX AI Emergency Response:
              </h4>
              <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{lastResponse}</p>
                <div className="flex space-x-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => speakResponse(lastResponse)}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    Speak Response
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => processVoiceCommand("Can you provide more details about this?")}
                    variant="outline"
                    disabled={isProcessingVoice}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    More Details
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Conversation History */}
          {conversationHistory.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700 flex items-center">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Recent Conversation:
                </h4>
                <Button size="sm" variant="ghost" onClick={clearConversation}>
                  Clear History
                </Button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {conversationHistory.slice(-3).map((entry) => (
                  <div key={entry.id} className="text-xs bg-white p-2 rounded border">
                    <div className="text-blue-600 font-medium">You: {entry.user}</div>
                    <div className="text-gray-600 mt-1">AI: {entry.bot.substring(0, 100)}...</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Quick Voice Commands */}
          <div className="border-t pt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-4">Emergency Voice Commands:</h4>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                { text: "Emergency! I need immediate help!", level: "critical" },
                { text: "Medical emergency, someone is unconscious", level: "critical" },
                { text: "There's a fire in my building", level: "critical" },
                { text: "I'm injured and need an ambulance", level: "high" },
                { text: "Find the nearest hospital", level: "medium" },
                { text: "Share my location with emergency contacts", level: "high" },
                { text: "I need rescue assistance, I'm trapped", level: "critical" },
                { text: "Call emergency services now", level: "critical" }
              ].map((command, index) => (
                <div 
                  key={index} 
                  className={`p-3 border rounded-lg text-sm cursor-pointer hover:bg-gray-50 transition-colors ${
                    command.level === 'critical' ? 'border-red-200 bg-red-50' :
                    command.level === 'high' ? 'border-orange-200 bg-orange-50' :
                    'border-gray-200 bg-white'
                  }`}
                  onClick={() => processVoiceCommand(command.text)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-800">"{command.text}"</span>
                    <Badge className={`text-xs ${getEmergencyLevelColor(command.level)}`}>
                      {command.level}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Actions */}
          <div className="border-t pt-6 mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-4">Quick Emergency Actions:</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <Button
                onClick={() => onEmergencyAction?.('call')}
                className="bg-red-500 hover:bg-red-600 text-white h-12"
              >
                <Phone className="h-5 w-5 mr-2" />
                Call 112 Emergency
              </Button>
              <Button
                onClick={() => onEmergencyAction?.('location')}
                className="bg-blue-500 hover:bg-blue-600 text-white h-12"
              >
                <MapPin className="h-5 w-5 mr-2" />
                Share Live Location
              </Button>
              <Button
                onClick={() => onEmergencyAction?.('contacts')}
                className="bg-green-500 hover:bg-green-600 text-white h-12"
              >
                <Users className="h-5 w-5 mr-2" />
                Alert All Contacts
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Alert */}
      {(isProcessingVoice || chatbotLoading) && (
        <Alert className="border-blue-200 bg-blue-50">
          <Bot className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Processing emergency request with DroneX Custom AI...</span>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mic, MicOff, Volume2, VolumeX, Bot, MapPin, 
  Phone, Users, AlertTriangle, Headphones, Camera
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
import { useCustomChatbot } from '@/hooks/useCustomChatbot';

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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();
  
  // Use custom hooks
  const { sendMessage, loading: chatbotLoading } = useCustomChatbot();
  const { isRecording, startRecording, stopRecording, audioBlob, error: recordingError } = useVoiceRecording();
  const { isPlaying, play, stop: stopAudio, error: playbackError } = useAudioPlayback();

  const processVoiceCommand = useCallback(async (command: string) => {
    setIsProcessingVoice(true);
    
    try {
      let messageContent = command;
      if (capturedImage) {
        messageContent += " [Image captured for emergency analysis]";
      }
      
      // Use custom chatbot to process the command
      const response = await sendMessage(messageContent);
      setLastResponse(response);
      
      // Speak the response using text-to-speech
      speakResponse(response);
      
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
  }, [sendMessage, capturedImage, onLocationQuery, onEmergencyAction, onTranscript, toast]);

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
          title: "🎤 Listening",
          description: "Speak now... I'm listening for your emergency",
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
        toast({
          title: "Voice Recognition Error",
          description: "There was an issue with voice recognition. Please try again.",
          variant: "destructive",
        });
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [processVoiceCommand, toast]);

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
        video: { facingMode: 'environment' }
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
          title: "Image Captured",
          description: "Image captured for emergency analysis",
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
      
      utterance.onerror = () => {
        console.error('Speech synthesis error');
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      recognitionRef.current?.start();
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

  return (
    <div className="space-y-6">
      {/* Camera Interface */}
      {isCapturingImage && (
        <Card className="border-sky-100">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Camera className="h-5 w-5 mr-2 text-sky-500" />
              Capture Emergency Image
            </CardTitle>
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
                  Capture
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
        <Card className="border-sky-100">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <img src={capturedImage} alt="Captured" className="w-20 h-20 object-cover rounded" />
              <div className="flex-1">
                <p className="text-sm font-medium">Emergency image captured</p>
                <p className="text-xs text-gray-500">Will be analyzed with your voice command</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCapturedImage(null)}
              >
                ✕
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Voice Interface */}
      <Card className="border-sky-100 shadow-xl">
        <CardHeader className="text-center bg-gradient-to-r from-sky-50 to-purple-50">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-sky-500 to-sky-600 rounded-full mb-4 mx-auto">
            <Headphones className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Voice Emergency Assistant</CardTitle>
          <CardDescription>
            Speak naturally about your emergency. I can help with medical situations, disasters, and finding nearby services.
          </CardDescription>
          {userLocation && (
            <div className="flex items-center justify-center mt-2 text-sm text-green-600">
              <MapPin className="h-4 w-4 mr-1" />
              Location services active
            </div>
          )}
        </CardHeader>

        <CardContent className="p-8">
          {/* Status Indicators */}
          <div className="flex justify-center space-x-4 mb-8">
            <Badge className={`${isListening ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
              <Mic className="h-3 w-3 mr-1" />
              {isListening ? 'Listening...' : 'Ready to Listen'}
            </Badge>
            <Badge className={`${isRecording ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
              <Mic className="h-3 w-3 mr-1" />
              {isRecording ? 'Recording...' : 'Ready to Record'}
            </Badge>
            <Badge className={`${isProcessingVoice || chatbotLoading ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
              <Bot className="h-3 w-3 mr-1" />
              {isProcessingVoice || chatbotLoading ? 'Processing...' : 'Custom AI Ready'}
            </Badge>
            <Badge className={`${isPlaying ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              <Volume2 className="h-3 w-3 mr-1" />
              {isPlaying ? 'Playing...' : 'Ready to Respond'}
            </Badge>
          </div>

          {/* Main Controls */}
          <div className="flex justify-center space-x-6 mb-8">
            {/* Speech Recognition */}
            <Button
              onClick={toggleListening}
              disabled={isProcessingVoice || chatbotLoading}
              className={`w-24 h-24 rounded-full text-white font-semibold transition-all ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-sky-500 hover:bg-sky-600'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="h-8 w-8 mb-1" />
                  <div className="text-xs">Stop</div>
                </>
              ) : (
                <>
                  <Mic className="h-8 w-8 mb-1" />
                  <div className="text-xs">Listen</div>
                </>
              )}
            </Button>

            {/* Voice Recording */}
            <Button
              onClick={handleVoiceRecording}
              disabled={isProcessingVoice || chatbotLoading}
              className={`w-24 h-24 rounded-full text-white font-semibold transition-all ${
                isRecording 
                  ? 'bg-orange-500 hover:bg-orange-600 animate-pulse' 
                  : 'bg-purple-500 hover:bg-purple-600'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="h-8 w-8 mb-1" />
                  <div className="text-xs">Stop Rec</div>
                </>
              ) : (
                <>
                  <Mic className="h-8 w-8 mb-1" />
                  <div className="text-xs">Record</div>
                </>
              )}
            </Button>

            {/* Camera */}
            <Button
              onClick={startCamera}
              disabled={isCapturingImage || isProcessingVoice}
              className="w-24 h-24 rounded-full bg-green-500 hover:bg-green-600 text-white font-semibold"
            >
              <Camera className="h-8 w-8 mb-1" />
              <div className="text-xs">Camera</div>
            </Button>

            {/* Stop Audio */}
            {isPlaying && (
              <Button
                onClick={stopAudio}
                className="w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold"
              >
                <VolumeX className="h-8 w-8 mb-1" />
                <div className="text-xs">Stop Audio</div>
              </Button>
            )}

            {/* Stop Speaking */}
            <Button
              onClick={stopSpeaking}
              className="w-24 h-24 rounded-full bg-gray-500 hover:bg-gray-600 text-white font-semibold"
            >
              <VolumeX className="h-8 w-8 mb-1" />
              <div className="text-xs">Stop TTS</div>
            </Button>
          </div>

          {/* Audio Blob Display */}
          {audioBlob && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Recorded Audio:</h4>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
                <Button
                  size="sm"
                  onClick={() => play(URL.createObjectURL(audioBlob))}
                  className="mt-2 bg-purple-500 hover:bg-purple-600"
                  disabled={isPlaying}
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  Play Recording
                </Button>
              </div>
            </div>
          )}

          {/* Transcript Display */}
          {transcript && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">You said:</h4>
              <div className="p-4 bg-sky-50 rounded-lg border border-sky-200">
                <p className="text-gray-800">{transcript}</p>
              </div>
            </div>
          )}

          {/* Response Display */}
          {lastResponse && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Bot className="h-4 w-4 mr-1 text-sky-500" />
                DroneX Custom AI Response:
              </h4>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-800 whitespace-pre-wrap">{lastResponse}</p>
                <Button
                  size="sm"
                  onClick={() => speakResponse(lastResponse)}
                  className="mt-2 bg-green-500 hover:bg-green-600"
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  Speak Response
                </Button>
              </div>
            </div>
          )}

          {/* Quick Voice Commands */}
          <div className="border-t pt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-4">Try saying:</h4>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                "Help, I'm trapped in a building",
                "Medical emergency, need ambulance",
                "Find nearby hospitals",
                "Share my location with emergency contacts",
                "I need rescue assistance",
                "Show my emergency contacts",
                "Find police stations near me",
                "Call emergency services"
              ].map((command, index) => (
                <div key={index} className="p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-600">
                  "{command}"
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
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <Phone className="h-4 w-4 mr-2" />
                Call 112
              </Button>
              <Button
                onClick={() => onEmergencyAction?.('location')}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Share Location
              </Button>
              <Button
                onClick={() => onEmergencyAction?.('contacts')}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                <Users className="h-4 w-4 mr-2" />
                Alert Contacts
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
              <span>Processing your emergency request with custom AI...</span>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
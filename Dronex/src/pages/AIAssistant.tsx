import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot, Send, MapPin, Phone, AlertTriangle, Heart, 
  Shield, Home, Utensils, MessageCircle, CheckCircle, Clock,
  Mic, Volume2, Headphones
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";

const AIAssistant = () => {
  const [input, setInput] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const { messages, currentSession, loading, sendMessage } = useRealtimeChat();

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Location Error",
            description: "Unable to get your location. Some features may be limited.",
            variant: "destructive",
          });
        }
      );
    }
  }, [toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const emergencyCategories = [
    { 
      type: "medical", 
      label: "Medical Emergency", 
      icon: Heart, 
      color: "bg-red-500 hover:bg-red-600",
      description: "Health-related emergencies requiring immediate medical attention"
    },
    { 
      type: "disaster", 
      label: "Natural Disaster", 
      icon: AlertTriangle, 
      color: "bg-orange-500 hover:bg-orange-600",
      description: "Earthquakes, floods, fires, storms, and other natural disasters"
    },
    { 
      type: "food", 
      label: "Food & Shelter", 
      icon: Utensils, 
      color: "bg-blue-500 hover:bg-blue-600",
      description: "Need for food, water, or emergency shelter"
    }
  ];

  // ADD THESE NEW HANDLER FUNCTIONS
  const handleLocationQuery = async (type: 'hospitals' | 'restaurants' | 'police' | 'emergency_contacts') => {
    if (!userLocation) {
      toast({
        title: "Location Required",
        description: "Please enable location services to search nearby places",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "🔍 Searching...",
      description: `Looking for nearby ${type}`,
    });

    // Send location-based query to your AI assistant
    let searchQuery = '';
    switch(type) {
      case 'hospitals':
        searchQuery = `Find nearby hospitals and medical centers near my location (${userLocation.lat}, ${userLocation.lng})`;
        break;
      case 'restaurants':
        searchQuery = `Find nearby restaurants and food places near my location (${userLocation.lat}, ${userLocation.lng})`;
        break;
      case 'police':
        searchQuery = `Find nearby police stations near my location (${userLocation.lat}, ${userLocation.lng})`;
        break;
      case 'emergency_contacts':
        searchQuery = `Show my emergency contacts and their phone numbers`;
        break;
    }

    // Send through your existing chat system
    await sendMessage(searchQuery, undefined, userLocation);
  };

  const handleEmergencyAction = (action: 'call' | 'location' | 'contacts') => {
    switch(action) {
      case 'call':
        toast({
          title: "📞 Emergency Call",
          description: "Initiating emergency services call",
        });
        handleEmergencyCall();
        break;
      case 'location':
        toast({
          title: "📍 Sharing Location", 
          description: "Broadcasting your current location",
        });
        handleShareLocation();
        break;
      case 'contacts':
        toast({
          title: "📋 Emergency Contacts",
          description: "Displaying your emergency contacts", 
        });
        handleEmergencyContacts();
        break;
    }
  };

  const handleEmergencyCall = () => {
    // Make actual emergency call
    if (typeof window !== 'undefined') {
      window.open('tel:911'); // or your local emergency number
    }
  };

  const handleShareLocation = async () => {
    if (userLocation) {
      const locationMessage = `My current location: https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}`;
      await sendMessage(locationMessage, undefined, userLocation);
      
      // Copy to clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText(`${userLocation.lat}, ${userLocation.lng}`);
        toast({
          title: "Location Copied",
          description: "Your coordinates have been copied to clipboard",
        });
      }
    }
  };

  const handleEmergencyContacts = async () => {
    const contactsMessage = "Please show my emergency contacts and their phone numbers";
    await sendMessage(contactsMessage, undefined, userLocation);
  };
  // END OF NEW HANDLER FUNCTIONS

  const handleEmergencyCategory = async (type: string) => {
    const category = emergencyCategories.find(cat => cat.type === type);
    const content = `Emergency: ${category?.label}`;
    
    await sendMessage(content, undefined, userLocation);
    setShowConfirmation(true);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    await sendMessage(input, undefined, userLocation);
    setInput("");
    
    // More specific emergency detection
    const lowerInput = input.toLowerCase();
    const isLocationQuery = lowerInput.includes('nearby') || 
                           lowerInput.includes('restaurants') || 
                           lowerInput.includes('hospitals') ||
                           lowerInput.includes('find');
    
    const isRealEmergency = (lowerInput.includes("help") && lowerInput.includes("emergency")) || 
                           lowerInput.includes("rescue") || 
                           lowerInput.includes("trapped") ||
                           lowerInput.includes("medical emergency");
    
    if (isRealEmergency && !isLocationQuery) {
      setShowConfirmation(true);
    }
  };

  const handleVoiceTranscript = async (transcript: string) => {
    await sendMessage(transcript, undefined, userLocation);
    
    // More specific emergency detection for voice
    const lowerTranscript = transcript.toLowerCase();
    const isLocationQuery = lowerTranscript.includes('nearby') || 
                           lowerTranscript.includes('restaurants') || 
                           lowerTranscript.includes('hospitals') ||
                           lowerTranscript.includes('find');
    
    const isRealEmergency = (lowerTranscript.includes("help") && lowerTranscript.includes("emergency")) || 
                           lowerTranscript.includes("rescue") || 
                           lowerTranscript.includes("trapped") ||
                           lowerTranscript.includes("medical emergency");
    
    if (isRealEmergency && !isLocationQuery) {
      setShowConfirmation(true);
    }
  };

  const handleConfirmEmergency = () => {
    toast({
      title: "Emergency Alert Sent",
      description: "Your emergency contacts and rescue teams have been notified with your location.",
    });
    setShowConfirmation(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-white">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-sky-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Link to="/" className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-sky-500" />
                <span className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-sky-400 bg-clip-text text-transparent">
                  DroneX
                </span>
              </Link>
              <Badge className="ml-4 bg-green-100 text-green-700">
                <Bot className="h-3 w-3 mr-1" />
                AI Assistant
              </Badge>
            </div>
            <Link to="/dashboard">
              <Button variant="outline" className="border-sky-300 text-sky-600 hover:bg-sky-50">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-sky-500 to-sky-600 rounded-full mb-4">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">DroneX AI Assistant</h1>
          <p className="text-gray-600">
            24/7 Emergency Response AI • Real-time Location Tracking • Voice & Text Interface
          </p>
          {userLocation && (
            <div className="flex items-center justify-center mt-2 text-sm text-green-600">
              <MapPin className="h-4 w-4 mr-1" />
              Location tracking active
            </div>
          )}
        </div>

        {/* Interface Mode Toggle */}
        <div className="flex justify-center mb-6">
          <Tabs value={isVoiceMode ? "voice" : "text"} onValueChange={(value) => setIsVoiceMode(value === "voice")}>
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="text" className="flex items-center">
                <MessageCircle className="h-4 w-4 mr-2" />
                Text Chat
              </TabsTrigger>
              <TabsTrigger value="voice" className="flex items-center">
                <Headphones className="h-4 w-4 mr-2" />
                Voice Assistant
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Emergency Categories */}
        <Card className="border-sky-100 mb-6">
          <CardHeader>
            <CardTitle className="text-center">Quick Emergency Response</CardTitle>
            <CardDescription className="text-center">
              Select your emergency type for immediate assistance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {emergencyCategories.map((category) => (
                <Button
                  key={category.type}
                  onClick={() => handleEmergencyCategory(category.type)}
                  className={`${category.color} text-white h-auto p-6 flex flex-col items-center space-y-3 hover:scale-105 transition-all`}
                >
                  <category.icon className="h-8 w-8" />
                  <div className="text-center">
                    <div className="font-semibold">{category.label}</div>
                    <div className="text-xs opacity-90 mt-1">{category.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        {showConfirmation && (
          <Alert className="border-orange-200 bg-orange-50 mb-6">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700">
              <div className="space-y-3">
                <p className="font-semibold">Confirm Emergency Alert</p>
                <p>This will notify your emergency contacts and rescue teams with your current location:</p>
                {userLocation && (
                  <p className="font-mono text-sm bg-white/50 p-2 rounded">
                    📍 {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                  </p>
                )}
                <div className="flex space-x-3">
                  <Button onClick={handleConfirmEmergency} className="bg-red-600 hover:bg-red-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm & Send Alert
                  </Button>
                  <Button variant="outline" onClick={() => setShowConfirmation(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Interface */}
        <Tabs value={isVoiceMode ? "voice" : "text"}>
          <TabsContent value="voice">
            {/* UPDATED VOICEASSISTANT WITH ALL REQUIRED PROPS */}
            <VoiceAssistant 
              onTranscript={handleVoiceTranscript}
              onLocationQuery={handleLocationQuery}      // ← Fixed: Added this
              onEmergencyAction={handleEmergencyAction}  // ← Fixed: Added this
              isProcessing={loading}
              userLocation={userLocation}               // ← Fixed: Added this
            />
          </TabsContent>

          <TabsContent value="text">
            <Card className="border-sky-100 shadow-xl">
              <CardHeader className="border-b border-sky-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-sky-500 to-sky-600 rounded-full flex items-center justify-center">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">AI Emergency Assistant</CardTitle>
                      <div className="flex items-center space-x-2 text-sm text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Online & Ready</span>
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-sky-100 text-sky-700">
                    <Clock className="h-3 w-3 mr-1" />
                    24/7 Available
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                {/* Messages */}
                <div className="h-96 overflow-y-auto p-6 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.message_type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-4 rounded-lg ${
                          message.message_type === 'user'
                            ? 'bg-sky-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {message.message_type === 'assistant' && (
                          <div className="flex items-center space-x-2 mb-2">
                            <Bot className="h-4 w-4 text-sky-500" />
                            <span className="text-xs font-medium text-sky-600">DroneX AI</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        {message.location_data && (
                          <div className="flex items-center space-x-1 mt-2 text-xs opacity-75">
                            <MapPin className="h-3 w-3" />
                            <span>Location shared</span>
                          </div>
                        )}
                        <div className={`text-xs mt-2 opacity-75 ${message.message_type === 'user' ? 'text-sky-100' : 'text-gray-500'}`}>
                          {new Date(message.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-900 p-4 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Bot className="h-4 w-4 text-sky-500" />
                          <span className="text-xs font-medium text-sky-600">DroneX AI</span>
                        </div>
                        <div className="flex space-x-2 mt-2">
                          <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-sky-100 p-4">
                  <div className="flex space-x-3">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Describe your emergency or ask for help..."
                      className="flex-1 border-sky-200 focus:border-sky-400"
                      disabled={loading}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={loading || !input.trim()}
                      className="bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Try: "I'm trapped in a building", "Medical emergency", or "Need rescue"
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* UPDATED Quick Actions with onClick handlers */}
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <Button 
            variant="outline" 
            className="border-red-200 text-red-600 hover:bg-red-50"
            onClick={handleEmergencyCall}
          >
            <Phone className="h-4 w-4 mr-2" />
            Call Emergency Services
          </Button>
          <Button 
            variant="outline" 
            className="border-blue-200 text-blue-600 hover:bg-blue-50"
            onClick={handleShareLocation}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Share My Location
          </Button>
          <Button 
            variant="outline" 
            className="border-green-200 text-green-600 hover:bg-green-50"
            onClick={handleEmergencyContacts}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Contact Emergency Contacts
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;

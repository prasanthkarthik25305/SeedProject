import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Bot, 
  Mic, 
  MessageSquare, 
  MapPin, 
  Camera, 
  Phone,
  Activity,
  BarChart3,
  History,
  Settings,
  Send,
  Image,
  Users,
  Share2
} from 'lucide-react';
import { VoiceAssistant } from '@/components/VoiceAssistant';
import { EnhancedLocationService } from '@/components/EnhancedLocationService';
import { useCustomChatbot } from '@/hooks/useCustomChatbot';
import { useToast } from '@/hooks/use-toast';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  address?: string;
}

const AIAssistant: React.FC = () => {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [activeTab, setActiveTab] = useState('voice');
  const [chatInput, setChatInput] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const { sendMessage, loading, chatHistory, getEmergencyStats, clearHistory } = useCustomChatbot();
  const [currentResponse, setCurrentResponse] = useState('');
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stats = getEmergencyStats();

  // Emergency contacts for image sharing
  const emergencyContacts = [
    { name: 'Emergency Services', number: '112', type: 'official' },
    { name: 'Police', number: '100', type: 'official' },
    { name: 'Fire Department', number: '101', type: 'official' },
    { name: 'Medical Emergency', number: '108', type: 'official' },
    { name: 'Family Contact 1', number: '+91-9876543210', type: 'personal' },
    { name: 'Family Contact 2', number: '+91-9876543211', type: 'personal' },
  ];

  const handleLocationUpdate = (location: LocationData) => {
    setCurrentLocation(location);
  };

  const handleLocationShare = (location: LocationData) => {
    toast({
      title: "Location Shared",
      description: "Emergency location sent to contacts and services",
    });
  };

  const handleLocationQuery = (type: 'hospitals' | 'restaurants' | 'police' | 'emergency_contacts') => {
    const services = {
      hospitals: ['City General Hospital', 'Emergency Medical Center', 'District Hospital'],
      restaurants: ['24/7 Restaurant', 'Emergency Food Service', 'Quick Bite'],
      police: ['Central Police Station', 'Emergency Response Unit', 'Local Police Post'],
      emergency_contacts: ['Emergency Contact 1', 'Emergency Contact 2', 'Emergency Contact 3']
    };

    toast({
      title: `Finding ${type}`,
      description: `Located ${services[type].length} nearby ${type}`,
    });
  };

  const handleEmergencyAction = (action: 'call' | 'location' | 'contacts') => {
    switch (action) {
      case 'call':
        window.open('tel:112');
        toast({
          title: "Calling Emergency Services",
          description: "Dialing 112...",
        });
        break;
      case 'location':
        if (currentLocation) {
          handleLocationShare(currentLocation);
        } else {
          toast({
            title: "Location Unavailable",
            description: "Please enable location services first",
            variant: "destructive",
          });
        }
        break;
      case 'contacts':
        toast({
          title: "Alerting Emergency Contacts",
          description: "Sending emergency alerts to your contacts",
        });
        break;
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || loading) return;

    const message = chatInput.trim();
    setChatInput('');
    
    try {
      const response = await sendMessage(message);
      setCurrentResponse(response);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Chat Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startCamera = async () => {
    try {
      setIsCapturing(true);
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
      setIsCapturing(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        
        // Stop camera stream
        const stream = video.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        setIsCapturing(false);
        
        toast({
          title: "Photo Captured",
          description: "Emergency photo captured successfully",
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
    setIsCapturing(false);
  };

  const sendImageToContacts = async () => {
    if (!capturedImage) {
      toast({
        title: "No Image",
        description: "Please capture an image first",
        variant: "destructive",
      });
      return;
    }

    try {
      // Simulate sending image to emergency contacts
      const locationText = currentLocation 
        ? `Location: ${currentLocation.latitude}, ${currentLocation.longitude}\nTime: ${new Date().toLocaleString()}`
        : 'Location unavailable';

      const message = `🚨 EMERGENCY ALERT 🚨\n\nEmergency image captured and shared.\n${locationText}\n\nThis is an automated emergency message from DroneX Emergency Response System.`;

      // Simulate sending to each contact
      for (const contact of emergencyContacts) {
        console.log(`Sending emergency image to ${contact.name} (${contact.number})`);
        // In production, integrate with SMS/MMS service
      }

      // Create a group chat simulation
      const groupChatMessage = {
        id: Date.now().toString(),
        sender: 'Emergency System',
        message: message,
        image: capturedImage,
        timestamp: new Date().toISOString(),
        recipients: emergencyContacts.map(c => c.name)
      };

      console.log('Group chat message created:', groupChatMessage);

      toast({
        title: "Image Sent Successfully",
        description: `Emergency image sent to ${emergencyContacts.length} contacts`,
      });

      // Clear captured image after sending
      setCapturedImage(null);
    } catch (error) {
      console.error('Error sending image:', error);
      toast({
        title: "Send Failed",
        description: "Failed to send image to contacts",
        variant: "destructive",
      });
    }
  };

  const clearCapturedImage = () => {
    setCapturedImage(null);
    toast({
      title: "Image Cleared",
      description: "Captured image removed",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">DroneX AI Assistant</h1>
          <p className="text-lg text-gray-600">Advanced emergency response and assistance system</p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">{stats.totalChats}</div>
              <div className="text-sm text-gray-600">Total Conversations</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600 mb-1">{stats.emergencyChats}</div>
              <div className="text-sm text-gray-600">Emergency Alerts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {currentLocation ? 'Active' : 'Inactive'}
              </div>
              <div className="text-sm text-gray-600">Location Services</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {Math.round(stats.emergencyRate)}%
              </div>
              <div className="text-sm text-gray-600">Emergency Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="voice" className="flex items-center space-x-2">
              <Mic className="h-4 w-4" />
              <span>Voice Assistant</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center space-x-2">
              <Bot className="h-4 w-4" />
              <span>Custom Chatbot</span>
            </TabsTrigger>
            <TabsTrigger value="location" className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>Location</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <History className="h-4 w-4" />
              <span>Chat History</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Statistics</span>
            </TabsTrigger>
          </TabsList>

          {/* Voice Assistant Tab */}
          <TabsContent value="voice" className="space-y-6">
            <VoiceAssistant
              onLocationQuery={handleLocationQuery}
              onEmergencyAction={handleEmergencyAction}
              userLocation={currentLocation ? { lat: currentLocation.latitude, lng: currentLocation.longitude } : null}
            />
          </TabsContent>

          {/* Custom Chatbot Tab */}
          <TabsContent value="chat" className="space-y-6">
            <Card className="border-sky-100 shadow-xl">
              <CardHeader className="text-center bg-gradient-to-r from-sky-50 to-purple-50">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-sky-500 to-sky-600 rounded-full mb-4 mx-auto">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl">DroneX Custom Chatbot</CardTitle>
                <CardDescription>
                  AI-powered emergency assistance with photo capture and contact sharing
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {/* Photo Capture Section */}
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                    <Camera className="h-4 w-4 mr-2 text-purple-500" />
                    Emergency Photo Capture & Sharing
                  </h4>
                  
                  {!isCapturing && !capturedImage && (
                    <Button
                      onClick={startCamera}
                      className="w-full bg-purple-500 hover:bg-purple-600 text-white mb-3"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Start Camera
                    </Button>
                  )}

                  {isCapturing && (
                    <div className="space-y-3">
                      <video
                        ref={videoRef}
                        className="w-full h-48 bg-black rounded-lg"
                        autoPlay
                        playsInline
                        muted
                      />
                      <div className="flex space-x-2">
                        <Button
                          onClick={capturePhoto}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Capture Photo
                        </Button>
                        <Button
                          onClick={stopCamera}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {capturedImage && (
                    <div className="space-y-3">
                      <div className="relative">
                        <img
                          src={capturedImage}
                          alt="Captured emergency"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <Badge className="absolute top-2 left-2 bg-green-500 text-white">
                          <Camera className="h-3 w-3 mr-1" />
                          Emergency Photo
                        </Badge>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={sendImageToContacts}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Send to Emergency Contacts
                        </Button>
                        <Button
                          onClick={clearCapturedImage}
                          variant="outline"
                          className="flex-1"
                        >
                          Clear
                        </Button>
                      </div>
                      <div className="text-xs text-gray-600">
                        <p className="font-medium mb-1">Will be sent to:</p>
                        <div className="grid grid-cols-2 gap-1">
                          {emergencyContacts.slice(0, 4).map((contact, idx) => (
                            <span key={idx} className="flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              {contact.name}
                            </span>
                          ))}
                        </div>
                        <p className="mt-1 text-gray-500">+ {emergencyContacts.length - 4} more contacts</p>
                      </div>
                    </div>
                  )}
                  
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Current Response Display */}
                {currentResponse && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Bot className="h-4 w-4 mr-1 text-sky-500" />
                      DroneX AI Response:
                    </h4>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-800 whitespace-pre-wrap">{currentResponse}</p>
                    </div>
                  </div>
                )}

                {/* Chat Input */}
                <form onSubmit={handleChatSubmit} className="flex space-x-2 mb-6">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your emergency or question here..."
                    disabled={loading}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={loading || !chatInput.trim()}>
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>

                {/* Quick Emergency Commands */}
                <div className="border-t pt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-4">Quick Emergency Commands:</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    {[
                      "Medical emergency - heart attack",
                      "Fire in building - need evacuation",
                      "Earthquake - building shaking",
                      "Flood emergency - rising water",
                      "Find nearby hospitals",
                      "Share my location",
                      "Call emergency services",
                      "Send image to contacts"
                    ].map((command, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setChatInput(command)}
                        className="text-left justify-start h-auto p-3"
                      >
                        "{command}"
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Emergency Actions */}
                <div className="border-t pt-6 mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-4">Emergency Actions:</h4>
                  <div className="grid md:grid-cols-4 gap-4">
                    <Button
                      onClick={() => window.open('tel:112')}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Call 112
                    </Button>
                    <Button
                      onClick={() => handleEmergencyAction('location')}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Share Location
                    </Button>
                    <Button
                      onClick={() => handleEmergencyAction('contacts')}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Alert Contacts
                    </Button>
                    <Button
                      onClick={startCamera}
                      className="bg-purple-500 hover:bg-purple-600 text-white"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Capture Photo
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Location Services Tab */}
          <TabsContent value="location" className="space-y-6">
            <EnhancedLocationService
              onLocationUpdate={handleLocationUpdate}
              onLocationShare={handleLocationShare}
              autoUpdate={false}
              highAccuracy={true}
            />
          </TabsContent>

          {/* Chat History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <History className="h-5 w-5 mr-2" />
                      Chat History
                    </CardTitle>
                    <CardDescription>
                      Your conversation history with the AI assistant
                    </CardDescription>
                  </div>
                  <Button onClick={clearHistory} variant="outline" size="sm">
                    Clear History
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {chatHistory.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      No chat history yet. Start a conversation with the AI assistant.
                    </div>
                  ) : (
                    chatHistory.map((chat) => (
                      <div key={chat.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant={chat.emergency_detected ? "destructive" : "secondary"}>
                            {chat.emergency_detected ? 'Emergency' : 'General'}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(chat.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">You:</p>
                          <p className="text-sm text-gray-700">{chat.prompt}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">AI Assistant:</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{chat.response}</p>
                        </div>
                        {chat.disaster_type && (
                          <Badge variant="outline" className="text-xs">
                            Type: {chat.disaster_type}
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Emergency Types</CardTitle>
                  <CardDescription>Breakdown of emergency conversations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.emergencyTypes).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{type}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${(count / Math.max(...Object.values(stats.emergencyTypes))) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>Current system health and capabilities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Voice Recognition</span>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Custom Chatbot</span>
                      <Badge className="bg-green-100 text-green-800">Online</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Photo Capture</span>
                      <Badge className="bg-green-100 text-green-800">Ready</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Location Services</span>
                      <Badge className={currentLocation ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {currentLocation ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Emergency Database</span>
                      <Badge className="bg-green-100 text-green-800">Connected</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Emergency Quick Actions */}
        <Card className="border-red-100 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-red-800">Emergency Quick Actions</h3>
                <p className="text-sm text-red-600">Immediate access to emergency services and photo sharing</p>
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => window.open('tel:112')}
                  className="bg-red-500 hover:bg-red-600"
                  size="sm"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call 112
                </Button>
                <Button 
                  onClick={() => handleEmergencyAction('location')}
                  className="bg-blue-500 hover:bg-blue-600"
                  size="sm"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Share Location
                </Button>
                <Button 
                  onClick={startCamera}
                  className="bg-purple-500 hover:bg-purple-600"
                  size="sm"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Emergency Photo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AIAssistant;
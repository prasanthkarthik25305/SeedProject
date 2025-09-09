
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, Play, Square, Settings, Users, MapPin, 
  Zap, AlertTriangle, Video, Signal, Smartphone, 
  Plane, Monitor, Wifi, Bluetooth 
} from 'lucide-react';
import { useDroneStreaming, DroneStream } from '@/hooks/useDroneStreaming';
import { useToast } from '@/hooks/use-toast';

export const AdminStreamControls = () => {
  const { activeStreams, isAdmin, startStream, stopStream } = useDroneStreaming();
  const { toast } = useToast();
  const [showStartForm, setShowStartForm] = useState(false);
  const [isStartingStream, setIsStartingStream] = useState(false);
  const [formData, setFormData] = useState({
    stream_name: '',
    location: '',
    latitude: '',
    longitude: '',
    is_active: true,
    stream_quality: 'HD' as 'SD' | 'HD' | '4K',
    emergency_level: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    description: '',
    device_type: 'mobile' as 'mobile' | 'drone' | 'camera' | 'laptop',
    connection_mode: 'wifi' as 'wifi' | 'bluetooth',
  });

  if (!isAdmin) {
    return null;
  }

  const requestCameraAccess = async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: formData.stream_quality === '4K' ? 3840 : formData.stream_quality === 'HD' ? 1920 : 1280 },
          height: { ideal: formData.stream_quality === '4K' ? 2160 : formData.stream_quality === 'HD' ? 1080 : 720 },
          facingMode: formData.device_type === 'mobile' ? 'environment' : 'user'
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (error) {
      console.error('Camera access error:', error);
      return null;
    }
  };

  const handleStartStream = async () => {
    if (!formData.stream_name || !formData.location) {
      toast({
        title: "Missing Information",
        description: "Please fill in stream name and location",
        variant: "destructive"
      });
      return;
    }

    setIsStartingStream(true);
    try {
      // Request camera access based on device type
      const cameraStream = await requestCameraAccess();
      if (!cameraStream) {
        toast({
          title: "Camera Access Denied",
          description: "Please allow camera access to start the stream",
          variant: "destructive"
        });
        setIsStartingStream(false);
        return;
      }

      const streamData = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      };

      const stream = await startStream(streamData);
      if (stream) {
        toast({
          title: "Stream Started",
          description: `Live stream "${formData.stream_name}" is now active`,
        });
        
        setShowStartForm(false);
        setFormData({
          stream_name: '',
          location: '',
          latitude: '',
          longitude: '',
          is_active: true,
          stream_quality: 'HD',
          emergency_level: 'medium',
          description: '',
          device_type: 'mobile',
          connection_mode: 'wifi',
        });
      }
    } catch (error) {
      toast({
        title: "Stream Error",
        description: "Failed to start stream. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsStartingStream(false);
    }
  };

  const handleStopStream = async (streamId: string) => {
    try {
      await stopStream(streamId);
      toast({
        title: "Stream Stopped",
        description: "Live stream has been stopped",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to stop stream",
        variant: "destructive"
      });
    }
  };

  const getEmergencyColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'drone': return <Plane className="h-4 w-4" />;
      case 'camera': return <Camera className="h-4 w-4" />;
      case 'laptop': return <Monitor className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const getConnectionIcon = (connectionMode: string) => {
    return connectionMode === 'wifi' ? 
      <Wifi className="h-4 w-4" /> : 
      <Bluetooth className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <Card className="border-sky-100 bg-gradient-to-r from-sky-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-sky-500 to-sky-600 rounded-full flex items-center justify-center">
                <Video className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Admin Stream Controls</CardTitle>
                <CardDescription>Manage live drone video streams</CardDescription>
              </div>
            </div>
            <Badge className="bg-blue-100 text-blue-700">
              <Settings className="h-3 w-3 mr-1" />
              Administrator
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Actions */}
      <div className="flex space-x-4">
        <Button
          onClick={() => setShowStartForm(!showStartForm)}
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
        >
          <Play className="h-4 w-4 mr-2" />
          Start New Stream
        </Button>
      </div>

      {/* Start Stream Form */}
      {showStartForm && (
        <Card className="border-green-100">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Camera className="h-5 w-5 mr-2 text-green-500" />
              Configure New Live Stream
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stream_name">Stream Name</Label>
                <Input
                  id="stream_name"
                  value={formData.stream_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, stream_name: e.target.value }))}
                  placeholder="e.g., Downtown Emergency Response"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Main Street, City Center"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                  placeholder="e.g., 40.7128"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                  placeholder="e.g., -74.0060"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quality">Stream Quality</Label>
                <Select value={formData.stream_quality} onValueChange={(value: 'SD' | 'HD' | '4K') => 
                  setFormData(prev => ({ ...prev, stream_quality: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SD">SD (480p)</SelectItem>
                    <SelectItem value="HD">HD (720p)</SelectItem>
                    <SelectItem value="4K">4K (2160p)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_level">Emergency Level</Label>
                <Select value={formData.emergency_level} onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => 
                  setFormData(prev => ({ ...prev, emergency_level: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Device and Connection Settings */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="device_type">Device Type</Label>
                <Select value={formData.device_type} onValueChange={(value: 'mobile' | 'drone' | 'camera' | 'laptop') => 
                  setFormData(prev => ({ ...prev, device_type: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Mobile Device
                      </div>
                    </SelectItem>
                    <SelectItem value="drone">
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4" />
                        Drone Camera
                      </div>
                    </SelectItem>
                    <SelectItem value="camera">
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        External Camera
                      </div>
                    </SelectItem>
                    <SelectItem value="laptop">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        Laptop Camera
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="connection_mode">Connection Mode</Label>
                <Select value={formData.connection_mode} onValueChange={(value: 'wifi' | 'bluetooth') => 
                  setFormData(prev => ({ ...prev, connection_mode: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wifi">
                      <div className="flex items-center gap-2">
                        <Wifi className="h-4 w-4" />
                        WiFi
                      </div>
                    </SelectItem>
                    <SelectItem value="bluetooth">
                      <div className="flex items-center gap-2">
                        <Bluetooth className="h-4 w-4" />
                        Bluetooth
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional details about the stream..."
                rows={3}
              />
            </div>
            <div className="flex space-x-3">
              <Button 
                onClick={handleStartStream} 
                disabled={isStartingStream}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4 mr-2" />
                {isStartingStream ? 'Starting Stream...' : 'Start Stream'}
              </Button>
              <Button variant="outline" onClick={() => setShowStartForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Streams Management */}
      <Card className="border-sky-100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Signal className="h-5 w-5 mr-2 text-sky-500" />
            Active Streams ({activeStreams.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeStreams.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No active streams</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeStreams.map((stream) => (
                <div key={stream.id} className="border border-sky-100 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{stream.stream_name}</h4>
                        <Badge className="bg-red-100 text-red-700">
                          <Zap className="h-3 w-3 mr-1" />
                          LIVE
                        </Badge>
                        <Badge className={getEmergencyColor(stream.emergency_level)}>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {stream.emergency_level.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {stream.location}
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {stream.viewer_count} viewers
                          </div>
                          <div className="flex items-center">
                            <Video className="h-4 w-4 mr-1" />
                            {stream.stream_quality}
                          </div>
                          <div className="flex items-center">
                            {getDeviceIcon((stream as any).device_type || 'mobile')}
                            <span className="ml-1">{(stream as any).device_type || 'Mobile'}</span>
                          </div>
                          <div className="flex items-center">
                            {getConnectionIcon((stream as any).connection_mode || 'wifi')}
                            <span className="ml-1">{(stream as any).connection_mode || 'WiFi'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleStopStream(stream.id)}
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop Stream
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Camera, Play, Pause, Maximize, Settings, 
  Eye, AlertTriangle, Zap, Users, MapPin, Signal,
  Monitor, Volume2, FullscreenIcon
} from "lucide-react";
import { useDroneStreaming } from '@/hooks/useDroneStreaming';

interface RealtimeDroneStreamProps {
  fullSize?: boolean;
}

export const RealtimeDroneStream = ({ fullSize = false }: RealtimeDroneStreamProps) => {
  const { activeStreams, currentStream, loading, joinStream, leaveStream, setCurrentStream } = useDroneStreaming();
  const [isPlaying, setIsPlaying] = useState(true);
  const [detectedObjects, setDetectedObjects] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentStream && isPlaying) {
      startSimulatedStream();
    }
    
    // Simulate object detection
    const detectionInterval = setInterval(() => {
      if (currentStream && isPlaying) {
        const objects = ["Person", "Vehicle", "Building", "Debris", "Smoke"];
        const randomObjects = objects.filter(() => Math.random() > 0.7);
        setDetectedObjects(randomObjects);
      }
    }, 3000);

    return () => {
      clearInterval(detectionInterval);
      stopSimulatedStream();
    };
  }, [currentStream, isPlaying]);

  const startSimulatedStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: fullSize || isFullscreen ? 1280 : 640, 
          height: fullSize || isFullscreen ? 720 : 480 
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error("Error accessing camera for simulation:", error);
    }
  };

  const stopSimulatedStream = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else if (isFullscreen) {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const switchStream = (stream: any) => {
    if (currentStream) {
      leaveStream(currentStream.id);
    }
    setCurrentStream(stream);
    joinStream(stream.id);
  };

  const containerHeight = fullSize || isFullscreen ? "h-96" : "h-64";

  if (loading) {
    return (
      <Card className="border-sky-100">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Signal className="h-12 w-12 text-sky-500 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">Loading drone streams...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeStreams.length === 0) {
    return (
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-700">
          <div className="space-y-2">
            <p className="font-semibold">No Active Drone Streams</p>
            <p>No admin has started a live drone stream yet. Streams will appear here when activated by emergency response teams.</p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stream Selector */}
      {activeStreams.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {activeStreams.map((stream) => (
            <Button
              key={stream.id}
              onClick={() => switchStream(stream)}
              variant={currentStream?.id === stream.id ? "default" : "outline"}
              className="flex-shrink-0"
            >
              <Camera className="h-4 w-4 mr-2" />
              {stream.stream_name}
            </Button>
          ))}
        </div>
      )}

      {/* Current Stream Info */}
      {currentStream && (
        <Card className="border-sky-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CardTitle className="text-lg">{currentStream.stream_name}</CardTitle>
                <Badge className="bg-red-100 text-red-700">
                  <Zap className="h-3 w-3 mr-1" />
                  LIVE
                </Badge>
                <Badge className="bg-blue-100 text-blue-700">
                  {currentStream.stream_quality}
                </Badge>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {currentStream.viewer_count} viewers
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {currentStream.location}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Live Video Feed */}
      <div ref={containerRef} className={`relative ${containerHeight} bg-black rounded-lg overflow-hidden`}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
        
        {/* Live Indicator */}
        <div className="absolute top-4 left-4 flex space-x-2">
          <Badge className="bg-red-500/90 text-white">
            <Zap className="h-3 w-3 mr-1" />
            LIVE
          </Badge>
          <Badge className="bg-green-500/90 text-white">
            <Eye className="h-3 w-3 mr-1" />
            AI Detection Active
          </Badge>
          {currentStream && (
            <Badge className="bg-blue-500/90 text-white">
              <Signal className="h-3 w-3 mr-1" />
              {currentStream.stream_quality}
            </Badge>
          )}
        </div>

        {/* Object Detection Alerts */}
        {detectedObjects.length > 0 && (
          <div className="absolute top-4 right-4 space-y-1">
            {detectedObjects.map((object, index) => (
              <Badge key={index} className="bg-orange-500/90 text-white block">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {object} Detected
              </Badge>
            ))}
          </div>
        )}

        {/* Control Overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={togglePlayPause}
              className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={toggleFullscreen}
              className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
            >
              <FullscreenIcon className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-white text-sm bg-black/50 px-2 py-1 rounded">
            {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Simulated Detection Bounding Boxes */}
        <div className="absolute inset-0 pointer-events-none">
          {detectedObjects.includes("Person") && (
            <div className="absolute top-1/3 left-1/4 w-20 h-32 border-2 border-red-500 rounded">
              <div className="bg-red-500 text-white text-xs px-1 -mt-5">Person</div>
            </div>
          )}
          {detectedObjects.includes("Vehicle") && (
            <div className="absolute top-1/2 right-1/4 w-32 h-20 border-2 border-blue-500 rounded">
              <div className="bg-blue-500 text-white text-xs px-1 -mt-5">Vehicle</div>
            </div>
          )}
        </div>
      </div>

      {/* Stream Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-sky-100">
          <CardContent className="p-3 text-center">
            <Eye className="h-6 w-6 text-sky-500 mx-auto mb-1" />
            <div className="text-sm font-medium">Objects Detected</div>
            <div className="text-lg font-bold text-sky-600">{detectedObjects.length}</div>
          </CardContent>
        </Card>
        <Card className="border-green-100">
          <CardContent className="p-3 text-center">
            <Users className="h-6 w-6 text-green-500 mx-auto mb-1" />
            <div className="text-sm font-medium">Live Viewers</div>
            <div className="text-lg font-bold text-green-600">
              {currentStream?.viewer_count || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-100">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="h-6 w-6 text-orange-500 mx-auto mb-1" />
            <div className="text-sm font-medium">Emergency Level</div>
            <div className="text-lg font-bold text-orange-600">
              {currentStream?.emergency_level.toUpperCase() || "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-100">
          <CardContent className="p-3 text-center">
            <Monitor className="h-6 w-6 text-blue-500 mx-auto mb-1" />
            <div className="text-sm font-medium">Stream Quality</div>
            <div className="text-lg font-bold text-blue-600">
              {currentStream?.stream_quality || "HD"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

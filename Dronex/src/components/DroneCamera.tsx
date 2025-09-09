
import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Camera, Play, Pause, Maximize, Settings, 
  Eye, AlertTriangle, Zap, Users, Info
} from "lucide-react";

interface DroneCameraProps {
  fullSize?: boolean;
}

export const DroneCamera = ({ fullSize = false }: DroneCameraProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Simulate object detection when playing
    if (isPlaying) {
      const detectionInterval = setInterval(() => {
        const objects = ["Person", "Vehicle", "Building", "Debris"];
        const randomObjects = objects.filter(() => Math.random() > 0.7);
        setDetectedObjects(randomObjects);
      }, 3000);

      return () => clearInterval(detectionInterval);
    } else {
      setDetectedObjects([]);
    }
  }, [isPlaying]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: fullSize ? 1280 : 640, 
          height: fullSize ? 720 : 480 
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsPlaying(false);
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const containerHeight = fullSize ? "h-96" : "h-64";

  return (
    <div className="space-y-4">
      {/* Deprecation Notice */}
      <Alert className="border-orange-200 bg-orange-50">
        <Info className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-700">
          <p className="font-semibold">Legacy Camera Component</p>
          <p>This component has been replaced by the new real-time admin-controlled drone streaming system. Admins can now start/stop live streams that are visible to all users in real-time.</p>
        </AlertDescription>
      </Alert>

      {/* Legacy Camera Feed */}
      <div className={`relative ${containerHeight} bg-black rounded-lg overflow-hidden border-2 border-dashed border-gray-300`}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover opacity-50"
          autoPlay
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
        
        {/* Overlay message */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center text-white p-6">
            <Camera className="h-12 w-12 mx-auto mb-3 opacity-75" />
            <h3 className="text-lg font-semibold mb-2">Legacy Camera View</h3>
            <p className="text-sm opacity-90 mb-4">
              This is the old simulated camera. 
              <br />Check the "Live Feed" tab for real admin-controlled streams.
            </p>
            <Button 
              onClick={togglePlayPause}
              variant="secondary"
              className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
            >
              {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {isPlaying ? "Stop Demo" : "Start Demo"}
            </Button>
          </div>
        </div>

        {/* Legacy overlays (only show when playing) */}
        {isPlaying && (
          <>
            <div className="absolute top-4 left-4 flex space-x-2">
              <Badge className="bg-orange-500/90 text-white">
                <Zap className="h-3 w-3 mr-1" />
                DEMO
              </Badge>
              <Badge className="bg-gray-500/90 text-white">
                <Eye className="h-3 w-3 mr-1" />
                Legacy Mode
              </Badge>
            </div>

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

            <div className="absolute bottom-4 right-4 text-white text-sm bg-black/50 px-2 py-1 rounded">
              {new Date().toLocaleTimeString()}
            </div>
          </>
        )}
      </div>

      {/* Legacy Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-orange-100">
          <CardContent className="p-3 text-center">
            <Eye className="h-6 w-6 text-orange-500 mx-auto mb-1" />
            <div className="text-sm font-medium">Legacy Objects</div>
            <div className="text-lg font-bold text-orange-600">{detectedObjects.length}</div>
          </CardContent>
        </Card>
        <Card className="border-gray-100">
          <CardContent className="p-3 text-center">
            <Users className="h-6 w-6 text-gray-500 mx-auto mb-1" />
            <div className="text-sm font-medium">Demo Mode</div>
            <div className="text-lg font-bold text-gray-600">N/A</div>
          </CardContent>
        </Card>
        <Card className="border-gray-100">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="h-6 w-6 text-gray-500 mx-auto mb-1" />
            <div className="text-sm font-medium">Status</div>
            <div className="text-lg font-bold text-gray-600">Legacy</div>
          </CardContent>
        </Card>
        <Card className="border-gray-100">
          <CardContent className="p-3 text-center">
            <Camera className="h-6 w-6 text-gray-500 mx-auto mb-1" />
            <div className="text-sm font-medium">Quality</div>
            <div className="text-lg font-bold text-gray-600">Demo</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

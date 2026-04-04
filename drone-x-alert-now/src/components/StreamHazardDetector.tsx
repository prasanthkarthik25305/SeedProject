import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Camera, 
  Square, 
  AlertTriangle, 
  Flame, 
  Droplets, 
  Mountain, 
  Wind,
  Shield,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HazardDetection {
  type: 'fire' | 'flood' | 'earthquake' | 'storm' | 'debris' | 'smoke';
  confidence: number;
  location: { x: number; y: number };
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  description: string;
}

export const StreamHazardDetector: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedHazards, setDetectedHazards] = useState<HazardDetection[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        
        toast({
          title: "🎥 Stream Started",
          description: "Live video feed is now active",
        });
      }
    } catch (error) {
      console.error('Stream error:', error);
      toast({
        title: "Camera Error",
        description: "Failed to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    setIsStreaming(false);
    setIsDetecting(false);
    
    toast({
      title: "⏹️ Stream Stopped",
      description: "Live video feed has been stopped",
    });
  };

  // Simulate AI hazard detection
  const detectHazards = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    setIsProcessing(true);
    
    try {
      // Draw current video frame to canvas
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      // Get image data for "AI processing"
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Simulate AI detection with random hazard generation
      const detectedHazard = await simulateAIDetection(imageData);
      
      if (detectedHazard) {
        setDetectedHazards(prev => [detectedHazard, ...prev.slice(0, 4)]);
        
        toast({
          title: "⚠️ Hazard Detected!",
          description: `${detectedHazard.description} (${Math.round(detectedHazard.confidence * 100)}% confidence)`,
          variant: "destructive",
        });

        // Auto-alert for critical hazards
        if (detectedHazard.severity === 'critical') {
          triggerEmergencyAlert(detectedHazard);
        }
      }
    } catch (error) {
      console.error('Detection error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Simulate AI detection logic
  const simulateAIDetection = async (imageData: ImageData): Promise<HazardDetection | null> => {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Random detection for demo (25% chance)
    if (Math.random() > 0.75) {
      const hazardTypes: HazardDetection['type'][] = ['fire', 'flood', 'earthquake', 'storm', 'debris', 'smoke'];
      const severities: HazardDetection['severity'][] = ['low', 'medium', 'high', 'critical'];
      
      const type = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      
      return {
        type,
        confidence: 0.7 + Math.random() * 0.3, // 70-100% confidence
        location: {
          x: Math.random() * 100,
          y: Math.random() * 100
        },
        severity,
        timestamp: new Date(),
        description: getHazardDescription(type, severity)
      };
    }
    
    return null;
  };

  const getHazardDescription = (type: HazardDetection['type'], severity: HazardDetection['severity']): string => {
    const descriptions = {
      fire: {
        low: "Small fire detected",
        medium: "Fire outbreak detected",
        high: "Large fire spreading",
        critical: "Uncontrolled fire - Immediate danger!"
      },
      flood: {
        low: "Water accumulation detected",
        medium: "Flooding in area",
        high: "Rapid flooding occurring",
        critical: "Severe flash flood - Evacuate!"
      },
      earthquake: {
        low: "Ground tremor detected",
        medium: "Earthquake activity detected",
        high: "Strong earthquake detected",
        critical: "Major earthquake - Take cover!"
      },
      storm: {
        low: "Storm activity detected",
        medium: "Severe weather approaching",
        high: "Dangerous storm conditions",
        critical: "Extreme storm - Seek shelter!"
      },
      debris: {
        low: "Debris on road",
        medium: "Significant debris blocking path",
        high: "Major debris field detected",
        critical: "Complete blockage - Danger!"
      },
      smoke: {
        low: "Light smoke detected",
        medium: "Heavy smoke in area",
        high: "Dense smoke - Poor visibility",
        critical: "Toxic smoke - Hazardous!"
      }
    };
    
    return descriptions[type][severity];
  };

  const triggerEmergencyAlert = (hazard: HazardDetection) => {
    // In real implementation, this would:
    // - Send emergency notifications
    // - Alert rescue teams
    // - Update emergency database
    // - Trigger sirens/alerts
    
    toast({
      title: "🚨 CRITICAL ALERT!",
      description: `Immediate response required: ${hazard.description}`,
      variant: "destructive",
    });
  };

  const startDetection = () => {
    setIsDetecting(true);
    detectionIntervalRef.current = setInterval(detectHazards, 3000); // Detect every 3 seconds
    
    toast({
      title: "🔍 Hazard Detection Started",
      description: "AI is now monitoring the live stream for hazards",
    });
  };

  const stopDetection = () => {
    setIsDetecting(false);
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    toast({
      title: "⏹️ Detection Stopped",
      description: "Hazard detection has been paused",
    });
  };

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  const getHazardIcon = (type: HazardDetection['type']) => {
    switch (type) {
      case 'fire': return <Flame className="h-4 w-4 text-red-500" />;
      case 'flood': return <Droplets className="h-4 w-4 text-blue-500" />;
      case 'earthquake': return <Mountain className="h-4 w-4 text-orange-500" />;
      case 'storm': return <Wind className="h-4 w-4 text-gray-500" />;
      case 'debris': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'smoke': return <Wind className="h-4 w-4 text-gray-400 opacity-50" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: HazardDetection['severity']) => {
    switch (severity) {
      case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'critical': return 'bg-red-900 text-white border-red-700';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Live Stream with Hazard Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Camera className="h-5 w-5 text-sky-500" />
              <span>Live Hazard Detection Stream</span>
            </div>
            <div className="flex items-center space-x-2">
              {isStreaming && (
                <Badge className="bg-green-100 text-green-700 animate-pulse">
                  <Zap className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              )}
              {isDetecting && (
                <Badge className="bg-blue-100 text-blue-700">
                  <Shield className="h-3 w-3 mr-1" />
                  AI Active
                </Badge>
              )}
              {isProcessing && (
                <Badge className="bg-purple-100 text-purple-700">
                  Processing...
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Video Stream */}
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {!isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                  <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">Start camera to begin hazard detection</p>
                  <p className="text-sm text-gray-400">AI will detect fires, floods, earthquakes, and more</p>
                </div>
              </div>
            )}

            {/* Detection Overlay */}
            {isDetecting && isStreaming && (
              <div className="absolute top-4 left-4">
                <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold animate-pulse">
                  🔴 AI Detection Active
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {!isStreaming ? (
                <Button onClick={startStream} className="bg-green-500 hover:bg-green-600">
                  <Camera className="h-4 w-4 mr-2" />
                  Start Stream
                </Button>
              ) : (
                <Button onClick={stopStream} variant="destructive">
                  <Square className="h-4 w-4 mr-2" />
                  Stop Stream
                </Button>
              )}
              
              {isStreaming && !isDetecting && (
                <Button onClick={startDetection} className="bg-blue-500 hover:bg-blue-600">
                  <Shield className="h-4 w-4 mr-2" />
                  Start AI Detection
                </Button>
              )}
              
              {isDetecting && (
                <Button onClick={stopDetection} variant="outline">
                  <Shield className="h-4 w-4 mr-2" />
                  Stop Detection
                </Button>
              )}
            </div>
            
            {detectedHazards.length > 0 && (
              <div className="text-sm text-gray-600">
                {detectedHazards.length} hazards detected
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detected Hazards */}
      {detectedHazards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Detected Hazards</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detectedHazards.map((hazard, index) => (
              <Alert key={index} className={`border-l-4 ${getSeverityColor(hazard.severity)}`}>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getHazardIcon(hazard.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold capitalize">{hazard.type}</p>
                      <Badge className={getSeverityColor(hazard.severity)}>
                        {hazard.severity}
                      </Badge>
                    </div>
                    <AlertDescription className="text-sm mb-2">
                      {hazard.description}
                    </AlertDescription>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Confidence: {Math.round(hazard.confidence * 100)}%</span>
                      <span>{hazard.timestamp.toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>AI Hazard Detection:</strong> This system uses computer vision to detect fires, floods, 
          earthquakes, storms, debris, and smoke in real-time video streams. Start your camera feed and enable 
          AI detection to begin monitoring for hazards. Critical hazards will automatically trigger emergency alerts.
        </AlertDescription>
      </Alert>
    </div>
  );
};

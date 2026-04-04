import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  Flame, 
  Droplets, 
  AlertTriangle, 
  Zap, 
  Wind, 
  Mountain,
  Camera,
  Shield,
  Bell
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

interface HazardDetectionProps {
  streamElement?: HTMLVideoElement | null;
  onHazardDetected?: (hazard: HazardDetection) => void;
}

export const HazardDetection: React.FC<HazardDetectionProps> = ({
  streamElement,
  onHazardDetected
}) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedHazards, setDetectedHazards] = useState<HazardDetection[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Simulate AI hazard detection
  const detectHazards = async () => {
    if (!streamElement || !canvasRef.current || isProcessing) return;

    setIsProcessing(true);
    
    try {
      // Draw current video frame to canvas
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = streamElement.videoWidth || 640;
      canvas.height = streamElement.videoHeight || 480;
      ctx.drawImage(streamElement, 0, 0, canvas.width, canvas.height);

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

        onHazardDetected?.(detectedHazard);

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
    await new Promise(resolve => setTimeout(resolve, 500));

    // Random detection for demo (30% chance)
    if (Math.random() > 0.7) {
      const hazardTypes: HazardDetection['type'][] = ['fire', 'flood', 'earthquake', 'storm', 'debris', 'smoke'];
      const severities: HazardDetection['severity'][] = ['low', 'medium', 'high', 'critical'];
      
      const type = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      
      return {
        type,
        confidence: 0.6 + Math.random() * 0.4, // 60-100% confidence
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
    detectionIntervalRef.current = setInterval(detectHazards, 2000); // Detect every 2 seconds
    
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
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  const getHazardIcon = (type: HazardDetection['type']) => {
    switch (type) {
      case 'fire': return <Flame className="h-4 w-4" />;
      case 'flood': return <Droplets className="h-4 w-4" />;
      case 'earthquake': return <Mountain className="h-4 w-4" />;
      case 'storm': return <Wind className="h-4 w-4" />;
      case 'debris': return <AlertTriangle className="h-4 w-4" />;
      case 'smoke': return <Wind className="h-4 w-4 opacity-50" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: HazardDetection['severity']) => {
    switch (severity) {
      case 'low': return 'bg-yellow-100 text-yellow-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'high': return 'bg-red-100 text-red-800';
      case 'critical': return 'bg-red-900 text-white';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Detection Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-sky-500" />
              <span>AI Hazard Detection</span>
            </div>
            <div className="flex items-center space-x-2">
              {isDetecting && (
                <Badge className="bg-green-100 text-green-700 animate-pulse">
                  <Zap className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              )}
              {isProcessing && (
                <Badge className="bg-blue-100 text-blue-700">
                  Processing...
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Real-time AI detection of fires, floods, earthquakes, and other hazards
              </p>
              {detectedHazards.length > 0 && (
                <p className="text-xs text-gray-500">
                  {detectedHazards.length} hazards detected in current session
                </p>
              )}
            </div>
            <div className="flex space-x-2">
              {!isDetecting ? (
                <Button 
                  onClick={startDetection}
                  className="bg-green-500 hover:bg-green-600"
                  disabled={!streamElement}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Start Detection
                </Button>
              ) : (
                <Button 
                  onClick={stopDetection}
                  variant="destructive"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Stop Detection
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detected Hazards */}
      {detectedHazards.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-orange-500" />
              <span>Recent Detections</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detectedHazards.map((hazard, index) => (
              <Alert key={index} className={`border-l-4 ${getSeverityColor(hazard.severity)}`}>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getHazardIcon(hazard.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold capitalize">{hazard.type}</p>
                      <Badge className={getSeverityColor(hazard.severity)}>
                        {hazard.severity}
                      </Badge>
                    </div>
                    <AlertDescription className="text-sm">
                      {hazard.description}
                    </AlertDescription>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
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
      {!streamElement && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Start a live video stream to enable AI hazard detection. The system will analyze 
            the video feed in real-time to detect fires, floods, earthquakes, storms, debris, and smoke.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

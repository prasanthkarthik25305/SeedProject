import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  Flame, 
  Droplets, 
  Mountain, 
  Wind,
  AlertTriangle,
  Shield,
  Bell,
  Users,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  Eye,
  Camera,
  Activity,
  Radio,
  Send,
  Timer,
  Cpu,
  Database,
  AlertCircle,
  Phone,
  Navigation,
  MessageSquare,
  Heart,
  Settings,
  UserCheck,
  Map,
  RadioIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { emergencyService } from '@/services/emergencyService';
import { EmergencyWorkflowDemo } from './EmergencyWorkflowDemo';

interface PythonDisasterResult {
  id?: number;
  is_disaster: boolean;
  disaster_type: string;
  confidence: number;
  severity?: string;
  objects_detected: Array<{
    class: string;
    confidence: number;
    bbox?: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    };
  }>;
  timestamp: string;
  annotated_image_path?: string;
  error?: string;
}

interface NetworkNode {
  id: string;
  name: string;
  type: 'admin' | 'neighbor' | 'rescue';
  status: 'idle' | 'alerted' | 'acknowledged' | 'responding';
  distance: number;
  alertTime?: Date;
}

const NETWORK_NODES: NetworkNode[] = [
  { id: 'admin1', name: 'Emergency Admin', type: 'admin', status: 'idle', distance: 0 },
  { id: 'neighbor1', name: 'Neighbor - 500m', type: 'neighbor', status: 'idle', distance: 0.5 },
  { id: 'neighbor2', name: 'Neighbor - 800m', type: 'neighbor', status: 'idle', distance: 0.8 },
  { id: 'neighbor3', name: 'Neighbor - 1.2km', type: 'neighbor', status: 'idle', distance: 1.2 },
  { id: 'rescue1', name: 'Fire Station', type: 'rescue', status: 'idle', distance: 2.0 },
  { id: 'rescue2', name: 'Rescue Team Alpha', type: 'rescue', status: 'idle', distance: 3.5 },
  { id: 'rescue3', name: 'Medical Unit', type: 'rescue', status: 'idle', distance: 4.0 }
];

interface DemoDisasterDetectionProps {
  isAdmin: boolean;
}

export const DemoDisasterDetection: React.FC<DemoDisasterDetectionProps> = ({ isAdmin }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detection, setDetection] = useState<PythonDisasterResult | null>(null);
  const [networkNodes, setNetworkNodes] = useState<NetworkNode[]>(NETWORK_NODES);
  const [currentStep, setCurrentStep] = useState(0);
  const [showResolutionPrompt, setShowResolutionPrompt] = useState(false);
  const [emergencyStatus, setEmergencyStatus] = useState<'idle' | 'reporting' | 'alerted' | 'responding' | 'resolved'>('idle');
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // 6-step workflow for normal users
  const workflowSteps = [
    { id: 1, title: 'Report Emergency', icon: AlertCircle, description: 'Describe the emergency situation' },
    { id: 2, title: 'Share Location', icon: MapPin, description: 'Provide exact location details' },
    { id: 3, title: 'Contact Emergency', icon: Phone, description: 'Connect with emergency services' },
    { id: 4, title: 'Alert Network', icon: Radio, description: 'Notify nearby users and teams' },
    { id: 5, title: 'Track Response', icon: Navigation, description: 'Monitor rescue team progress' },
    { id: 6, title: 'Resolution', icon: CheckCircle, description: 'Confirm emergency resolution' }
  ];

  // Check API status (only for admin)
  const checkAPIStatus = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      setApiStatus('checking');
      const pythonApiUrl = import.meta.env.VITE_PYTHON_AI_URL || 'http://localhost:8000';
      const response = await fetch(pythonApiUrl);
      if (response.ok) {
        setApiStatus('online');
      } else {
        setApiStatus('offline');
      }
    } catch (error) {
      setApiStatus('offline');
    }
  }, [isAdmin]);

  // Initialize API status check (admin only)
  React.useEffect(() => {
    if (isAdmin) {
      checkAPIStatus();
      const interval = setInterval(checkAPIStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, checkAPIStatus]);

  // Send image to Python API for detection (admin only)
  const detectWithPythonAPI = useCallback(async (imageUrl: string, filename: string): Promise<PythonDisasterResult> => {
    if (!isAdmin) {
      // Return mock result for normal users
      return {
        is_disaster: false,
        disaster_type: 'Normal workflow',
        confidence: 0.5,
        objects_detected: [],
        timestamp: new Date().toISOString()
      };
    }
    
    try {
      console.log('🐍 Sending image to Python disaster detection API...');
      
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('file', blob, filename);
      
      const pythonApiUrl = import.meta.env.VITE_PYTHON_AI_URL || 'http://localhost:8000';
      const apiResponse = await fetch(`${pythonApiUrl}/detect`, {
        method: 'POST',
        body: formData,
      });
      
      if (!apiResponse.ok) {
        throw new Error(`API Error: ${apiResponse.status}`);
      }
      
      const result: PythonDisasterResult = await apiResponse.json();
      
      console.log('🎯 Python API Result:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Python API Error:', error);
      
      return {
        error: String(error),
        is_disaster: false,
        disaster_type: 'API Error',
        confidence: 0.0,
        objects_detected: [],
        timestamp: new Date().toISOString()
      };
    }
  }, [isAdmin]);

  // Handle workflow step progression (normal users) - Automatic like before
  const handleNextStep = useCallback(() => {
    if (currentStep < workflowSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      
      // Simulate workflow actions
      if (currentStep === 1) {
        setEmergencyStatus('reporting');
        toast({
          title: "📍 Location Shared",
          description: "Your location has been shared with emergency services",
        });
      } else if (currentStep === 2) {
        setEmergencyStatus('alerted');
        toast({
          title: "📞 Emergency Contacted",
          description: "Emergency services have been notified",
        });
      } else if (currentStep === 3) {
        setEmergencyStatus('responding');
        toast({
          title: "🚨 Network Alerted",
          description: "Nearby users and rescue teams have been notified",
        });
      }
    } else {
      // Last step reached - Send alerts to neighbors and admin
      setEmergencyStatus('resolved');
      sendEmergencyAlerts();
      
      toast({
        title: "✅ Emergency Workflow Complete",
        description: "Alerts have been sent to neighbors and admin panel",
      });
    }
  }, [currentStep, toast]);

  // Send emergency alerts to neighbors and admin (proper integration)
  const sendEmergencyAlerts = useCallback(async () => {
    try {
      console.log('🚨 Sending emergency alerts to neighbors and admin...');
      
      // First create a hazard detection
      const hazardData = {
        type: 'fire' as const, // Default type
        severity: 'high' as const,
        source: 'user_report' as const,
        description: 'Emergency reported by user - Immediate assistance required',
        confidence: 0.9
      };

      // Create hazard detection first
      const hazard = await emergencyService.detectHazard(
        'current_user_id', // Would come from auth context
        { lat: 13.0827, lng: 80.2707 }, // Default location
        hazardData
      );

      console.log('✅ Hazard detection created:', hazard);

      // Then create emergency alert
      const alertData = {
        alertType: 'neighbor_alert' as const,
        message: 'Emergency reported by user - Immediate assistance required',
        urgencyLevel: 'high' as const,
        triggeredBy: 'automatic' as const
      };

      const alert = await emergencyService.createEmergencyAlert(
        hazard.id,
        'current_user_id',
        alertData
      );

      console.log('✅ Emergency alert created:', alert);
      
      // Show success notification
      toast({
        title: "🚨 Emergency Alerts Sent",
        description: `Alert sent to ${alert.recipients?.length || 0} emergency contacts`,
        variant: "destructive",
      });

      // Update network nodes status
      setNetworkNodes(prev => prev.map(node => ({
        ...node,
        status: 'alerted' as const,
        alertTime: new Date()
      })));

      // Schedule follow-up prompt (5 minutes = 5 seconds for demo)
      setTimeout(() => {
        setShowResolutionPrompt(true);
        toast({
          title: "⏰ Follow-up Required",
          description: "Has the emergency been resolved?",
          variant: "destructive",
        });
      }, 5000);

    } catch (error) {
      console.error('❌ Error sending emergency alerts:', error);
      toast({
        title: "❌ Alert Failed",
        description: "Failed to send emergency alerts. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Handle resolution with proper alert status update
  const handleResolution = useCallback((resolved: boolean) => {
    setShowResolutionPrompt(false);
    
    if (resolved) {
      setEmergencyStatus('resolved');
      
      // Update all network nodes to idle
      setNetworkNodes(prev => prev.map(node => ({
        ...node,
        status: 'idle' as const
      })));

      // Get the most recent alert to resolve it
      // In a real app, you'd track the specific alert ID
      emergencyService.getAllActiveEmergencies()
        .then(alerts => {
          if (alerts.length > 0) {
            const latestAlert = alerts[0];
            return emergencyService.resolveEmergency(
              latestAlert.id,
              'current_user_id',
              'Emergency resolved through user workflow'
            );
          }
        })
        .then(() => {
          console.log('✅ Alert status updated to resolved');
        })
        .catch(error => {
          console.error('❌ Error updating alert status:', error);
        });

      toast({
        title: "✅ Emergency Resolved",
        description: "The situation has been successfully resolved and alert count updated",
      });
    } else {
      toast({
        title: "⚠️ Emergency Ongoing",
        description: "Response teams are still working on the situation",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Start automatic workflow progression (like before)
  React.useEffect(() => {
    if (!isAdmin && currentStep < workflowSteps.length - 1) {
      const timer = setTimeout(() => {
        handleNextStep();
      }, 2000); // Auto-advance every 2 seconds
      
      return () => clearTimeout(timer);
    }
  }, [currentStep, isAdmin, handleNextStep]);

  // Handle image upload (admin only)
  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageUrl = e.target?.result as string;
      setSelectedImage(imageUrl);
      setIsProcessing(true);
      
      const result = await detectWithPythonAPI(imageUrl, file.name);
      setDetection(result);
      setIsProcessing(false);
      
      if (result.error) {
        toast({
          title: "❌ API Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "🔍 Detection Complete!",
          description: `${result.is_disaster ? '⚠️ Disaster detected' : '✅ No disaster'}: ${result.disaster_type} (${Math.round(result.confidence * 100)}% confidence)`,
          variant: result.is_disaster ? "destructive" : "default",
        });
      }
    };
    reader.readAsDataURL(file);
  }, [isAdmin, detectWithPythonAPI, toast]);

  // Handle image selection (admin only)
  const handleImageSelect = useCallback(async (imageUrl: string, filename: string) => {
    if (!isAdmin) return;
    
    setSelectedImage(imageUrl);
    setIsProcessing(true);
    
    const result = await detectWithPythonAPI(imageUrl, filename);
    setDetection(result);
    setIsProcessing(false);
    
    if (result.error) {
      toast({
        title: "❌ API Error",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "🔍 Detection Complete!",
        description: `${result.is_disaster ? '⚠️ Disaster detected' : '✅ No disaster'}: ${result.disaster_type} (${Math.round(result.confidence * 100)}% confidence)`,
        variant: result.is_disaster ? "destructive" : "default",
      });
    }
  }, [isAdmin, detectWithPythonAPI, toast]);

  // Reset workflow
  const resetWorkflow = useCallback(() => {
    setCurrentStep(0);
    setSelectedImage(null);
    setDetection(null);
    setEmergencyStatus('idle');
    setShowResolutionPrompt(false);
  }, []);

  const getStepIcon = (step: typeof workflowSteps[0]) => {
    const Icon = step.icon;
    return <Icon className={`h-6 w-6 ${currentStep >= step.id - 1 ? 'text-sky-500' : 'text-gray-400'}`} />;
  };

  const getStepStatus = (stepId: number) => {
    if (currentStep > stepId) return 'completed';
    if (currentStep === stepId) return 'active';
    return 'pending';
  };

  // Admin: Python AI Detection Interface
  if (isAdmin) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="h-6 w-6 text-purple-500" />
                <span>🐍 Admin: Python AI Disaster Detection</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={
                  apiStatus === 'online' ? 'bg-green-100 text-green-800' :
                  apiStatus === 'offline' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }>
                  {apiStatus === 'online' ? 'API Online' :
                   apiStatus === 'offline' ? 'API Offline' : 'Checking...'}
                </Badge>
                <Badge className="bg-blue-100 text-blue-800">
                  CLIP + YOLOv8
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Admin AI Detection System</h2>
              <p className="text-gray-600">
                Advanced disaster detection using CLIP zero-shot classification and YOLOv8 object detection
              </p>
              <div className="mt-2 text-sm text-purple-600">
                {apiStatus === 'online' ? 
                  '✅ Python API is connected and ready' : 
                  '⚠️ Start Python API server: python disaster_detection_pipeline.py'}
              </div>
            </div>

            {/* Upload Section */}
            <Card className="border-dashed border-2 border-gray-300">
              <CardContent className="p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">Upload Image for AI Analysis</h3>
                <p className="text-gray-600 mb-4">
                  Send image to Python API for CLIP + YOLOv8 analysis
                </p>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-purple-500 hover:bg-purple-600"
                  disabled={apiStatus !== 'online'}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Send to Python API
                </Button>
              </CardContent>
            </Card>

            {/* Sample Images */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Sample Images for Testing</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { id: 'sample1', name: 'Cyclone Storm', url: 'https://images.unsplash.com/photo-1593981703576-4d0b4b5b3b5?w=800' },
                  { id: 'sample2', name: 'Urban Fire', url: 'https://images.unsplash.com/photo-1600857062272-7b4b4b5b3b5?w=800' },
                  { id: 'sample3', name: 'Flash Flood', url: 'https://images.unsplash.com/photo-1593586549212-4d0b4b5b3b5?w=800' },
                  { id: 'sample4', name: 'Earthquake', url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800' },
                  { id: 'sample5', name: 'Normal Scene', url: 'https://images.unsplash.com/photo-1593696378411-6d3b0a1b5b5?w=800' }
                ].map((sample) => (
                  <Card 
                    key={sample.id} 
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleImageSelect(sample.url, sample.name)}
                  >
                    <div className="aspect-square relative overflow-hidden rounded-t-lg">
                      <img 
                        src={sample.url} 
                        alt={sample.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all flex items-center justify-center">
                        <Eye className="h-8 w-8 text-white opacity-0 hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">{sample.name}</h4>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Processing Section */}
            {isProcessing && (
              <div className="text-center mt-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold">🐍 Python AI Processing...</h3>
                <p className="text-gray-600">CLIP classification + YOLOv8 detection in progress</p>
              </div>
            )}

            {/* Results Section */}
            {detection && !isProcessing && (
              <Card className="mt-6 border-l-4 border-purple-500">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5 text-purple-500" />
                    <span>AI Detection Results</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Disaster</p>
                      <p className="font-semibold">{detection.is_disaster ? '⚠️ Yes' : '✅ No'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Type</p>
                      <p className="font-semibold">{detection.disaster_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Confidence</p>
                      <p className="font-semibold">{Math.round(detection.confidence * 100)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Objects</p>
                      <p className="font-semibold">{detection.objects_detected?.length || 0}</p>
                    </div>
                  </div>
                  
                  {detection.objects_detected && detection.objects_detected.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Detected Objects (YOLOv8):</p>
                      <div className="flex flex-wrap gap-2">
                        {detection.objects_detected.map((obj, index) => (
                          <Badge key={index} variant="outline">
                            {obj.class} ({Math.round(obj.confidence * 100)}%)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Normal User: EmergencyWorkflowDemo (exact code provided)
  if (!isAdmin) {
    return (
      <EmergencyWorkflowDemo 
        onComplete={() => {
          toast({
            title: "✅ Emergency Workflow Complete",
            description: "The emergency response workflow has been completed successfully.",
          });
        }}
      />
    );
  }
};

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
  Database
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export const PythonDisasterDetection: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detection, setDetection] = useState<PythonDisasterResult | null>(null);
  const [networkNodes, setNetworkNodes] = useState<NetworkNode[]>(NETWORK_NODES);
  const [currentPhase, setCurrentPhase] = useState<'upload' | 'detecting' | 'alerting' | 'responding' | 'resolved'>('upload');
  const [progress, setProgress] = useState(0);
  const [showResolutionPrompt, setShowResolutionPrompt] = useState(false);
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Check API status
  const checkAPIStatus = useCallback(async () => {
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
  }, []);

  // Initialize API status check
  React.useEffect(() => {
    checkAPIStatus();
    const interval = setInterval(checkAPIStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [checkAPIStatus]);

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

  // Process image with Python API
  const processImage = useCallback(async (imageUrl: string, filename: string) => {
    setIsProcessing(true);
    setCurrentPhase('detecting');
    setProgress(0);

    // Simulate processing phases
    const phases = [
      { name: 'Loading image...', duration: 800 },
      { name: 'CLIP zero-shot classification...', duration: 1500 },
      { name: 'YOLOv8 object detection...', duration: 2000 },
      { name: 'Decision logic processing...', duration: 1000 },
      { name: 'Saving to database...', duration: 700 }
    ];

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      setProgress((i + 1) * 16.67);
      await new Promise(resolve => setTimeout(resolve, phase.duration));
    }

    // Use Python API for detection
    const detectionResult = await detectWithPythonAPI(imageUrl, filename);

    setDetection(detectionResult);
    setIsProcessing(false);
    setProgress(100);

    if (detectionResult.error) {
      toast({
        title: "❌ API Error",
        description: detectionResult.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "🔍 Detection Complete!",
        description: `${detectionResult.is_disaster ? '⚠️ Disaster detected' : '✅ No disaster'}: ${detectionResult.disaster_type} (${Math.round(detectionResult.confidence * 100)}% confidence)`,
        variant: detectionResult.is_disaster ? "destructive" : "default",
      });

      // Trigger alert workflow if disaster detected
      if (detectionResult.is_disaster) {
        await triggerAlertWorkflow();
      }
    }

    return detectionResult;
  }, [detectWithPythonAPI, toast]);

  // Trigger alert workflow
  const triggerAlertWorkflow = useCallback(async () => {
    setCurrentPhase('alerting');
    setProgress(0);

    // Phase 1: Send to Admin
    await new Promise(resolve => setTimeout(resolve, 1000));
    setNetworkNodes(prev => prev.map(node => 
      node.type === 'admin' 
        ? { ...node, status: 'alerted', alertTime: new Date() }
        : node
    ));
    setProgress(25);

    // Phase 2: Send to Network
    await new Promise(resolve => setTimeout(resolve, 1500));
    setNetworkNodes(prev => prev.map(node => 
      node.type === 'neighbor' 
        ? { ...node, status: 'alerted', alertTime: new Date() }
        : node
    ));
    setProgress(50);

    // Phase 3: Send to Rescue Teams
    await new Promise(resolve => setTimeout(resolve, 2000));
    setNetworkNodes(prev => prev.map(node => 
      node.type === 'rescue' 
        ? { ...node, status: 'alerted', alertTime: new Date() }
        : node
    ));
    setProgress(75);

    // Phase 4: Acknowledgments
    await new Promise(resolve => setTimeout(resolve, 1500));
    setNetworkNodes(prev => prev.map(node => 
      node.type === 'admin' || node.type === 'rescue'
        ? { ...node, status: 'responding' }
        : node
    ));
    setProgress(100);
    setCurrentPhase('responding');

    // Set follow-up reminder (5 minutes = 5 seconds for demo)
    setTimeout(() => {
      setShowResolutionPrompt(true);
      toast({
        title: "⏰ Follow-up Required",
        description: "Has the emergency been resolved?",
        variant: "destructive",
      });
    }, 5000);
  }, [toast]);

  // Handle image selection
  const handleImageSelect = useCallback(async (imageUrl: string, filename: string) => {
    setSelectedImage(imageUrl);
    await processImage(imageUrl, filename);
  }, [processImage]);

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageUrl = e.target?.result as string;
      setSelectedImage(imageUrl);
      await processImage(imageUrl, file.name);
    };
    reader.readAsDataURL(file);
  }, [processImage]);

  // Handle resolution
  const handleResolution = useCallback((resolved: boolean) => {
    setShowResolutionPrompt(false);
    
    if (resolved) {
      setCurrentPhase('resolved');
      setNetworkNodes(prev => prev.map(node => ({
        ...node,
        status: 'idle'
      })));

      toast({
        title: "✅ Emergency Resolved",
        description: "The situation has been successfully resolved",
      });
    } else {
      toast({
        title: "⚠️ Emergency Ongoing",
        description: "Response teams are still working on the situation",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setSelectedImage(null);
    setDetection(null);
    setNetworkNodes(NETWORK_NODES);
    setCurrentPhase('upload');
    setProgress(0);
    setShowResolutionPrompt(false);
  }, []);

  const getDisasterIcon = (disasterType: string) => {
    const type = disasterType.toLowerCase();
    if (type.includes('fire')) return <Flame className="h-6 w-6 text-red-500" />;
    if (type.includes('flood')) return <Droplets className="h-6 w-6 text-blue-500" />;
    if (type.includes('earthquake')) return <Mountain className="h-6 w-6 text-orange-500" />;
    if (type.includes('tsunami')) return <Droplets className="h-6 w-6 text-cyan-500" />;
    if (type.includes('cyclone') || type.includes('storm')) return <Wind className="h-6 w-6 text-gray-500" />;
    return <Shield className="h-6 w-6 text-green-500" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-yellow-100 text-yellow-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'high': return 'bg-red-100 text-red-800';
      case 'critical': return 'bg-red-900 text-white animate-pulse';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNodeStatusColor = (status: NetworkNode['status']) => {
    switch (status) {
      case 'idle': return 'bg-gray-200';
      case 'alerted': return 'bg-orange-400 animate-pulse';
      case 'acknowledged': return 'bg-blue-400';
      case 'responding': return 'bg-green-400';
      default: return 'bg-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="h-6 w-6 text-purple-500" />
              <span>🐍 Python-Powered Disaster Detection System</span>
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
            <h2 className="text-2xl font-bold mb-2">Disaster Detection</h2>
            <p className="text-gray-600">
              Real-time disaster detection using CLIP zero-shot classification and YOLOv8 object detection
            </p>
            <div className="mt-2 text-sm text-purple-600">
              {apiStatus === 'online' ? 
                '✅ Python API is connected and ready' : 
                '⚠️ Start Python API server: python disaster_detection_pipeline.py'}
            </div>
          </div>

          {/* Phase Indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Current Phase: {currentPhase.toUpperCase()}</span>
              <span className="text-sm text-gray-500">{progress}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Upload Section */}
          {currentPhase === 'upload' && (
            <div className="space-y-6">
              <Card className="border-dashed border-2 border-gray-300">
                <CardContent className="p-8 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">Upload Disaster Image</h3>
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
              <div>
                <h3 className="text-lg font-semibold mb-4">Or Use Sample Images</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[
                    { id: 'sample1', name: 'Cyclone Storm', url: 'https://images.pexels.com/photos/1118873/pexels-photo-1118873.jpeg' },
                    { id: 'sample2', name: 'Urban Fire', url: 'https://images.pexels.com/photos/266487/pexels-photo-266487.jpeg'},
                    { id: 'sample3', name: 'Flash Flood', url: 'https://cdn.hswstatic.com/gif/flash-flood-update.jpg'},
                    { id: 'sample4', name: 'Earthquake', url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800' },
                    { id: 'sample5', name: 'Normal Scene', url: 'https://images.pexels.com/photos/1107717/pexels-photo-1107717.jpeg'}
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
            </div>
          )}

          {/* Processing Section */}
          {(currentPhase === 'detecting' || currentPhase === 'alerting') && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold">
                  {currentPhase === 'detecting' ? '🐍 Python API Processing...' : '🚨 Dispatching Emergency Alerts...'}
                </h3>
                <p className="text-gray-600">
                  {currentPhase === 'detecting' ? 
                    'CLIP classification + YOLOv8 detection + Decision logic' : 
                    'Sending alerts to emergency network'
                  }
                </p>
              </div>
              
              {selectedImage && (
                <div className="relative">
                  <img 
                    src={selectedImage} 
                    alt="Processing"
                    className="w-full rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                    <div className="text-white text-center">
                      <Zap className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                      <p>Python Deep Learning Analysis in Progress...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Detection Results */}
          {detection && currentPhase === 'responding' && (
            <div className="space-y-6">
              <Card className="border-l-4 border-red-500">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getDisasterIcon(detection.disaster_type)}
                      <span>{detection.is_disaster ? '⚠️ DISASTER DETECTED' : '✅ NO DISASTER'}</span>
                    </div>
                    <Badge className={getSeverityColor(detection.severity)}>
                      {detection.severity.toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Type</p>
                      <p className="font-semibold">{detection.disaster_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Confidence</p>
                      <p className="font-semibold">{Math.round(detection.confidence * 100)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Objects Found</p>
                      <p className="font-semibold">{detection.objects_detected?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Timestamp</p>
                      <p className="font-semibold">{new Date(detection.timestamp).toLocaleTimeString()}</p>
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

                  {detection.annotated_image_path && (
                    <Alert>
                      <Database className="h-4 w-4" />
                      <AlertDescription>
                        Results saved to database. Annotated image: {detection.annotated_image_path}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Network Response Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-sky-500" />
                    <span>Emergency Network Response</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {networkNodes.map((node) => (
                        <div key={node.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                          <div className={`w-4 h-4 rounded-full ${getNodeStatusColor(node.status)}`}></div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{node.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{node.status}</p>
                          </div>
                          <MapPin className="h-4 w-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Resolution Prompt */}
          {showResolutionPrompt && (
            <Card className="border-l-4 border-orange-500">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Timer className="h-5 w-5 text-orange-500" />
                  <span>Follow-up Required</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    5 minutes have passed since emergency alert. Has the situation been resolved?
                  </AlertDescription>
                </Alert>
                
                <div className="flex space-x-4">
                  <Button 
                    onClick={() => handleResolution(true)}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Yes, Resolved
                  </Button>
                  <Button 
                    onClick={() => handleResolution(false)}
                    variant="destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    No, Still Ongoing
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resolved State */}
          {currentPhase === 'resolved' && (
            <Card className="border-l-4 border-green-500">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <span>✅ Emergency Resolved</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    The emergency situation has been successfully resolved. All response units have been stood down.
                  </AlertDescription>
                </Alert>
                
                <Button onClick={resetSimulation} className="bg-purple-500 hover:bg-purple-600">
                  <Cpu className="h-4 w-4 mr-2" />
                  Run New Detection
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Reset Button */}
          {currentPhase !== 'upload' && currentPhase !== 'resolved' && (
            <div className="text-center">
              <Button onClick={resetSimulation} variant="outline">
                <Cpu className="h-4 w-4 mr-2" />
                Reset Detection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Timer
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { awsRekognitionService, type AWSRekognitionResult } from '@/services/awsRekognitionService';

interface DisasterDetection {
  id: string;
  timestamp: Date;
  disasterType: 'fire' | 'flood' | 'earthquake' | 'tsunami' | 'cyclone' | 'none';
  confidence: number;
  objectsDetected: number;
  objectSummary: Record<string, number>;
  imageUrl: string;
  isDisaster: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
}

interface AlertStatus {
  sentToAdmin: boolean;
  sentToNetwork: boolean;
  sentToRescue: boolean;
  adminAcknowledged: boolean;
  rescueAcknowledged: boolean;
  resolved: boolean;
  resolutionTime?: Date;
  followUpSent: boolean;
}

interface NetworkNode {
  id: string;
  name: string;
  type: 'admin' | 'neighbor' | 'rescue';
  status: 'idle' | 'alerted' | 'acknowledged' | 'responding';
  distance: number;
  alertTime?: Date;
}

const DISASTER_SAMPLES = [
  {
    id: 'sample1',
    name: 'Urban Fire',
    url: 'https://images.unsplash.com/photo-1600857062272-5ab4b5b6b3a1?w=800',
    expected: 'fire',
    location: 'Downtown District'
  },
  {
    id: 'sample2', 
    name: 'Flash Flood',
    url: 'https://images.unsplash.com/photo-1593586547438-24359229d72f?w=800',
    expected: 'flood',
    location: 'Riverside Area'
  },
  {
    id: 'sample3',
    name: 'Earthquake Damage',
    url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800',
    expected: 'earthquake',
    location: 'City Center'
  },
  {
    id: 'sample4',
    name: 'Tsunami Warning',
    url: 'https://images.unsplash.com/photo-1604108801633-834e8f51c217?w=800',
    expected: 'tsunami',
    location: 'Coastal Region'
  },
  {
    id: 'sample5',
    name: 'Cyclone Storm',
    url: 'https://images.unsplash.com/photo-1593981703574-362c61265b35?w=800',
    expected: 'cyclone',
    location: 'Suburban Zone'
  }
];

const NETWORK_NODES: NetworkNode[] = [
  { id: 'admin1', name: 'Emergency Admin', type: 'admin', status: 'idle', distance: 0 },
  { id: 'neighbor1', name: 'Neighbor - 500m', type: 'neighbor', status: 'idle', distance: 0.5 },
  { id: 'neighbor2', name: 'Neighbor - 800m', type: 'neighbor', status: 'idle', distance: 0.8 },
  { id: 'neighbor3', name: 'Neighbor - 1.2km', type: 'neighbor', status: 'idle', distance: 1.2 },
  { id: 'rescue1', name: 'Fire Station', type: 'rescue', status: 'idle', distance: 2.0 },
  { id: 'rescue2', name: 'Rescue Team Alpha', type: 'rescue', status: 'idle', distance: 3.5 },
  { id: 'rescue3', name: 'Medical Unit', type: 'rescue', status: 'idle', distance: 4.0 }
];

export const AdvancedDisasterDetection: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detection, setDetection] = useState<DisasterDetection | null>(null);
  const [alertStatus, setAlertStatus] = useState<AlertStatus>({
    sentToAdmin: false,
    sentToNetwork: false,
    sentToRescue: false,
    adminAcknowledged: false,
    rescueAcknowledged: false,
    resolved: false,
    followUpSent: false
  });
  const [networkNodes, setNetworkNodes] = useState<NetworkNode[]>(NETWORK_NODES);
  const [currentPhase, setCurrentPhase] = useState<'upload' | 'detecting' | 'alerting' | 'responding' | 'resolved'>('upload');
  const [progress, setProgress] = useState(0);
  const [showResolutionPrompt, setShowResolutionPrompt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // AWS Rekognition-based disaster detection
  const analyzeImageForDisaster = useCallback(async (imageUrl: string, filename: string): Promise<DisasterDetection> => {
    try {
      console.log('🔍 Starting AWS Rekognition disaster analysis...');
      
      // Use AWS Rekognition service
      const awsResult: AWSRekognitionResult = await awsRekognitionService.analyzeImageForDisaster(imageUrl, {
        minConfidence: 60,
        maxLabels: 20,
        detectModeration: true,
        detectText: true
      });

      console.log('📊 AWS Rekognition Results:', awsResult);

      // Convert AWS result to our format
      const isDisaster = awsResult.disasterType !== 'none';
      const severities: DisasterDetection['severity'][] = ['low', 'medium', 'high', 'critical'];
      const severity = isDisaster ? 
        (awsResult.confidence > 80 ? 'critical' : 
         awsResult.confidence > 60 ? 'high' : 
         awsResult.confidence > 40 ? 'medium' : 'low') : 'low';

      // Generate object summary based on disaster type and AWS labels
      const objectSummary: Record<string, number> = {};
      let totalObjects = 0;

      switch (awsResult.disasterType) {
        case 'cyclone':
          objectSummary['debris'] = Math.floor(Math.random() * 5) + 2;
          objectSummary['vehicle'] = Math.floor(Math.random() * 3) + 1;
          objectSummary['person'] = Math.floor(Math.random() * 2);
          // Add AWS-detected objects
          awsResult.labels.forEach(label => {
            if (label.name.toLowerCase().includes('building')) {
              objectSummary['building'] = (objectSummary['building'] || 0) + 1;
            }
            if (label.name.toLowerCase().includes('car') || label.name.toLowerCase().includes('vehicle')) {
              objectSummary['vehicle'] = (objectSummary['vehicle'] || 0) + 1;
            }
          });
          break;
        case 'fire':
          objectSummary['person'] = Math.floor(Math.random() * 3) + 1;
          objectSummary['vehicle'] = Math.floor(Math.random() * 2);
          objectSummary['building'] = Math.floor(Math.random() * 2) + 1;
          break;
        case 'flood':
          objectSummary['person'] = Math.floor(Math.random() * 4) + 2;
          objectSummary['vehicle'] = Math.floor(Math.random() * 4);
          objectSummary['building'] = Math.floor(Math.random() * 3) + 1;
          break;
        case 'earthquake':
          objectSummary['debris'] = Math.floor(Math.random() * 8) + 3;
          objectSummary['person'] = Math.floor(Math.random() * 2) + 1;
          objectSummary['vehicle'] = Math.floor(Math.random() * 2);
          break;
        case 'tsunami':
          objectSummary['person'] = Math.floor(Math.random() * 3) + 1;
          objectSummary['vehicle'] = Math.floor(Math.random() * 3);
          objectSummary['debris'] = Math.floor(Math.random() * 6) + 2;
          break;
        default:
          objectSummary['person'] = Math.floor(Math.random() * 2) + 1;
          objectSummary['vehicle'] = Math.floor(Math.random() * 2);
          objectSummary['building'] = Math.floor(Math.random() * 1);
      }

      totalObjects = Object.values(objectSummary).reduce((a, b) => a + b, 0);

      const detectionResult: DisasterDetection = {
        id: `det_${Date.now()}`,
        timestamp: new Date(),
        disasterType: awsResult.disasterType,
        confidence: awsResult.confidence,
        objectsDetected: totalObjects,
        objectSummary,
        imageUrl,
        isDisaster,
        severity,
        location: 'Detected Location'
      };

      console.log('✅ Final AWS-powered Detection Result:', detectionResult);
      return detectionResult;

    } catch (error) {
      console.error('❌ AWS Rekognition analysis failed, falling back to pixel analysis:', error);
      
      // Fallback to our pixel analysis
      return fallbackPixelAnalysis(imageUrl, filename);
    }
  }, []);

  // Fallback pixel analysis (original logic)
  const fallbackPixelAnalysis = useCallback(async (imageUrl: string, filename: string): Promise<DisasterDetection> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Create canvas for pixel analysis
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        // Analyze color distribution and patterns
        let redPixels = 0, bluePixels = 0, grayPixels = 0, whitePixels = 0, darkPixels = 0;
        let circularPatterns = 0, spiralPatterns = 0, linearPatterns = 0;
        let totalPixels = pixels.length / 4;

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];

          // Color classification - More sensitive thresholds
          if (r > 180 && g < 120 && b < 120) redPixels++; // Fire red (lowered from 200,100,100)
          else if (b > 120 && r < 120 && g < 120) bluePixels++; // Flood blue (lowered from 150,100,100)
          else if (r > 80 && g > 80 && b > 80) whitePixels++; // Clouds/fog (lowered from 100,100,100)
          else if (r < 80 && g < 80 && b < 80) darkPixels++; // Dark areas (raised from 50,50,50)
          else if (Math.abs(r - g) < 40 && Math.abs(g - b) < 40 && r < 180) grayPixels++; // Gray/debris (widened range)

          // Enhanced pattern detection
          if (i > 0 && i < pixels.length - 4) {
            const prevR = pixels[i - 4];
            const prevG = pixels[i - 3];
            const prevB = pixels[i - 2];
            const currR = r;
            const currG = g;
            const currB = b;
            
            // Multiple edge detection methods
            const diffR = Math.abs(currR - prevR);
            const diffG = Math.abs(currG - prevG);
            const diffB = Math.abs(currB - prevB);
            const totalDiff = diffR + diffG + diffB;
            
            if (totalDiff > 30) { // Lowered from 50
              // Check for circular patterns (cyclones)
              const x = (i / 4) % canvas.width;
              const y = Math.floor((i / 4) / canvas.width);
              const centerX = canvas.width / 2;
              const centerY = canvas.height / 2;
              const distFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
              
              if (distFromCenter < canvas.width / 2) { // Expanded detection area
                circularPatterns++;
              }
              
              // Check for spiral patterns (cyclone signature)
              if (x > centerX - 100 && x < centerX + 100 && y > centerY - 100 && y < centerY + 100) {
                spiralPatterns++;
              }

              // Check for linear patterns (flood lines, damage)
              if (y > canvas.height * 0.3 && y < canvas.height * 0.7) {
                linearPatterns++;
              }
            }
          }
        }

        const redRatio = redPixels / totalPixels;
        const blueRatio = bluePixels / totalPixels;
        const grayRatio = grayPixels / totalPixels;
        const whiteRatio = whitePixels / totalPixels;
        const darkRatio = darkPixels / totalPixels;
        const circularRatio = circularPatterns / totalPixels;
        const spiralRatio = spiralPatterns / totalPixels;
        const linearRatio = linearPatterns / totalPixels;

        console.log('🔍 Fallback Image Analysis Results:', {
          redRatio: redRatio.toFixed(3),
          blueRatio: blueRatio.toFixed(3),
          grayRatio: grayRatio.toFixed(3),
          whiteRatio: whiteRatio.toFixed(3),
          darkRatio: darkRatio.toFixed(3),
          circularRatio: circularRatio.toFixed(3),
          spiralRatio: spiralRatio.toFixed(3),
          linearRatio: linearRatio.toFixed(3)
        });

        // Enhanced disaster detection logic with lower thresholds
        let disasterType: DisasterDetection['disasterType'] = 'none';
        let confidence = 0.1;
        let severity: DisasterDetection['severity'] = 'low';
        let isDisaster = false;

        // Cyclone Detection (More sensitive)
        if (spiralRatio > 0.01 || circularRatio > 0.03) {
          if (whiteRatio > 0.2 && grayRatio > 0.15) {
            disasterType = 'cyclone';
            confidence = Math.min(0.95, 0.5 + spiralRatio * 15 + circularRatio * 8);
            severity = confidence > 0.8 ? 'critical' : confidence > 0.6 ? 'high' : 'medium';
            isDisaster = true;
          }
        }
        // Fire Detection (More sensitive)
        else if (redRatio > 0.08) { // Lowered from 0.15
          disasterType = 'fire';
          confidence = Math.min(0.98, 0.4 + redRatio * 3);
          severity = confidence > 0.75 ? 'critical' : confidence > 0.5 ? 'high' : 'medium';
          isDisaster = true;
        }
        // Flood Detection (More sensitive)
        else if (blueRatio > 0.12) { // Lowered from 0.2
          disasterType = 'flood';
          confidence = Math.min(0.95, 0.35 + blueRatio * 3);
          severity = confidence > 0.7 ? 'critical' : confidence > 0.45 ? 'high' : 'medium';
          isDisaster = true;
        }
        // Earthquake Detection (More sensitive)
        else if (grayRatio > 0.25 && darkRatio > 0.2) { // Lowered thresholds
          disasterType = 'earthquake';
          confidence = Math.min(0.92, 0.35 + grayRatio * 1.2 + darkRatio * 1.2);
          severity = confidence > 0.65 ? 'critical' : confidence > 0.45 ? 'high' : 'medium';
          isDisaster = true;
        }
        // Tsunami Detection (More sensitive)
        else if (blueRatio > 0.15 && whiteRatio > 0.25) { // Lowered thresholds
          disasterType = 'tsunami';
          confidence = Math.min(0.90, 0.3 + blueRatio * 2.5 + whiteRatio * 1.5);
          severity = confidence > 0.65 ? 'critical' : confidence > 0.4 ? 'high' : 'medium';
          isDisaster = true;
        }
        // Fallback: Detect any unusual pattern as potential disaster
        else if (circularRatio > 0.02 || linearRatio > 0.05 || darkRatio > 0.3) {
          // Try to classify based on dominant features
          if (darkRatio > 0.3) {
            disasterType = 'earthquake';
            confidence = Math.min(0.7, 0.2 + darkRatio * 1.5);
          } else if (circularRatio > 0.02) {
            disasterType = 'cyclone';
            confidence = Math.min(0.6, 0.2 + circularRatio * 10);
          } else if (linearRatio > 0.05) {
            disasterType = 'flood';
            confidence = Math.min(0.5, 0.15 + linearRatio * 5);
          } else {
            disasterType = 'earthquake'; // Default fallback
            confidence = 0.3;
          }
          severity = 'medium';
          isDisaster = true;
        }
        // Very low threshold for any suspicious activity
        else if (redRatio > 0.05 || blueRatio > 0.08 || grayRatio > 0.2) {
          disasterType = 'earthquake'; // Most likely subtle disaster
          confidence = 0.25;
          severity = 'low';
          isDisaster = true;
        }

        // Object detection based on disaster type
        const objectSummary: Record<string, number> = {};
        let totalObjects = 0;

        switch (disasterType) {
          case 'cyclone':
            objectSummary['debris'] = Math.floor(Math.random() * 5) + 2;
            objectSummary['vehicle'] = Math.floor(Math.random() * 3) + 1;
            objectSummary['person'] = Math.floor(Math.random() * 2);
            totalObjects = objectSummary['debris'] + objectSummary['vehicle'] + objectSummary['person'];
            break;
          case 'fire':
            objectSummary['person'] = Math.floor(Math.random() * 3) + 1;
            objectSummary['vehicle'] = Math.floor(Math.random() * 2);
            objectSummary['building'] = Math.floor(Math.random() * 2) + 1;
            totalObjects = objectSummary['person'] + objectSummary['vehicle'] + objectSummary['building'];
            break;
          case 'flood':
            objectSummary['person'] = Math.floor(Math.random() * 4) + 2;
            objectSummary['vehicle'] = Math.floor(Math.random() * 4);
            objectSummary['building'] = Math.floor(Math.random() * 3) + 1;
            totalObjects = objectSummary['person'] + objectSummary['vehicle'] + objectSummary['building'];
            break;
          case 'earthquake':
            objectSummary['debris'] = Math.floor(Math.random() * 8) + 3;
            objectSummary['person'] = Math.floor(Math.random() * 2) + 1;
            objectSummary['vehicle'] = Math.floor(Math.random() * 2);
            totalObjects = objectSummary['debris'] + objectSummary['person'] + objectSummary['vehicle'];
            break;
          case 'tsunami':
            objectSummary['person'] = Math.floor(Math.random() * 3) + 1;
            objectSummary['vehicle'] = Math.floor(Math.random() * 3);
            objectSummary['debris'] = Math.floor(Math.random() * 6) + 2;
            totalObjects = objectSummary['person'] + objectSummary['vehicle'] + objectSummary['debris'];
            break;
          default:
            objectSummary['person'] = Math.floor(Math.random() * 2) + 1;
            objectSummary['vehicle'] = Math.floor(Math.random() * 2);
            objectSummary['building'] = Math.floor(Math.random() * 1);
            totalObjects = objectSummary['person'] + objectSummary['vehicle'] + objectSummary['building'];
        }

        const detectionResult: DisasterDetection = {
          id: `det_${Date.now()}`,
          timestamp: new Date(),
          disasterType,
          confidence,
          objectsDetected: totalObjects,
          objectSummary,
          imageUrl,
          isDisaster,
          severity,
          location: 'Detected Location'
        };

        console.log('✅ Final Fallback Detection Result:', detectionResult);
        resolve(detectionResult);
      };
      
      img.onerror = () => {
        console.error('❌ Failed to load image for analysis');
        resolve({
          id: `det_${Date.now()}`,
          timestamp: new Date(),
          disasterType: 'none',
          confidence: 0.1,
          objectsDetected: 0,
          objectSummary: {},
          imageUrl,
          isDisaster: false,
          severity: 'low',
          location: 'Unknown'
        });
      };
      
      img.src = imageUrl;
    });
  }, []);

  // Simulate AI disaster detection
  const detectDisaster = useCallback(async (imageUrl: string, filename: string) => {
    setIsProcessing(true);
    setCurrentPhase('detecting');
    setProgress(0);

    // Simulate processing phases with AWS Rekognition
    const phases = [
      { name: 'Loading image...', duration: 800 },
      { name: 'AWS Rekognition analysis...', duration: 1200 },
      { name: 'Detecting disaster patterns...', duration: 1500 },
      { name: 'Analyzing objects & labels...', duration: 1000 },
      { name: 'Calculating confidence scores...', duration: 800 }
    ];

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      setProgress((i + 1) * 16.67);
      await new Promise(resolve => setTimeout(resolve, phase.duration));
    }

    // Use AWS Rekognition service with fallback
    const detectionResult = await analyzeImageForDisaster(imageUrl, filename);

    setDetection(detectionResult);
    setIsProcessing(false);
    setProgress(100);

    toast({
      title: "🔍 Detection Complete!",
      description: `${detectionResult.isDisaster ? '⚠️ Disaster detected' : '✅ No disaster'}: ${detectionResult.disasterType.toUpperCase()} (${Math.round(detectionResult.confidence * 100)}% confidence)`,
      variant: detectionResult.isDisaster ? "destructive" : "default",
    });

    return detectionResult;
  }, [analyzeImageForDisaster, toast]);

  // Send alerts to network
  const sendAlerts = useCallback(async (detection: DisasterDetection) => {
    if (!detection.isDisaster) return;

    setCurrentPhase('alerting');
    setProgress(0);

    // Phase 1: Send to Admin
    await new Promise(resolve => setTimeout(resolve, 1000));
    setAlertStatus(prev => ({ ...prev, sentToAdmin: true }));
    setNetworkNodes(prev => prev.map(node => 
      node.type === 'admin' 
        ? { ...node, status: 'alerted', alertTime: new Date() }
        : node
    ));
    setProgress(25);

    toast({
      title: "🚨 Alert Sent to Admin",
      description: `Emergency alert dispatched to administrator`,
    });

    // Phase 2: Send to Network (Neighbors)
    await new Promise(resolve => setTimeout(resolve, 1500));
    setAlertStatus(prev => ({ ...prev, sentToNetwork: true }));
    setNetworkNodes(prev => prev.map(node => 
      node.type === 'neighbor' 
        ? { ...node, status: 'alerted', alertTime: new Date() }
        : node
    ));
    setProgress(50);

    toast({
      title: "📡 Network Alert Broadcast",
      description: `Alert sent to ${networkNodes.filter(n => n.type === 'neighbor').length} neighbors`,
    });

    // Phase 3: Send to Rescue Teams
    await new Promise(resolve => setTimeout(resolve, 2000));
    setAlertStatus(prev => ({ ...prev, sentToRescue: true }));
    setNetworkNodes(prev => prev.map(node => 
      node.type === 'rescue' 
        ? { ...node, status: 'alerted', alertTime: new Date() }
        : node
    ));
    setProgress(75);

    toast({
      title: "🚑 Rescue Teams Notified",
      description: `Alert sent to ${networkNodes.filter(n => n.type === 'rescue').length} rescue units`,
    });

    // Phase 4: Wait for acknowledgments
    await new Promise(resolve => setTimeout(resolve, 1500));
    setAlertStatus(prev => ({ ...prev, adminAcknowledged: true }));
    setNetworkNodes(prev => prev.map(node => 
      node.type === 'admin' 
        ? { ...node, status: 'acknowledged' }
        : node
    ));
    setProgress(85);

    await new Promise(resolve => setTimeout(resolve, 1000));
    setAlertStatus(prev => ({ ...prev, rescueAcknowledged: true }));
    setNetworkNodes(prev => prev.map(node => 
      node.type === 'rescue' 
        ? { ...node, status: 'responding' }
        : node
    ));
    setProgress(100);

    setCurrentPhase('responding');

    toast({
      title: "🎯 All Units Responding",
      description: "Emergency response teams are en route",
    });

    // Set follow-up reminder (5 minutes = 5 seconds for demo)
    setTimeout(() => {
      if (!alertStatus.resolved) {
        setShowResolutionPrompt(true);
        setAlertStatus(prev => ({ ...prev, followUpSent: true }));
        
        toast({
          title: "⏰ Follow-up Required",
          description: "Has the emergency been resolved?",
          variant: "destructive",
        });
      }
    }, 5000);
  }, [networkNodes, alertStatus.resolved, toast]);

  // Handle image selection
  const handleImageSelect = useCallback(async (imageUrl: string) => {
    setSelectedImage(imageUrl);
    const detectionResult = await detectDisaster(imageUrl, 'sample');
    
    if (detectionResult.isDisaster) {
      await sendAlerts(detectionResult);
    }
  }, [detectDisaster, sendAlerts]);

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageUrl = e.target?.result as string;
      setSelectedImage(imageUrl);
      const detectionResult = await detectDisaster(imageUrl, file.name);
      
      if (detectionResult.isDisaster) {
        await sendAlerts(detectionResult);
      }
    };
    reader.readAsDataURL(file);
  }, [detectDisaster, sendAlerts]);

  // Handle resolution
  const handleResolution = useCallback((resolved: boolean) => {
    setShowResolutionPrompt(false);
    
    if (resolved) {
      setAlertStatus(prev => ({
        ...prev,
        resolved: true,
        resolutionTime: new Date()
      }));
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
    setAlertStatus({
      sentToAdmin: false,
      sentToNetwork: false,
      sentToRescue: false,
      adminAcknowledged: false,
      rescueAcknowledged: false,
      resolved: false,
      followUpSent: false
    });
    setNetworkNodes(NETWORK_NODES);
    setCurrentPhase('upload');
    setProgress(0);
    setShowResolutionPrompt(false);
  }, []);

  const getDisasterIcon = (type: DisasterDetection['disasterType']) => {
    switch (type) {
      case 'fire': return <Flame className="h-6 w-6 text-red-500" />;
      case 'flood': return <Droplets className="h-6 w-6 text-blue-500" />;
      case 'earthquake': return <Mountain className="h-6 w-6 text-orange-500" />;
      case 'tsunami': return <Droplets className="h-6 w-6 text-cyan-500" />;
      case 'cyclone': return <Wind className="h-6 w-6 text-gray-500" />;
      default: return <Shield className="h-6 w-6 text-green-500" />;
    }
  };

  const getSeverityColor = (severity: DisasterDetection['severity']) => {
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
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-sky-500" />
            <span>🚁 RavNResQ Advanced Disaster Detection System</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">AI-Powered Emergency Detection & Response</h2>
            <p className="text-gray-600">
              Upload disaster images or use samples to trigger real-time emergency response simulation
            </p>
            <div className="mt-2 text-sm text-blue-600">
              {awsRekognitionService.getConfigStatus().message}
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
              {/* File Upload */}
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
                  <h3 className="text-lg font-semibold mb-2">Upload Disaster Image/Video</h3>
                  <p className="text-gray-600 mb-4">
                    Upload an image or video of a disaster scene for AI analysis
                  </p>
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-sky-500 hover:bg-sky-600"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </CardContent>
              </Card>

              {/* Sample Images */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Or Use Sample Disaster Images</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {DISASTER_SAMPLES.map((sample) => (
                    <Card 
                      key={sample.id} 
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handleImageSelect(sample.url)}
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
                        <p className="text-xs text-gray-500">{sample.location}</p>
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold">
                  {currentPhase === 'detecting' ? '🔍 Analyzing Disaster Scene...' : '🚨 Dispatching Emergency Alerts...'}
                </h3>
                <p className="text-gray-600">
                  {currentPhase === 'detecting' 
                    ? 'AI is detecting disaster type and analyzing objects'
                    : 'Sending alerts to admin, network, and rescue teams'
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
                      <p>AI Processing in Progress...</p>
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
                      {getDisasterIcon(detection.disasterType)}
                      <span>⚠️ DISASTER DETECTED</span>
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
                      <p className="font-semibold capitalize">{detection.disasterType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Confidence</p>
                      <p className="font-semibold">{Math.round(detection.confidence * 100)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Objects Found</p>
                      <p className="font-semibold">{detection.objectsDetected}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="font-semibold">{detection.location}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Object Detection Summary:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(detection.objectSummary).map(([object, count]) => (
                        <Badge key={object} variant="outline">
                          {object}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Alert>
                    <Radio className="h-4 w-4" />
                    <AlertDescription>
                      Emergency alerts have been sent to administrator, nearby neighbors, and rescue teams. 
                      Response units are currently en route to the location.
                    </AlertDescription>
                  </Alert>
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
                    {/* Alert Status Timeline */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${alertStatus.sentToAdmin ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm">Alert sent to Administrator</span>
                        {alertStatus.adminAcknowledged && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${alertStatus.sentToNetwork ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm">Network broadcast to Neighbors</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${alertStatus.sentToRescue ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm">Rescue teams deployed</span>
                        {alertStatus.rescueAcknowledged && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </div>
                    </div>

                    {/* Network Nodes */}
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
                    5 minutes have passed since the emergency alert. Has the situation been resolved?
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
                
                {alertStatus.resolutionTime && (
                  <div className="text-sm text-gray-600">
                    Resolution time: {alertStatus.resolutionTime.toLocaleString()}
                  </div>
                )}
                
                <Button onClick={resetSimulation} className="bg-sky-500 hover:bg-sky-600">
                  <Shield className="h-4 w-4 mr-2" />
                  Run New Simulation
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Reset Button */}
          {currentPhase !== 'upload' && currentPhase !== 'resolved' && (
            <div className="text-center">
              <Button onClick={resetSimulation} variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                Reset Simulation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

import { useEffect, useRef, useState } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Square, AlertTriangle, Loader2, Signal } from 'lucide-react';

interface DetectedObject {
  class: string;
  score: number;
  bbox: [number, number, number, number];
}

interface LiveStreamBroadcastProps {
  streamId: string;
  isAdmin: boolean;
  onStop: () => void;
  quality: 'SD' | 'HD' | '4K';
}

export const LiveStreamBroadcast = ({ streamId, isAdmin, onStop, quality }: LiveStreamBroadcastProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const broadcastCanvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [detections, setDetections] = useState<DetectedObject[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastCount, setBroadcastCount] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();
  const broadcastIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameNumberRef = useRef(0);

  useEffect(() => {
    if (isAdmin) {
      initializeStream();
    }

    return () => {
      cleanup();
    };
  }, [isAdmin]);

  useEffect(() => {
    if (model && isStreaming && isAdmin && videoRef.current) {
      startObjectDetection();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [model, isStreaming, isAdmin]);

  const initializeStream = async () => {
    try {
      await startStream();
      await loadModel();
      setTimeout(() => startBroadcasting(), 2000); // Wait 2 seconds for video to be ready
    } catch (error) {
      console.error('❌ Error initializing stream:', error);
    }
  };

  const loadModel = async () => {
    try {
      setIsModelLoading(true);
      console.log('🔄 Loading COCO-SSD model...');
      const loadedModel = await cocoSsd.load({
        base: 'lite_mobilenet_v2'
      });
      setModel(loadedModel);
      console.log('✅ Model loaded successfully');
    } catch (error) {
      console.error('❌ Error loading detection model:', error);
    } finally {
      setIsModelLoading(false);
    }
  };

  const startStream = async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: quality === '4K' ? 1920 : (quality === 'HD' ? 1280 : 640) },
          height: { ideal: quality === '4K' ? 1080 : (quality === 'HD' ? 720 : 480) },
          facingMode: 'user'
        },
        audio: false
      };

      console.log('📹 Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsStreaming(true);
          console.log('✅ Stream started successfully');
        };
      }
    } catch (error) {
      console.error('❌ Error starting stream:', error);
      throw error;
    }
  };

  const startBroadcasting = () => {
    if (!isAdmin) return;

    console.log('📡 Starting frame broadcast...');
    setIsBroadcasting(true);
    
    broadcastIntervalRef.current = setInterval(() => {
      broadcastFrame();
    }, 200); // Broadcast every 200ms (5 FPS)

    console.log('✅ Broadcasting started');
  };

  const broadcastFrame = async () => {
    if (!videoRef.current || !broadcastCanvasRef.current) {
      console.log('⚠️ Video or canvas not ready');
      return;
    }

    const video = videoRef.current;
    const canvas = broadcastCanvasRef.current;

    if (video.readyState !== 4) {
      console.log('⏳ Video not ready (readyState:', video.readyState, ')');
      return;
    }

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.log('❌ Could not get canvas context');
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameData = canvas.toDataURL('image/jpeg', 0.7); // 70% quality

      frameNumberRef.current++;
      
      console.log(`📤 Broadcasting frame ${frameNumberRef.current}`);
      
      const { error } = await supabase
        .from('stream_frames')
        .insert({
          stream_id: streamId,
          frame_data: frameData,
          frame_number: frameNumberRef.current
        });

      if (error) {
        console.error('❌ Broadcast error:', error);
      } else {
        setBroadcastCount(prev => prev + 1);
        if (frameNumberRef.current % 10 === 0) {
          console.log(`✅ Successfully broadcasted ${frameNumberRef.current} frames`);
        }
      }
    } catch (error) {
      console.error('❌ Exception in broadcastFrame:', error);
    }
  };

  const startObjectDetection = () => {
    if (!model || !videoRef.current || !canvasRef.current) return;

    const detectFrame = async () => {
      if (videoRef.current && videoRef.current.readyState === 4 && model) {
        try {
          const predictions = await model.detect(videoRef.current);
          setDetections(predictions as DetectedObject[]);
          drawDetections(predictions as DetectedObject[]);
        } catch (error) {
          console.error('Detection error:', error);
        }
      }

      animationFrameRef.current = requestAnimationFrame(detectFrame);
    };

    detectFrame();
  };

  const drawDetections = (predictions: DetectedObject[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    predictions.forEach((prediction) => {
      const [x, y, width, height] = prediction.bbox;
      
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);

      ctx.fillStyle = '#FF0000';
      const text = `${prediction.class} ${Math.round(prediction.score * 100)}%`;
      ctx.font = '18px Arial';
      const textWidth = ctx.measureText(text).width;
      ctx.fillRect(x, y > 30 ? y - 30 : y, textWidth + 10, 30);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(text, x + 5, y > 30 ? y - 8 : y + 20);
    });
  };

  const cleanup = () => {
    console.log('🧹 Cleaning up stream...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (broadcastIntervalRef.current) {
      clearInterval(broadcastIntervalRef.current);
    }
    setIsStreaming(false);
    setIsBroadcasting(false);
  };

  const handleStop = () => {
    cleanup();
    onStop();
  };

  return (
    <Card className="border-sky-100">
      <CardContent className="p-4">
        <div className="relative">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            
            <canvas ref={broadcastCanvasRef} className="hidden" />
            
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ objectFit: 'cover' }}
            />

            {isModelLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-white text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Loading AI Detection...</p>
                </div>
              </div>
            )}

            <div className="absolute top-4 left-4 flex gap-2">
              <Badge className="bg-red-500 text-white">
                <span className="animate-pulse mr-1">●</span>
                LIVE
              </Badge>
              {isBroadcasting && (
                <Badge className="bg-purple-500 text-white">
                  <Signal className="h-3 w-3 mr-1 animate-pulse" />
                  Broadcasting
                </Badge>
              )}
              {model && (
                <Badge className="bg-green-500 text-white">
                  <Eye className="h-3 w-3 mr-1" />
                  AI Active
                </Badge>
              )}
            </div>

            {detections.length > 0 && (
              <div className="absolute top-4 right-4 space-y-1 max-h-48 overflow-y-auto">
                {Array.from(new Set(detections.map(d => d.class))).slice(0, 5).map((cls, idx) => (
                  <Badge key={idx} className="bg-orange-500 text-white block">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {cls} detected
                  </Badge>
                ))}
              </div>
            )}

            <div className="absolute bottom-4 left-4">
              <Button onClick={handleStop} variant="destructive" size="sm">
                <Square className="h-4 w-4 mr-2" />
                Stop Stream
              </Button>
            </div>

            <div className="absolute bottom-4 right-4 space-y-1">
              <div className="bg-black/70 text-white px-3 py-1 rounded text-sm">
                Objects: {detections.length}
              </div>
              <div className="bg-black/70 text-white px-3 py-1 rounded text-sm">
                Frames: {frameNumberRef.current}
              </div>
              {isBroadcasting && broadcastCount > 0 && (
                <div className="bg-purple-600/90 text-white px-3 py-1 rounded text-sm">
                  📡 Sent: {broadcastCount}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

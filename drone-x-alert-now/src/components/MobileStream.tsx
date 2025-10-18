import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Square, Signal, Zap, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const MobileStream = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const startMobileStream = async () => {
    try {
      setError('');
      setIsLoading(true);

      console.log('Checking camera support...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      const constraints = {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: { ideal: 'environment' },
          frameRate: { ideal: 30 }
        },
        audio: true
      };

      console.log('Requesting mobile camera access with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsStreaming(true);
          setIsLoading(false);
          console.log('Mobile stream started successfully');
        };
      }

      toast({
        title: "Camera Connected",
        description: "Your mobile camera is now streaming",
      });

    } catch (err: unknown) {
      console.error('Mobile stream error:', err);
      let errorMessage = 'Failed to access camera';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera found on this device.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera is being used by another app. Please close other apps using the camera.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Camera constraints not supported. Trying with default settings...';
          retryWithSimpleConstraints();
          return;
        } else if (err.message) {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setIsLoading(false);
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const retryWithSimpleConstraints = async () => {
    try {
      console.log('Retrying with simple constraints...');
      const simpleConstraints = {
        video: true,
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(simpleConstraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsStreaming(true);
          setIsLoading(false);
        };
      }

      toast({
        title: "Camera Connected",
        description: "Camera started with default settings",
      });
    } catch (err: unknown) {
      console.error('Retry failed:', err);
      setError('Unable to access camera with any settings');
      setIsLoading(false);
    }
  };

  const stopMobileStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      streamRef.current = null;
    }
    setIsStreaming(false);
    toast({
      title: "Stream Stopped",
      description: "Mobile camera has been disconnected",
    });
  };

  useEffect(() => {
    console.log('MobileStream component mounted');
    startMobileStream();

    return () => {
      console.log('MobileStream component unmounting - cleaning up');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <Card className="border-sky-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-6 w-6 text-sky-600" />
                <span>Mobile Drone Stream</span>
              </div>
              {isStreaming && (
                <Badge className="bg-red-500 text-white">
                  <span className="animate-pulse mr-1">●</span>
                  LIVE
                </Badge>
              )}
              {isLoading && (
                <Badge className="bg-yellow-500 text-white">
                  Loading...
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Error Alert */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900">Camera Error</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <Button
                    onClick={startMobileStream}
                    variant="outline"
                    size="sm"
                    className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Video Preview */}
        <Card className="border-sky-200">
          <CardContent className="p-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />

              {/* Status Overlay */}
              <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
                <Badge className="bg-green-500 text-white">
                  <Signal className="h-3 w-3 mr-1" />
                  Mobile Camera
                </Badge>
                {isStreaming && (
                  <Badge className="bg-blue-500 text-white">
                    <Zap className="h-3 w-3 mr-1" />
                    HD Quality
                  </Badge>
                )}
              </div>

              {/* Loading state */}
              {isLoading && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <div className="text-center text-white p-6">
                    <Camera className="h-12 w-12 mx-auto mb-3 animate-pulse" />
                    <p className="text-lg font-semibold">Connecting to camera...</p>
                    <p className="text-sm opacity-90 mt-2">Please allow camera access when prompted</p>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-3 mt-4">
              {!isStreaming ? (
                <Button
                  onClick={startMobileStream}
                  disabled={isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {isLoading ? 'Starting...' : 'Start Camera'}
                </Button>
              ) : (
                <Button
                  onClick={stopMobileStream}
                  variant="destructive"
                  className="flex-1"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop Camera
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-sky-200">
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Instructions</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Allow camera access when prompted by your browser</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Position your device to capture the emergency area</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Stream will be visible to admin for real-time monitoring</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Keep this page open while streaming</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Debug Info - Remove in production */}
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-900 mb-2 text-sm">Debug Info</h3>
            <div className="text-xs text-gray-600 space-y-1 font-mono">
              <p>Camera Support: {navigator.mediaDevices ? '✅ Yes' : '❌ No'}</p>
              <p>Is Streaming: {isStreaming ? '✅ Yes' : '❌ No'}</p>
              <p>Is Loading: {isLoading ? '⏳ Yes' : '✅ No'}</p>
              <p>Has Error: {error ? '❌ Yes' : '✅ No'}</p>
              <p>User Agent: {navigator.userAgent.substring(0, 50)}...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

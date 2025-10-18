import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, Zap, Users, MapPin, Signal,
  Monitor, AlertTriangle, Loader2, Eye, History
} from "lucide-react";
import { useDroneStreaming } from '@/hooks/useDroneStreaming';
import type { DroneStream } from '@/types/streaming';

interface RealtimeDroneStreamProps {
  fullSize?: boolean;
}

export const RealtimeDroneStream = ({ fullSize = false }: RealtimeDroneStreamProps) => {
  const navigate = useNavigate();
  const { activeStreams, currentStream, loading, joinStream, leaveStream, setCurrentStream, isAdmin } = useDroneStreaming();
  const [receivedFrame, setReceivedFrame] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [isReceiving, setIsReceiving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [imageError, setImageError] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFrameNumberRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const currentStreamIdRef = useRef<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    currentStreamIdRef.current = currentStream?.id || null;
  }, [currentStream?.id]);

  useEffect(() => {
    mountedRef.current = true;
    const streamId = currentStream?.id;

    if (streamId && !isAdmin) {
      console.log('🎬 Starting polling for stream:', currentStream.stream_name, '| ID:', streamId);
      startPollingFrames(streamId);
    } else {
      console.log('🛑 Conditions not met for polling - stopping');
      stopPollingFrames();
    }

    return () => {
      mountedRef.current = false;
      stopPollingFrames();
    };
  }, [currentStream?.id, isAdmin]);

  const startPollingFrames = (streamId: string) => {
    if (pollIntervalRef.current) {
      console.log('⏹️ Stopping existing poll');
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    console.log(`📡 Starting frame polling for stream: ${streamId}`);
    setIsReceiving(true);
    setConnectionStatus('connecting');
    lastFrameNumberRef.current = 0;
    setReceivedFrame(null);
    setImageError(false);

    fetchLatestFrame(streamId);

    pollIntervalRef.current = setInterval(() => {
      if (mountedRef.current && currentStreamIdRef.current === streamId) {
        fetchLatestFrame(streamId);
      } else {
        console.log('⏹️ Stream changed or unmounted, stopping poll');
        stopPollingFrames();
      }
    }, 150);

    console.log('✅ Frame polling interval created');
  };

  const fetchLatestFrame = async (streamId: string) => {
    if (!mountedRef.current) return;

    try {
      const { data, error } = await supabase
        .from('stream_frames')
        .select('frame_data, frame_number')
        .eq('stream_id', streamId)
        .order('frame_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching frame:', error);
        setConnectionStatus('error');
        return;
      }

      
      if (data && data.frame_data) {
        if (data.frame_number > lastFrameNumberRef.current) {
          console.log(`✅ Received frame: ${data.frame_number}`);
          console.log(`🖼️ Frame data length: ${data.frame_data.length} chars`);
          console.log(`🖼️ Frame preview: ${data.frame_data.substring(0, 50)}...`);
          
          setReceivedFrame(data.frame_data);
          setFrameCount(data.frame_number);
          lastFrameNumberRef.current = data.frame_number;
          setConnectionStatus('connected');
          setImageError(false);
        }
      } else {
        if (lastFrameNumberRef.current === 0) {
          console.log('⏳ Waiting for first frame...');
        }
      }
    } catch (err) {
      console.error('❌ Exception fetching frame:', err);
      setConnectionStatus('error');
    }
  };

  const stopPollingFrames = () => {
    if (pollIntervalRef.current) {
      console.log('🛑 Stopping frame polling');
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsReceiving(false);
  };

  const switchStream = (stream: DroneStream) => {
    console.log('🔄 Switching stream to:', stream.stream_name);
    
    if (currentStream) {
      leaveStream(currentStream.id);
    }
    
    stopPollingFrames();
    setReceivedFrame(null);
    setFrameCount(0);
    lastFrameNumberRef.current = 0;
    setConnectionStatus('connecting');
    setImageError(false);
    
    setCurrentStream(stream);
    joinStream(stream.id);
  };

  const containerHeight = fullSize ? "h-96" : "h-64";

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
      <Alert className="border-blue-200 bg-blue-50">
        <History className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          <div className="space-y-3">
            <p className="font-semibold text-lg">No Active Live Streams</p>
            <p>There are no emergency response teams broadcasting at the moment.</p>
            <Button 
              onClick={() => navigate('/past-streams')} 
              variant="outline" 
              className="mt-2"
            >
              <History className="h-4 w-4 mr-2" />
              View Past Streams
            </Button>
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
                {receivedFrame && connectionStatus === 'connected' && (
                  <Badge className="bg-green-100 text-green-700">
                    <Eye className="h-3 w-3 mr-1" />
                    Receiving
                  </Badge>
                )}
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
      <div className={`relative ${containerHeight} bg-black rounded-lg overflow-hidden`}>
        {!isAdmin && receivedFrame ? (
          <>
            <img
              ref={imgRef}
              key={`frame-${frameCount}`}
              src={receivedFrame}
              alt={`Frame ${frameCount}`}
              className="w-full h-full object-cover"
              style={{ display: 'block' }}
              onLoad={() => {
                console.log(`🖼️ ✅ Frame ${frameCount} loaded successfully!`);
                setImageError(false);
              }}
              onError={(e) => {
                console.error(`❌ Frame ${frameCount} failed to load!`);
                console.log('Error:', e);
                setImageError(true);
              }}
            />
            
            <div className="absolute top-4 left-4 flex gap-2 z-10">
              <Badge className="bg-red-500 text-white">
                <span className="animate-pulse mr-1">●</span>
                LIVE
              </Badge>
              <Badge className="bg-green-500 text-white">
                <Signal className="h-3 w-3 mr-1 animate-pulse" />
                Streaming
              </Badge>
              {imageError && (
                <Badge className="bg-yellow-500 text-white">
                  ⚠️ Image Error
                </Badge>
              )}
            </div>

            <div className="absolute bottom-4 right-4 flex gap-2 z-10">
              <div className="bg-black/70 text-white px-3 py-1 rounded text-sm">
                Frame: {frameCount}
              </div>
              <div className="bg-black/70 text-white px-3 py-1 rounded text-sm">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          </>
        ) : !isAdmin && !receivedFrame && currentStream ? (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center text-white p-8 max-w-md">
              <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin text-sky-400" />
              <h3 className="text-xl font-semibold mb-2">
                {connectionStatus === 'connecting' ? 'Connecting to Stream' : 'Waiting for Stream'}
              </h3>
              <p className="text-sm opacity-75 mb-4">
                {connectionStatus === 'error' 
                  ? 'Connection error. Retrying...' 
                  : 'Waiting for admin to start broadcasting...'}
              </p>
              {currentStream && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{currentStream.location}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Monitor className="h-4 w-4" />
                    <span>{currentStream.stream_quality} Quality</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Signal className="h-4 w-4 animate-pulse" />
                    <span>Stream ID: {currentStream.id.substring(0, 8)}...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent animate-pulse"></div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Stream Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DroneStream } from '@/types/streaming';

export const useDroneStreaming = () => {
  const [activeStreams, setActiveStreams] = useState<DroneStream[]>([]);
  const [currentStream, setCurrentStream] = useState<DroneStream | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkUserRole();
    loadActiveStreams();
    setupRealtimeSubscription();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, []);

  // Heartbeat to keep viewer status alive
  useEffect(() => {
    if (!currentStream) {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      return;
    }

    // Initial join
    joinStream(currentStream.id);

    // Set up heartbeat interval - updates last_seen every 15 seconds
    heartbeatIntervalRef.current = setInterval(() => {
      if (currentStream) {
        joinStream(currentStream.id);
      }
    }, 15000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [currentStream]);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasAdminRole = roles?.some(r => r.role === 'admin');
      setIsAdmin(hasAdminRole || false);
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const loadActiveStreams = async () => {
    try {
      const { data, error } = await supabase
        .from('drone_streams')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const typedStreams = (data || []).map(stream => ({
        ...stream,
        stream_quality: stream.stream_quality as 'SD' | 'HD' | '4K',
        emergency_level: stream.emergency_level as 'low' | 'medium' | 'high' | 'critical',
        viewer_count: stream.viewer_count || 0
      })) as DroneStream[];
      
      setActiveStreams(typedStreams);
      
      // Only set current stream if there isn't one already
      // This prevents automatic switching between streams
      if (typedStreams && typedStreams.length > 0 && !currentStream) {
        console.log('📺 Setting initial stream:', typedStreams[0].stream_name);
        setCurrentStream(typedStreams[0]);
      }
    } catch (error) {
      console.error('Error loading streams:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const streamChannel = supabase
      .channel('drone_streams_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drone_streams',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const stream = {
              ...payload.new,
              stream_quality: payload.new.stream_quality as 'SD' | 'HD' | '4K',
              emergency_level: payload.new.emergency_level as 'low' | 'medium' | 'high' | 'critical',
              viewer_count: payload.new.viewer_count || 0
            } as DroneStream;
            
            if (stream.is_active) {
              setActiveStreams(prev => {
                const filtered = prev.filter(s => s.id !== stream.id);
                return [stream, ...filtered];
              });
              
              // Update current stream data if it's the same stream
              if (currentStream?.id === stream.id) {
                console.log('🔄 Updating current stream data');
                setCurrentStream(stream);
              }
            } else {
              setActiveStreams(prev => prev.filter(s => s.id !== stream.id));
              
              // Only clear current stream if it's being deactivated
              if (currentStream?.id === stream.id) {
                console.log('🛑 Current stream deactivated');
                setCurrentStream(null);
              }
            }
          } else if (payload.eventType === 'DELETE') {
            setActiveStreams(prev => prev.filter(s => s.id !== payload.old.id));
            
            if (currentStream?.id === payload.old.id) {
              console.log('🗑️ Current stream deleted');
              setCurrentStream(null);
            }
          }
        }
      )
      .subscribe();

    channelRef.current = streamChannel;
  };

  const startStream = async (streamData: Omit<DroneStream, 'id' | 'admin_id' | 'created_at' | 'updated_at' | 'viewer_count'>) => {
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only admins can start streams",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('Starting stream with data:', streamData);

      const insertData = {
        admin_id: user.id,
        stream_name: streamData.stream_name,
        location: streamData.location,
        latitude: streamData.latitude || null,
        longitude: streamData.longitude || null,
        is_active: true,
        stream_quality: streamData.stream_quality,
        emergency_level: streamData.emergency_level,
        description: streamData.description || null,
        device_type: streamData.device_type || 'laptop',
        connection_mode: streamData.connection_mode || 'wifi',
      };

      const { data, error } = await supabase
        .from('drone_streams')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Stream created successfully:', data);

      toast({
        title: "Stream Started",
        description: `Live stream "${streamData.stream_name}" is now active`,
      });

      const typedStream = {
        ...data,
        stream_quality: data.stream_quality as 'SD' | 'HD' | '4K',
        emergency_level: data.emergency_level as 'low' | 'medium' | 'high' | 'critical',
        viewer_count: data.viewer_count || 0
      } as DroneStream;

      return typedStream;
    } catch (error) {
      console.error('Error starting stream:', error);
      
      let errorMessage = "Failed to start stream";
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as { message: string }).message;
      }
      
      toast({
        title: "Stream Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    }
  };

  const stopStream = async (streamId: string) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('drone_streams')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', streamId);

      if (error) throw error;

      toast({
        title: "Stream Stopped",
        description: "Live stream has been deactivated",
      });
    } catch (error) {
      console.error('Error stopping stream:', error);
      toast({
        title: "Stream Error",
        description: "Failed to stop stream",
        variant: "destructive",
      });
    }
  };

  const joinStream = async (streamId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('stream_viewers')
        .upsert({
          stream_id: streamId,
          user_id: user.id,
          last_seen: new Date().toISOString(),
        }, {
          onConflict: 'stream_id,user_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ Error joining stream:', error);
      } else {
        // Call RPC function to update viewer count
        try {
          const { data: viewerCount } = await supabase
            .rpc('get_stream_viewer_count', { p_stream_id: streamId });
          
          if (viewerCount !== null && viewerCount !== undefined) {
            console.log(`👥 Stream now has ${viewerCount} viewer(s)`);
          }
        } catch (rpcError) {
          // Silently fail - viewer count will update via trigger
          console.log('Viewer count will update automatically');
        }
      }
    } catch (error) {
      console.error('❌ Exception joining stream:', error);
    }
  };

  const leaveStream = async (streamId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log(`👋 Leaving stream: ${streamId}`);

      const { error } = await supabase
        .from('stream_viewers')
        .delete()
        .eq('stream_id', streamId)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Error leaving stream:', error);
      } else {
        console.log('✅ Left stream successfully');
      }
    } catch (error) {
      console.error('❌ Exception leaving stream:', error);
    }
  };

  return {
    activeStreams,
    currentStream,
    isAdmin,
    loading,
    startStream,
    stopStream,
    joinStream,
    leaveStream,
    setCurrentStream,
  };
};

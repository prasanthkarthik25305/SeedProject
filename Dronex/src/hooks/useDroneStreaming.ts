
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DroneStream {
  id: string;
  admin_id: string;
  stream_name: string;
  location: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  stream_quality: 'SD' | 'HD' | '4K';
  viewer_count: number;
  emergency_level: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  created_at: string;
  updated_at: string;
}

export const useDroneStreaming = () => {
  const [activeStreams, setActiveStreams] = useState<DroneStream[]>([]);
  const [currentStream, setCurrentStream] = useState<DroneStream | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    checkUserRole();
    loadActiveStreams();
    setupRealtimeSubscription();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

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
      
      // Type cast the database response to match our interface
      const typedStreams = (data || []).map(stream => ({
        ...stream,
        stream_quality: stream.stream_quality as 'SD' | 'HD' | '4K',
        emergency_level: stream.emergency_level as 'low' | 'medium' | 'high' | 'critical'
      })) as DroneStream[];
      
      setActiveStreams(typedStreams);
      
      if (typedStreams && typedStreams.length > 0) {
        setCurrentStream(typedStreams[0]);
        await joinStream(typedStreams[0].id);
      }
    } catch (error) {
      console.error('Error loading streams:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
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
              emergency_level: payload.new.emergency_level as 'low' | 'medium' | 'high' | 'critical'
            } as DroneStream;
            
            if (stream.is_active) {
              setActiveStreams(prev => {
                const filtered = prev.filter(s => s.id !== stream.id);
                return [stream, ...filtered];
              });
            } else {
              setActiveStreams(prev => prev.filter(s => s.id !== stream.id));
            }
          } else if (payload.eventType === 'DELETE') {
            setActiveStreams(prev => prev.filter(s => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const startStream = async (streamData: Omit<DroneStream, 'id' | 'admin_id' | 'created_at' | 'updated_at' | 'viewer_count'>) => {
    if (!isAdmin) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('drone_streams')
        .insert({
          admin_id: user.id,
          ...streamData,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Stream Started",
        description: `Live stream "${streamData.stream_name}" is now active`,
      });

      // Type cast the response
      const typedStream = {
        ...data,
        stream_quality: data.stream_quality as 'SD' | 'HD' | '4K',
        emergency_level: data.emergency_level as 'low' | 'medium' | 'high' | 'critical'
      } as DroneStream;

      return typedStream;
    } catch (error) {
      console.error('Error starting stream:', error);
      toast({
        title: "Stream Error",
        description: "Failed to start stream",
        variant: "destructive",
      });
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

      // Add viewer record
      await supabase
        .from('stream_viewers')
        .upsert({
          stream_id: streamId,
          user_id: user.id,
          last_seen: new Date().toISOString(),
        });

    } catch (error) {
      console.error('Error joining stream:', error);
    }
  };

  const leaveStream = async (streamId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('stream_viewers')
        .delete()
        .eq('stream_id', streamId)
        .eq('user_id', user.id);

    } catch (error) {
      console.error('Error leaving stream:', error);
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

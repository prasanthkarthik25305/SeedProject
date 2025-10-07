import { useState, useRef, useCallback } from 'react';

export interface UseAudioPlaybackReturn {
  isPlaying: boolean;
  play: (audioUrl: string) => Promise<void>;
  stop: () => void;
  error: string | null;
}

export const useAudioPlayback = (): UseAudioPlaybackReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(async (audioUrl: string) => {
    try {
      setError(null);
      
      if (audioRef.current) {
        audioRef.current.pause();
      }

      audioRef.current = new Audio(audioUrl);
      
      audioRef.current.onplay = () => setIsPlaying(true);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => {
        setError('Failed to play audio');
        setIsPlaying(false);
      };

      await audioRef.current.play();
    } catch (err) {
      setError('Failed to play audio');
      setIsPlaying(false);
      console.error('Audio playback error:', err);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  return {
    isPlaying,
    play,
    stop,
    error
  };
};
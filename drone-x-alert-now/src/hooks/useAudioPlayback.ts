
import { useRef, useCallback } from 'react';

export const useAudioPlayback = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = useCallback(async (audioUrl: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      await audio.play();
      return new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
      });
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  return { playAudio, stopAudio };
};

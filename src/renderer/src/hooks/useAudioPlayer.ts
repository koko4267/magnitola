import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../state/playerStore';

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const {
    currentTrack,
    isPlaying,
    setPlaying,
    nextTrack,
    setTime
  } = usePlayerStore();

  // Initialize Audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.volume = 1.0;
    audioRef.current = audio;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => nextTrack();
    const onTimeUpdate = () => {
      setTime(audio.currentTime, audio.duration || 0);
    };
    const onError = (e: Event) => {
      console.warn('Audio playback error, advancing to next track:', e);
      setPlaying(false);
      nextTrack();
    };

    const onLoadedMetadata = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setTime(audio.currentTime, audio.duration);
      }
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('durationchange', onLoadedMetadata);
    audio.addEventListener('error', onError);

    usePlayerStore.getState().setSeekHandler((time: number) => {
      if (audioRef.current && Number.isFinite(time)) {
        audioRef.current.currentTime = time;
      }
    });

    return () => {
      usePlayerStore.getState().setSeekHandler(null);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('durationchange', onLoadedMetadata);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Synchronize audio source when currentTrack changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentTrack) {
      audio.pause();
      audio.src = '';
      return;
    }

    const encodedPath = encodeURIComponent(currentTrack.filePath);
    const mediaUrl = `media://local/${encodedPath}`;

    if (audio.src !== mediaUrl) {
      audio.src = mediaUrl;
      if (isPlaying) {
        audio.play().catch((err) => {
          console.warn('Playback play request prevented:', err);
        });
      }
    }
  }, [currentTrack]);

  // Synchronize play/pause state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;

    if (isPlaying && audio.paused) {
      audio.play().catch((err) => {
        console.warn('Playback play request prevented:', err);
      });
    } else if (!isPlaying && !audio.paused) {
      audio.pause();
    }
  }, [isPlaying]);

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  return { seek };
}

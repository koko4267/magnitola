import { create } from 'zustand';
import { LibraryTrack } from '@shared/types/player';

interface PlayerState {
  tracks: LibraryTrack[];
  currentTrack: LibraryTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;

  loadTracks: (folderPath?: string) => Promise<void>;
  setTracks: (tracks: LibraryTrack[]) => void;
  addTrack: (track: LibraryTrack) => void;
  playTrack: (track: LibraryTrack) => void;
  togglePlay: () => void;
  setPlaying: (isPlaying: boolean) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setTime: (currentTime: number, duration: number) => void;
  seekHandler: ((time: number) => void) | null;
  setSeekHandler: (fn: ((time: number) => void) | null) => void;
  seek: (time: number) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  tracks: [],
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,

  loadTracks: async (folderPath?: string) => {
    try {
      const tracks = await window.electronAPI.library.scanFolder(folderPath);
      get().setTracks(tracks);
    } catch (err) {
      console.error('Failed to load library tracks:', err);
    }
  },

  setTracks: (tracks: LibraryTrack[]) => {
    const current = get().currentTrack;
    const updatedCurrent = current
      ? tracks.find((t) => t.id === current.id || t.filePath.toLowerCase() === current.filePath.toLowerCase()) || null
      : null;

    set({
      tracks,
      currentTrack: updatedCurrent
    });
  },

  addTrack: (track: LibraryTrack) => {
    const { tracks, currentTrack } = get();
    const existingIndex = tracks.findIndex(
      (t) => t.id === track.id || t.filePath.toLowerCase() === track.filePath.toLowerCase()
    );

    if (existingIndex >= 0) {
      const existing = tracks[existingIndex];
      const needsArt = !existing.hasArtwork && track.hasArtwork;
      const needsDur = (!existing.duration || existing.duration <= 0) && Boolean(track.duration && track.duration > 0);
      if (needsArt || needsDur) {
        const merged: LibraryTrack = {
          ...existing,
          hasArtwork: existing.hasArtwork || track.hasArtwork,
          artworkDataUrl: track.artworkDataUrl || existing.artworkDataUrl,
          duration: track.duration || existing.duration
        };
        const updated = [...tracks];
        updated[existingIndex] = merged;
        const updatedCurrent = (currentTrack && (currentTrack.id === existing.id || currentTrack.filePath.toLowerCase() === existing.filePath.toLowerCase()))
          ? merged
          : currentTrack;
        set({ tracks: updated, currentTrack: updatedCurrent });
      }
      return;
    }

    const updated = [track, ...tracks];
    set({
      tracks: updated
    });
  },

  playTrack: (track: LibraryTrack) => {
    get().seekHandler?.(0);
    set({
      currentTrack: track,
      isPlaying: true,
      currentTime: 0
    });
  },

  togglePlay: () => {
    const { currentTrack, tracks, isPlaying } = get();
    if (!currentTrack && tracks.length > 0) {
      get().seekHandler?.(0);
      set({ currentTrack: tracks[0], isPlaying: true, currentTime: 0 });
      return;
    }
    if (currentTrack) {
      set({ isPlaying: !isPlaying });
    }
  },

  setPlaying: (isPlaying: boolean) => set({ isPlaying }),

  nextTrack: () => {
    const { tracks, currentTrack } = get();
    if (tracks.length === 0) return;

    const currentIndex = currentTrack
      ? tracks.findIndex((t) => t.id === currentTrack.id || t.filePath.toLowerCase() === currentTrack.filePath.toLowerCase())
      : -1;
    const nextIndex = (currentIndex < 0 || currentIndex >= tracks.length - 1) ? 0 : currentIndex + 1;
    get().seekHandler?.(0);
    set({
      currentTrack: tracks[nextIndex],
      isPlaying: true,
      currentTime: 0
    });
  },

  prevTrack: () => {
    const { tracks, currentTrack } = get();
    if (tracks.length === 0) return;

    const currentIndex = currentTrack
      ? tracks.findIndex((t) => t.id === currentTrack.id || t.filePath.toLowerCase() === currentTrack.filePath.toLowerCase())
      : -1;
    const prevIndex = currentIndex <= 0 ? tracks.length - 1 : currentIndex - 1;
    get().seekHandler?.(0);
    set({
      currentTrack: tracks[prevIndex],
      isPlaying: true,
      currentTime: 0
    });
  },

  setTime: (currentTime: number, duration: number) => {
    const safeTime = Number.isFinite(currentTime) ? Math.max(0, currentTime) : 0;
    const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
    set({ currentTime: safeTime, duration: safeDuration });
  },

  seekHandler: null,

  setSeekHandler: (fn: ((time: number) => void) | null) => {
    set({ seekHandler: fn });
  },

  seek: (time: number) => {
    if (!Number.isFinite(time)) return;
    const validTime = Math.max(0, time);
    const handler = get().seekHandler;
    if (handler) {
      handler(validTime);
    }
    set({ currentTime: validTime });
  }
}));

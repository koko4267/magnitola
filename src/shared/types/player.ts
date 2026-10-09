export interface LibraryTrack {
  id: string;
  filePath: string;
  fileName: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  hasArtwork: boolean;
  artworkDataUrl?: string | null;
  fileSizeBytes: number;
  dateModified: number;
}

export interface PlayerState {
  currentTrack: LibraryTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

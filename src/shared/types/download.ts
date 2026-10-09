export interface DownloadProgressPayload {
  trackTitle: string;
  trackArtist: string;
  artworkUrl: string | null;
  trackIndex: number;
  totalTracks: number;
  bytesReceived: number;
  totalBytes: number;
  speedKbps: number;
  percent: number;
  alreadyExists?: boolean;
}

export interface DownloadFinishPayload {
  completed: number;
  total: number;
}

export interface DownloadStartResult {
  success: boolean;
  trackCount: number;
  error?: string;
}

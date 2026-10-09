import { create } from 'zustand';
import { DownloadProgressPayload } from '@shared/types/download';

interface DownloadState {
  url: string;
  isDownloading: boolean;
  statusText: string;
  isBusy: boolean;
  currentTrackTitle: string;
  currentTrackArtist: string;
  artworkUrl: string | null;
  progressPercent: number;
  sizeText: string;
  speedText: string;
  counterText: string;
  trackIndex: number;
  totalTracks: number;
  bytesReceived: number;
  totalBytes: number;
  speedKbps: number;
  isDuplicate: boolean;

  setUrl: (url: string) => void;
  startDownload: () => Promise<void>;
  stopDownload: () => Promise<void>;
  handleProgress: (data: DownloadProgressPayload) => void;
  handleFinished: (summary: { completed: number; total: number }) => void;
  handleError: (error: string) => void;
  setStatus: (text: string, isBusy?: boolean) => void;
  resetCard: () => void;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  url: '',
  isDownloading: false,
  statusText: 'Ready to download',
  isBusy: false,
  currentTrackTitle: 'Waiting for link input...',
  currentTrackArtist: 'MAGNITOLA',
  artworkUrl: null,
  progressPercent: 0,
  sizeText: '0.00 / 0.00 MB',
  speedText: '0 KB/s',
  counterText: 'Track 0 of 0',
  trackIndex: 0,
  totalTracks: 0,
  bytesReceived: 0,
  totalBytes: 0,
  speedKbps: 0,
  isDuplicate: false,

  setUrl: (url: string) => set({ url }),

  setStatus: (statusText: string, isBusy = false) => set({ statusText, isBusy }),

  resetCard: () =>
    set({
      currentTrackTitle: 'Waiting for link input...',
      currentTrackArtist: 'MAGNITOLA',
      artworkUrl: null,
      progressPercent: 0,
      sizeText: '0.00 / 0.00 MB',
      speedText: '0 KB/s',
      counterText: 'Track 0 of 0',
      trackIndex: 0,
      totalTracks: 0,
      bytesReceived: 0,
      totalBytes: 0,
      speedKbps: 0,
      isDuplicate: false
    }),

  startDownload: async () => {
    const { url, isDownloading } = get();
    if (!url.trim() || isDownloading) return;

    set({
      isDownloading: true,
      statusText: 'Resolving link...',
      currentTrackTitle: 'Resolving link...',
      currentTrackArtist: 'SoundCloud',
      isBusy: true,
      progressPercent: 0
    });

    try {
      const result = await window.electronAPI.download.start(url);
      if (!result.success) {
        set({
          isDownloading: false,
          isBusy: false,
          statusText: result.error || 'Download failed',
          currentTrackTitle: result.error || 'Download failed'
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error starting download';
      set({
        isDownloading: false,
        isBusy: false,
        statusText: msg,
        currentTrackTitle: msg
      });
    }
  },

  stopDownload: async () => {
    try {
      await window.electronAPI.download.stop();
      set({
        isDownloading: false,
        isBusy: false,
        statusText: 'Download stopped',
        currentTrackTitle: 'Download stopped'
      });
    } catch (err) {
      console.error('Failed to stop download:', err);
    }
  },

  handleProgress: (data: DownloadProgressPayload) => {
    const bytesRec = Number.isFinite(data.bytesReceived) && data.bytesReceived >= 0 ? data.bytesReceived : 0;
    const bytesTot = Number.isFinite(data.totalBytes) && data.totalBytes >= 0 ? data.totalBytes : 0;
    const speed = Number.isFinite(data.speedKbps) && data.speedKbps >= 0 ? data.speedKbps : 0;
    const pct = Number.isFinite(data.percent) ? Math.min(100, Math.max(0, data.percent)) : 0;
    const isDuplicate = Boolean(data.alreadyExists);

    const curMb = (bytesRec / 1024 / 1024).toFixed(2);
    const totalMb = bytesTot > 0 ? (bytesTot / 1024 / 1024).toFixed(2) : '?';

    set({
      currentTrackTitle: data.trackTitle,
      currentTrackArtist: data.trackArtist,
      artworkUrl: data.artworkUrl,
      progressPercent: pct,
      sizeText: isDuplicate ? `${curMb} / ${curMb} MB` : `${curMb} / ${totalMb} MB`,
      speedText: `${speed} KB/s`,
      counterText: `Track ${data.trackIndex} of ${data.totalTracks}`,
      trackIndex: data.trackIndex,
      totalTracks: data.totalTracks,
      bytesReceived: bytesRec,
      totalBytes: bytesTot,
      speedKbps: speed,
      statusText: isDuplicate ? 'Already exists' : `Downloading track... (${data.trackIndex}/${data.totalTracks})`,
      isDuplicate,
      isBusy: true
    });
  },

  handleFinished: (summary) => {
    set({
      isDownloading: false,
      isBusy: false,
      progressPercent: 100,
      statusText: `Download finished! (${summary.completed}/${summary.total})`,
      currentTrackTitle: summary.completed > 0 ? `Finished (${summary.completed}/${summary.total})` : 'Download finished (0 saved)'
    });
  },

  handleError: (error: string) => {
    set({
      isDownloading: false,
      isBusy: false,
      statusText: `Error: ${error}`,
      currentTrackTitle: `Error: ${error}`
    });
  }
}));

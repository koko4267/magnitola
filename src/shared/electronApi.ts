import { DownloadProgressPayload, DownloadFinishPayload, DownloadStartResult } from './types/download';
import { LibraryTrack } from './types/player';
import { AppSettings } from './types/settings';

export interface ElectronAPI {
  download: {
    start: (url: string) => Promise<DownloadStartResult>;
    stop: () => Promise<void>;
    onProgress: (callback: (data: DownloadProgressPayload) => void) => () => void;
    onFinished: (callback: (summary: DownloadFinishPayload) => void) => () => void;
    onError: (callback: (error: string) => void) => () => void;
  };
  library: {
    scanFolder: (customPath?: string) => Promise<LibraryTrack[]>;
    onTrackAdded: (callback: (track: LibraryTrack) => void) => () => void;
  };
  settings: {
    get: () => Promise<AppSettings>;
    update: (partial: Partial<AppSettings>) => Promise<AppSettings>;
    selectFolder: () => Promise<{ path: string; tracks: LibraryTrack[] } | null>;
  };
  system: {
    openExternal: (url: string) => Promise<void>;
    readClipboard: () => Promise<string>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

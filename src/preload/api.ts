import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@shared/ipcChannels';
import { ElectronAPI } from '@shared/electronApi';
import { DownloadProgressPayload, DownloadFinishPayload, DownloadStartResult } from '@shared/types/download';
import { LibraryTrack } from '@shared/types/player';
import { AppSettings } from '@shared/types/settings';

export const api: ElectronAPI = {
  download: {
    start: (url: string): Promise<DownloadStartResult> => {
      return ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_START, url);
    },
    stop: (): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_STOP);
    },
    onProgress: (callback: (data: DownloadProgressPayload) => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: DownloadProgressPayload): void => callback(data);
      ipcRenderer.on(IPC_CHANNELS.DOWNLOAD_PROGRESS, handler);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.DOWNLOAD_PROGRESS, handler);
      };
    },
    onFinished: (callback: (summary: DownloadFinishPayload) => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: DownloadFinishPayload): void => callback(data);
      ipcRenderer.on(IPC_CHANNELS.DOWNLOAD_FINISHED, handler);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.DOWNLOAD_FINISHED, handler);
      };
    },
    onError: (callback: (error: string) => void) => {
      const handler = (_: Electron.IpcRendererEvent, err: string): void => callback(err);
      ipcRenderer.on(IPC_CHANNELS.DOWNLOAD_ERROR, handler);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.DOWNLOAD_ERROR, handler);
      };
    }
  },
  library: {
    scanFolder: (customPath?: string): Promise<LibraryTrack[]> => {
      return ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_SCAN, customPath);
    },
    onTrackAdded: (callback: (track: LibraryTrack) => void) => {
      const handler = (_: Electron.IpcRendererEvent, track: LibraryTrack): void => callback(track);
      ipcRenderer.on(IPC_CHANNELS.LIBRARY_TRACK_ADDED, handler);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.LIBRARY_TRACK_ADDED, handler);
      };
    }
  },
  settings: {
    get: (): Promise<AppSettings> => {
      return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET);
    },
    update: (partial: Partial<AppSettings>): Promise<AppSettings> => {
      return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, partial);
    },
    selectFolder: (): Promise<{ path: string; tracks: LibraryTrack[] } | null> => {
      return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SELECT_FOLDER);
    }
  },
  system: {
    openExternal: (url: string): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_OPEN_EXTERNAL, url);
    },
    readClipboard: (): Promise<string> => {
      return ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_READ_CLIPBOARD);
    }
  }
};

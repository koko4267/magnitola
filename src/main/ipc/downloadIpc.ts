import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@shared/ipcChannels';
import { DownloadService, TrackSavedPayload } from '../services/downloadService';
import { SettingsService } from '../services/settingsService';
import { LibraryService } from '../services/libraryService';

export function registerDownloadIpc(
  getMainWindow: () => BrowserWindow | null,
  downloadService: DownloadService,
  settingsService: SettingsService,
  libraryService: LibraryService
): void {
  ipcMain.removeHandler(IPC_CHANNELS.DOWNLOAD_START);
  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_START, async (_, url: string) => {
    const settings = settingsService.get();
    return downloadService.startDownload(url, settings.downloadFolder);
  });

  ipcMain.removeHandler(IPC_CHANNELS.DOWNLOAD_STOP);
  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_STOP, async () => {
    downloadService.stop();
  });

  // Forward DownloadService events to active Renderer window
  downloadService.removeAllListeners('progress');
  downloadService.on('progress', (payload) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.DOWNLOAD_PROGRESS, payload);
    }
  });

  downloadService.removeAllListeners('finished');
  downloadService.on('finished', (payload) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.DOWNLOAD_FINISHED, payload);
    }
  });

  downloadService.removeAllListeners('error');
  downloadService.on('error', (err) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.DOWNLOAD_ERROR, err);
    }
  });

  downloadService.removeAllListeners('trackSaved');
  downloadService.on('trackSaved', async (payload: TrackSavedPayload) => {
    try {
      let track = libraryService.getCachedTrack(payload.filePath);
      if (!track) {
        if (payload.artworkDataUrl) {
          track = libraryService.addTrackDirectly(
            payload.filePath,
            payload.title,
            payload.artist,
            payload.artworkDataUrl,
            payload.fileSizeBytes,
            payload.duration || 0
          );
        } else {
          track = await libraryService.getOrParseTrack(payload.filePath);
        }
      }
      const win = getMainWindow();
      if (track && win && !win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.LIBRARY_TRACK_ADDED, track);
      }
    } catch (err) {
      console.warn('Failed to notify renderer about newly saved track:', err);
    }
  });
}

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipcChannels';
import { LibraryService } from '../services/libraryService';
import { SettingsService } from '../services/settingsService';

export function registerLibraryIpc(
  libraryService: LibraryService,
  settingsService: SettingsService
): void {
  ipcMain.removeHandler(IPC_CHANNELS.LIBRARY_SCAN);
  ipcMain.handle(IPC_CHANNELS.LIBRARY_SCAN, async (_, customPath?: string) => {
    const targetFolder = customPath || settingsService.get().downloadFolder;
    return libraryService.scanFolder(targetFolder);
  });

  ipcMain.removeHandler(IPC_CHANNELS.LIBRARY_GET_ARTWORK);
  ipcMain.handle(IPC_CHANNELS.LIBRARY_GET_ARTWORK, async (_, filePath: string) => {
    const track = await libraryService.getOrParseTrack(filePath);
    return track?.artworkDataUrl || null;
  });
}

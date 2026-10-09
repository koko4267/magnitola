import { ipcMain, BrowserWindow, dialog, app } from 'electron';
import fs from 'fs';
import { IPC_CHANNELS } from '@shared/ipcChannels';
import { SettingsService } from '../services/settingsService';
import { LibraryService } from '../services/libraryService';
import { AppSettings } from '@shared/types/settings';

export function registerSettingsIpc(
  getMainWindow: () => BrowserWindow | null,
  settingsService: SettingsService,
  libraryService: LibraryService
): void {
  ipcMain.removeHandler(IPC_CHANNELS.SETTINGS_GET);
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return settingsService.get();
  });

  ipcMain.removeHandler(IPC_CHANNELS.SETTINGS_UPDATE);
  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, (_, partial: Partial<AppSettings>) => {
    return settingsService.update(partial);
  });

  ipcMain.removeHandler(IPC_CHANNELS.SETTINGS_SELECT_FOLDER);
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SELECT_FOLDER, async () => {
    const current = settingsService.get();
    const defaultPath = fs.existsSync(current.downloadFolder)
      ? current.downloadFolder
      : app.getPath('downloads');

    const win = getMainWindow();
    const dialogOptions = {
      title: 'Select Download Folder',
      defaultPath,
      properties: ['openDirectory', 'createDirectory'] as Array<'openDirectory' | 'createDirectory'>
    };

    const result = win && !win.isDestroyed()
      ? await dialog.showOpenDialog(win, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      settingsService.update({ downloadFolder: selectedPath });
      const tracks = await libraryService.scanFolder(selectedPath);
      return { path: selectedPath, tracks };
    }

    return null;
  });
}

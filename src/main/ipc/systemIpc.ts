import { ipcMain, shell, clipboard } from 'electron';
import { IPC_CHANNELS } from '@shared/ipcChannels';

export function registerSystemIpc(): void {
  ipcMain.removeHandler(IPC_CHANNELS.SYSTEM_OPEN_EXTERNAL);
  ipcMain.handle(IPC_CHANNELS.SYSTEM_OPEN_EXTERNAL, async (_, url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      await shell.openExternal(url);
    }
  });

  ipcMain.removeHandler(IPC_CHANNELS.SYSTEM_READ_CLIPBOARD);
  ipcMain.handle(IPC_CHANNELS.SYSTEM_READ_CLIPBOARD, () => {
    return clipboard.readText();
  });
}

import { app, BrowserWindow, shell, session } from 'electron';
import path from 'path';
import { registerMediaSchemePrivileges, setupMediaProtocol } from './protocols/mediaProtocol';
import { SettingsService } from './services/settingsService';
import { SoundcloudService } from './services/soundcloudService';
import { DownloadService } from './services/downloadService';
import { LibraryService } from './services/libraryService';
import { registerDownloadIpc } from './ipc/downloadIpc';
import { registerSettingsIpc } from './ipc/settingsIpc';
import { registerLibraryIpc } from './ipc/libraryIpc';
import { registerSystemIpc } from './ipc/systemIpc';

// Prevent Electron from creating persistent HTTP disk cache and GPU shader cache
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

// Register custom media scheme privileges before app is ready
registerMediaSchemePrivileges();

if (process.platform === 'win32') {
  app.setAppUserModelId('com.magnitola.downloader');
}

let mainWindow: BrowserWindow | null = null;

// Instantiate services once at app level
const settingsService = new SettingsService();
const soundcloudService = new SoundcloudService();
const downloadService = new DownloadService(soundcloudService);
const libraryService = new LibraryService();

function createWindow(): void {
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, '../../resources/icon.ico')
    : path.join(__dirname, '../../resources/magnitolalogo.png');

  mainWindow = new BrowserWindow({
    width: 860,
    height: 520,
    minWidth: 800,
    minHeight: 460,
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    title: 'MAGNITOLA',
    icon: iconPath,
    autoHideMenuBar: true,
    backgroundColor: '#4c5844',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false, // needed for preload to bridge node/electron APIs securely
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });

  // External links always open in system default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Prevent in-window navigation while allowing Vite dev servers
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('http://127.0.0.1') && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Load renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  setupMediaProtocol();

  // Register all IPC endpoints once on app startup
  registerDownloadIpc(() => mainWindow, downloadService, settingsService, libraryService);
  registerSettingsIpc(() => mainWindow, settingsService, libraryService);
  registerLibraryIpc(libraryService, settingsService);
  registerSystemIpc();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', async () => {
  downloadService.stop();
  try {
    if (session.defaultSession) {
      await session.defaultSession.clearCache();
      await session.defaultSession.clearStorageData();
    }
  } catch (err) {
    console.warn('Session cleanup on exit failed:', err);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


const { app, BrowserWindow, shell, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');

// Prevent Electron from creating persistent HTTP disk cache and GPU shader cache
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

const MEDIA_SCHEME = 'media';

const ALLOWED_MEDIA_MIMES = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.opus': 'audio/opus',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

// Register custom media scheme privileges before app is ready for audio streaming
protocol.registerSchemesAsPrivileged([
  {
    scheme: MEDIA_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      stream: true,
      supportFetchAPI: true,
      bypassCSP: true
    }
  }
]);

if (process.platform === 'win32') {
  app.setAppUserModelId('com.magnitola.downloader');
}

let mainWindow = null;

function parseMediaPath(requestUrl) {
  try {
    const url = new URL(requestUrl);
    if (url.protocol !== `${MEDIA_SCHEME}:`) return null;

    let rawPath = decodeURIComponent(url.pathname);
    if (rawPath.startsWith('/local/')) {
      rawPath = rawPath.slice(7);
    } else if (rawPath.startsWith('/')) {
      rawPath = rawPath.slice(1);
    }

    if (process.platform === 'win32' && /^\/[a-zA-Z]:/.test(rawPath)) {
      rawPath = rawPath.slice(1);
    }

    if (rawPath.includes('\0')) return null;

    return path.resolve(path.normalize(rawPath));
  } catch {
    return null;
  }
}

async function handleMediaRequest(requestUrl, rangeHeader) {
  try {
    const resolvedPath = parseMediaPath(requestUrl);
    if (!resolvedPath) {
      return new Response('Malformed request URL', { status: 400 });
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeType = ALLOWED_MEDIA_MIMES[ext];

    if (!mimeType) {
      console.warn(`[mediaProtocol] Forbidden media file extension: ${ext}`);
      return new Response('Forbidden file type', { status: 403 });
    }

    if (!fs.existsSync(resolvedPath)) {
      console.warn(`[mediaProtocol] File not found: ${resolvedPath}`);
      return new Response('File not found', { status: 404 });
    }

    const stat = await fs.promises.stat(resolvedPath);
    if (!stat.isFile()) {
      return new Response('Target is not a file', { status: 403 });
    }

    const fileSize = stat.size;

    // RFC 7233 Range request support (HTTP 206 Partial Content)
    // Critical for HTML5 Audio seeking and scrub bar dragging
    if (rangeHeader) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
      if (!match) {
        return new Response('Malformed Range header', { status: 400 });
      }

      let start;
      let end;

      if (match[1] === '' && match[2] !== '') {
        const suffix = parseInt(match[2], 10);
        start = Math.max(0, fileSize - suffix);
        end = fileSize - 1;
      } else if (match[1] !== '' && match[2] === '') {
        start = parseInt(match[1], 10);
        end = fileSize - 1;
      } else if (match[1] !== '' && match[2] !== '') {
        start = parseInt(match[1], 10);
        end = parseInt(match[2], 10);
      } else {
        return new Response('Malformed Range header', { status: 400 });
      }

      if (start >= fileSize || end < start || start < 0) {
        return new Response('Range Not Satisfiable', {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`
          }
        });
      }

      end = Math.min(end, fileSize - 1);
      const chunkSize = end - start + 1;

      const fileStream = fs.createReadStream(resolvedPath, { start, end });
      const webStream = Readable.toWeb(fileStream);

      return new Response(webStream, {
        status: 206,
        statusText: 'Partial Content',
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': mimeType
        }
      });
    } else {
      const fileStream = fs.createReadStream(resolvedPath);
      const webStream = Readable.toWeb(fileStream);

      return new Response(webStream, {
        status: 200,
        headers: {
          'Accept-Ranges': 'bytes',
          'Content-Length': String(fileSize),
          'Content-Type': mimeType
        }
      });
    }
  } catch (err) {
    console.error('[mediaProtocol] Error serving media request:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}

function createWindow() {
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, 'icon.ico')
    : path.join(__dirname, 'magnitolalogo.png');

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
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  });

  // Open external links (such as https://sync-line.pages.dev/) in the default web browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Handle media:// scheme with full HTTP 206 Partial Content (Range) support for precise seeking
  protocol.handle(MEDIA_SCHEME, async (request) => {
    return handleMediaRequest(request.url, request.headers.get('range'));
  });

  // Handle native folder selection dialog
  ipcMain.handle('select-folder', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory']
    });
    if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

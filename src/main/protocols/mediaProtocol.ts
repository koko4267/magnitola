import { protocol } from 'electron';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

export const MEDIA_SCHEME = 'media';

const ALLOWED_MEDIA_MIMES: Record<string, string> = {
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

/**
 * Must be called before app 'ready' event.
 */
export function registerMediaSchemePrivileges(): void {
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
}

/**
 * Parses and validates an absolute filesystem path from a media:// URL.
 * Supports media://local/<encoded-path>, media://<drive>/<path>, and media:///<path>.
 */
export function parseMediaPath(requestUrl: string): string | null {
  try {
    const url = new URL(requestUrl);
    if (url.protocol !== `${MEDIA_SCHEME}:`) {
      return null;
    }

    let rawPath: string;
    try {
      rawPath = decodeURIComponent(url.pathname);
    } catch {
      return null;
    }

    if (rawPath.includes('\0')) {
      return null;
    }

    // Normalize Windows drive letters (e.g. /C:/Users -> C:/Users, media://c/Users -> C:/Users)
    if (process.platform === 'win32') {
      if (/^\/[a-zA-Z]:/i.test(rawPath)) {
        rawPath = rawPath.slice(1);
      } else if (url.hostname && /^[a-zA-Z]$/i.test(url.hostname)) {
        rawPath = `${url.hostname}:${rawPath}`;
      } else if (url.hostname && /^[a-zA-Z]:$/i.test(url.hostname)) {
        rawPath = `${url.hostname}${rawPath}`;
      }
    } else {
      // POSIX: collapse redundant leading slashes
      rawPath = rawPath.replace(/^\/+/, '/');
    }

    return path.resolve(path.normalize(rawPath));
  } catch {
    return null;
  }
}

/**
 * Handles a media request with HTTP Range (206 Partial Content) support.
 */
export async function handleMediaRequest(
  requestUrl: string,
  rangeHeader: string | null
): Promise<Response> {
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

    if (rangeHeader) {
      // RFC 7233 standard range parsing (e.g., "bytes=0-1024", "bytes=1024-", "bytes=-500")
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
      if (!match) {
        return new Response('Malformed Range header', { status: 400 });
      }

      let start: number;
      let end: number;

      if (match[1] === '' && match[2] !== '') {
        // Suffix byte range: bytes=-N (last N bytes)
        const suffix = parseInt(match[2], 10);
        start = Math.max(0, fileSize - suffix);
        end = fileSize - 1;
      } else if (match[1] !== '' && match[2] === '') {
        // Open-ended byte range: bytes=N-
        start = parseInt(match[1], 10);
        end = fileSize - 1;
      } else if (match[1] !== '' && match[2] !== '') {
        // Closed byte range: bytes=N-M
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

      return new Response(webStream as unknown as ReadableStream, {
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

      return new Response(webStream as unknown as ReadableStream, {
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

/**
 * Handles media:// requests with HTTP Range (206 Partial Content) support.
 * This enables accurate seeking, scrub bar dragging, and fast-forwarding in HTML5 Audio.
 * URL format: media://local/<encoded-absolute-path>
 */
export function setupMediaProtocol(): void {
  protocol.handle(MEDIA_SCHEME, async (request) => {
    return handleMediaRequest(request.url, request.headers.get('range'));
  });
}


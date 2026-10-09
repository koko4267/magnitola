import fs from 'fs';
import path from 'path';
import * as mm from 'music-metadata';
import { LibraryTrack } from '@shared/types/player';

export const SUPPORTED_AUDIO_EXTENSIONS = new Set([
  '.mp3',
  '.wav',
  '.ogg',
  '.flac',
  '.m4a',
  '.aac',
  '.opus'
]);

export class LibraryService {
  private trackCache: Map<string, { mtime: number; track: LibraryTrack }> = new Map();

  private normalizeKey(filePath: string): string {
    return path.resolve(filePath).toLowerCase();
  }

  /**
   * Scans a target folder for all supported audio files and returns parsed track metadata.
   * Uses bounded concurrency (10 files at a time) for fast performance on large libraries.
   */
  public async scanFolder(folderPath: string): Promise<LibraryTrack[]> {
    if (!fs.existsSync(folderPath)) {
      return [];
    }

    try {
      const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
      const mediaFiles = entries.filter((e) => {
        if (!e.isFile()) return false;
        const ext = path.extname(e.name).toLowerCase();
        return SUPPORTED_AUDIO_EXTENSIONS.has(ext);
      });

      const tracks: LibraryTrack[] = [];
      const validFiles = new Set<string>();
      const concurrency = 10;

      // Process files with bounded concurrency pool
      for (let i = 0; i < mediaFiles.length; i += concurrency) {
        const batch = mediaFiles.slice(i, i + concurrency);
        const batchResults = await Promise.all(
          batch.map(async (fileEntry) => {
            const fullPath = path.join(folderPath, fileEntry.name);
            validFiles.add(this.normalizeKey(fullPath));
            try {
              return await this.getOrParseTrack(fullPath);
            } catch (err) {
              console.warn(`Failed to parse metadata for file ${fileEntry.name}:`, err);
              return null;
            }
          })
        );

        for (const track of batchResults) {
          if (track) {
            tracks.push(track);
          }
        }
      }

      // Prune deleted tracks from memory cache for this folder
      const folderNormalized = path.resolve(folderPath).toLowerCase();
      for (const cachedKey of this.trackCache.keys()) {
        const cachedDir = path.dirname(cachedKey);
        if (cachedDir === folderNormalized && !validFiles.has(cachedKey)) {
          this.trackCache.delete(cachedKey);
        }
      }

      // Sort alphabetically by title
      tracks.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      return tracks;
    } catch (err) {
      console.error(`Failed to scan folder ${folderPath}:`, err);
      return [];
    }
  }

  /**
   * Parses or retrieves a cached track model for a single file.
   */
  public async getOrParseTrack(filePath: string): Promise<LibraryTrack | null> {
    if (!fs.existsSync(filePath)) {
      this.trackCache.delete(this.normalizeKey(filePath));
      return null;
    }

    const key = this.normalizeKey(filePath);
    const stats = await fs.promises.stat(filePath);
    const cached = this.trackCache.get(key);

    if (cached && cached.mtime === stats.mtimeMs) {
      return cached.track;
    }

    const fileName = path.basename(filePath);
    let title = path.parse(fileName).name;
    let artist = 'Unknown Artist';
    let duration = 0;
    let album: string | undefined = undefined;
    let hasArtwork = false;
    let artworkDataUrl: string | null = null;

    // Check filename pattern: "Artist - Title.<ext>"
    const dashIndex = title.indexOf(' - ');
    if (dashIndex !== -1) {
      artist = title.substring(0, dashIndex).trim();
      title = title.substring(dashIndex + 3).trim();
    }

    try {
      const metadata = await mm.parseFile(filePath, { skipCovers: false });
      if (metadata.common.title && metadata.common.title.trim()) {
        title = metadata.common.title.trim();
      }
      if (metadata.common.artist && metadata.common.artist.trim()) {
        artist = metadata.common.artist.trim();
      }
      if (metadata.common.album && metadata.common.album.trim()) {
        album = metadata.common.album.trim();
      }
      if (metadata.format.duration && Number.isFinite(metadata.format.duration) && metadata.format.duration > 0) {
        duration = Math.round(metadata.format.duration);
      }

      const picture = metadata.common.picture?.[0];
      if (picture && picture.data && picture.data.length > 0) {
        hasArtwork = true;
        const format = picture.format || 'image/jpeg';
        const base64 = Buffer.from(picture.data).toString('base64');
        artworkDataUrl = `data:${format};base64,${base64}`;
      }
    } catch {
      // In case metadata parsing fails, fallback to filename-derived values
    }

    const track: LibraryTrack = {
      id: filePath,
      filePath,
      fileName,
      title,
      artist,
      album,
      duration,
      hasArtwork,
      artworkDataUrl,
      fileSizeBytes: stats.size,
      dateModified: stats.mtimeMs
    };

    this.trackCache.set(key, { mtime: stats.mtimeMs, track });
    return track;
  }

  /**
   * Instantly caches and returns a newly downloaded track without re-reading the file from disk.
   */
  public addTrackDirectly(
    filePath: string,
    title: string,
    artist: string,
    artworkDataUrl: string | null,
    fileSizeBytes: number,
    duration: number = 0
  ): LibraryTrack {
    let mtime = Date.now();
    try {
      if (fs.existsSync(filePath)) {
        mtime = fs.statSync(filePath).mtimeMs;
      }
    } catch {}

    const track: LibraryTrack = {
      id: filePath,
      filePath,
      fileName: path.basename(filePath),
      title,
      artist,
      duration,
      hasArtwork: Boolean(artworkDataUrl),
      artworkDataUrl,
      fileSizeBytes,
      dateModified: mtime
    };

    this.trackCache.set(this.normalizeKey(filePath), { mtime, track });
    return track;
  }

  /**
   * Returns a cached track if available without disk I/O.
   */
  public getCachedTrack(filePath: string): LibraryTrack | null {
    const cached = this.trackCache.get(this.normalizeKey(filePath));
    return cached ? cached.track : null;
  }
}

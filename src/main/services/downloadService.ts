import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { SoundcloudService } from './soundcloudService';
import { Id3Writer } from './id3Writer';
import { sanitizeFileName } from '../utils/sanitize';
import { DownloadProgressPayload, DownloadFinishPayload } from '@shared/types/download';
import { SoundcloudTrack } from '@shared/types/soundcloud';

export interface TrackSavedPayload {
  filePath: string;
  title: string;
  artist: string;
  artworkDataUrl: string | null;
  fileSizeBytes: number;
  duration?: number;
}

export interface DownloadServiceEvents {
  progress: (payload: DownloadProgressPayload) => void;
  trackSaved: (payload: TrackSavedPayload) => void;
  finished: (payload: DownloadFinishPayload) => void;
  error: (errorMessage: string) => void;
}

export class DownloadService extends EventEmitter {
  private scService: SoundcloudService;
  private currentAbortController: AbortController | null = null;
  private isBusy: boolean = false;

  constructor(scService: SoundcloudService) {
    super();
    this.scService = scService;
  }

  public isDownloading(): boolean {
    return this.isBusy;
  }

  public stop(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    this.isBusy = false;
  }

  public async startDownload(
    targetUrl: string,
    downloadFolder: string
  ): Promise<{ success: boolean; trackCount: number; error?: string }> {
    if (this.isBusy) {
      return { success: false, trackCount: 0, error: 'A download is already in progress.' };
    }

    this.isBusy = true;
    this.currentAbortController = new AbortController();
    const signal = this.currentAbortController.signal;

    try {
      if (!fs.existsSync(downloadFolder)) {
        fs.mkdirSync(downloadFolder, { recursive: true });
      }

      const queue = await this.scService.resolveUrl(targetUrl, signal);
      if (queue.length === 0) {
        this.isBusy = false;
        return { success: false, trackCount: 0, error: 'No tracks found for download.' };
      }

      // Execute track downloads sequentially in background
      this.processQueue(queue, downloadFolder, signal);

      return { success: true, trackCount: queue.length };
    } catch (err: unknown) {
      this.isBusy = false;
      const message = err instanceof Error ? err.message : String(err);
      if (!signal.aborted) {
        this.emit('error', message);
      }
      return { success: false, trackCount: 0, error: message };
    }
  }

  private async processQueue(
    queue: SoundcloudTrack[],
    downloadFolder: string,
    signal: AbortSignal
  ): Promise<void> {
    const total = queue.length;
    let completed = 0;

    for (let i = 0; i < total; i++) {
      if (signal.aborted) break;

      const track = queue[i];
      const title = track.title || 'Untitled';
      const artist = track.user?.username || 'Unknown Artist';
      const artwork = track.artwork_url || track.user?.avatar_url || null;

      // Extract duration in seconds if available from SoundCloud transcodings
      let trackDuration = 0;
      if (track.media?.transcodings && track.media.transcodings.length > 0) {
        const d = track.media.transcodings[0].duration;
        if (d && Number.isFinite(d)) {
          trackDuration = Math.round(d / 1000);
        }
      }

      const baseFileName = sanitizeFileName(`${artist} - ${title}`);
      const targetFilePath = path.join(downloadFolder, `${baseFileName}.mp3`);
      const tempPartFilePath = `${targetFilePath}.part`;

      // Check if track is already downloaded to avoid reprocessing or duplicates
      if (fs.existsSync(targetFilePath)) {
        try {
          const stat = await fs.promises.stat(targetFilePath);
          if (stat.size > 1024) {
            completed++;
            this.emit('progress', {
              trackTitle: title,
              trackArtist: artist,
              artworkUrl: artwork,
              trackIndex: i + 1,
              totalTracks: total,
              bytesReceived: stat.size,
              totalBytes: stat.size,
              speedKbps: 0,
              percent: 100,
              alreadyExists: true
            });

            this.emit('trackSaved', {
              filePath: targetFilePath,
              title,
              artist,
              artworkDataUrl: null,
              fileSizeBytes: stat.size,
              duration: trackDuration
            });

            continue;
          }
        } catch {
          // If stat fails, proceed with download
        }
      }

      try {
        const streamInfo = await this.scService.getAudioStreamInfo(track, signal);
        const artworkPromise = this.scService.fetchArtworkBuffer(artwork, signal);

        let audioBuffer: Uint8Array;

        if (streamInfo.protocol === 'hls' || streamInfo.url.includes('.m3u8')) {
          // Download HLS playlist and concatenate segments
          audioBuffer = await this.downloadHlsStream(
            streamInfo.url,
            title,
            artist,
            artwork,
            i + 1,
            total,
            signal
          );
        } else {
          // Standard progressive HTTP stream
          audioBuffer = await this.downloadProgressiveStream(
            streamInfo.url,
            title,
            artist,
            artwork,
            i + 1,
            total,
            signal
          );
        }

        if (signal.aborted) break;

        if (!audioBuffer || audioBuffer.length === 0) {
          throw new Error(`Audio stream was empty for track: ${title}`);
        }

        const artworkBuffer = await artworkPromise;
        const taggedBuffer = Id3Writer.attachTagsToAudio(audioBuffer, title, artist, artworkBuffer);

        // Atomic file write using temporary .part file with fallback for Windows file locks
        await fs.promises.writeFile(tempPartFilePath, taggedBuffer);
        try {
          await fs.promises.rename(tempPartFilePath, targetFilePath);
        } catch {
          await fs.promises.copyFile(tempPartFilePath, targetFilePath);
          await fs.promises.unlink(tempPartFilePath).catch(() => {});
        }
        completed++;

        let artworkDataUrl: string | null = null;
        if (artworkBuffer && artworkBuffer.length > 0) {
          const isPng = artworkBuffer[0] === 0x89 && artworkBuffer[1] === 0x50;
          const mime = isPng ? 'image/png' : 'image/jpeg';
          artworkDataUrl = `data:${mime};base64,${Buffer.from(artworkBuffer).toString('base64')}`;
        }

        this.emit('trackSaved', {
          filePath: targetFilePath,
          title,
          artist,
          artworkDataUrl,
          fileSizeBytes: taggedBuffer.length,
          duration: trackDuration
        });
      } catch (err) {
        // Clean up partial file if left behind
        try {
          if (fs.existsSync(tempPartFilePath)) {
            await fs.promises.unlink(tempPartFilePath);
          }
        } catch {}

        if (!signal.aborted) {
          console.error(`Error downloading track "${title}":`, err);
        }
      }
    }

    this.isBusy = false;
    if (!signal.aborted) {
      this.emit('finished', { completed, total });
    }
  }

  private async downloadProgressiveStream(
    streamUrl: string,
    title: string,
    artist: string,
    artwork: string | null,
    trackIndex: number,
    totalTracks: number,
    signal: AbortSignal
  ): Promise<Uint8Array> {
    const audioResp = await fetch(streamUrl, {
      signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Connection': 'keep-alive'
      }
    });

    if (!audioResp.ok) {
      throw new Error(`Failed to fetch audio stream: HTTP ${audioResp.status}`);
    }

    const contentLength = +(audioResp.headers.get('Content-Length') || 0);
    const reader = audioResp.body?.getReader();
    if (!reader) {
      throw new Error('Response body reader unavailable');
    }

    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;
    let lastBytes = 0;
    const startTime = Date.now();
    let lastProgressTime = Date.now();
    let smoothSpeedKbps = 0;

    while (true) {
      if (signal.aborted) {
        await reader.cancel();
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        chunks.push(value);
        receivedBytes += value.length;
      }

      const now = Date.now();
      const intervalMs = now - lastProgressTime;
      if (intervalMs >= 80) {
        const deltaSec = intervalMs / 1000;
        const deltaBytes = receivedBytes - lastBytes;
        const instantSpeed = deltaSec > 0 ? (deltaBytes / 1024) / deltaSec : 0;
        smoothSpeedKbps = smoothSpeedKbps === 0 ? instantSpeed : 0.65 * smoothSpeedKbps + 0.35 * instantSpeed;

        lastProgressTime = now;
        lastBytes = receivedBytes;

        const percent = contentLength > 0 ? (receivedBytes / contentLength) * 100 : 0;

        const progressData: DownloadProgressPayload = {
          trackTitle: title,
          trackArtist: artist,
          artworkUrl: artwork,
          trackIndex,
          totalTracks,
          bytesReceived: receivedBytes,
          totalBytes: contentLength,
          speedKbps: Math.round(smoothSpeedKbps),
          percent: Math.min(100, Math.round(percent * 10) / 10)
        };
        this.emit('progress', progressData);
      }
    }

    if (signal.aborted) return new Uint8Array(0);

    // Final 100% progress event
    const finalElapsed = (Date.now() - startTime) / 1000;
    const finalSpeed = finalElapsed > 0 ? (receivedBytes / 1024) / finalElapsed : 0;
    this.emit('progress', {
      trackTitle: title,
      trackArtist: artist,
      artworkUrl: artwork,
      trackIndex,
      totalTracks,
      bytesReceived: receivedBytes,
      totalBytes: contentLength > 0 ? contentLength : receivedBytes,
      speedKbps: Math.round(finalSpeed),
      percent: 100
    });

    const combined = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    return combined;
  }

  private async downloadHlsStream(
    playlistUrl: string,
    title: string,
    artist: string,
    artwork: string | null,
    trackIndex: number,
    totalTracks: number,
    signal: AbortSignal
  ): Promise<Uint8Array> {
    let currentPlaylistUrl = playlistUrl;
    let plResp = await fetch(currentPlaylistUrl, { signal });
    if (!plResp.ok) {
      throw new Error(`Failed to fetch HLS playlist: HTTP ${plResp.status}`);
    }

    let playlistText = await plResp.text();

    // Check if master playlist (contains variant stream declarations)
    if (playlistText.includes('#EXT-X-STREAM-INF')) {
      const plLines = playlistText.split('\n');
      let variantUrl: string | null = null;
      for (let pIdx = 0; pIdx < plLines.length; pIdx++) {
        if (plLines[pIdx].trim().startsWith('#EXT-X-STREAM-INF')) {
          for (let next = pIdx + 1; next < plLines.length; next++) {
            const trimmedNext = plLines[next].trim();
            if (trimmedNext && !trimmedNext.startsWith('#')) {
              variantUrl = new URL(trimmedNext, currentPlaylistUrl).href;
              break;
            }
          }
          if (variantUrl) break;
        }
      }

      if (variantUrl) {
        currentPlaylistUrl = variantUrl;
        plResp = await fetch(currentPlaylistUrl, { signal });
        if (!plResp.ok) {
          throw new Error(`Failed to fetch HLS variant playlist: HTTP ${plResp.status}`);
        }
        playlistText = await plResp.text();
      }
    }

    const lines = playlistText.split('\n');
    const segmentUrls: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        segmentUrls.push(new URL(trimmed, currentPlaylistUrl).href);
      }
    }

    if (segmentUrls.length === 0) {
      throw new Error('No media segments found in HLS playlist');
    }

    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;
    const startTime = Date.now();
    let lastProgressTime = 0;
    const totalSegments = segmentUrls.length;

    for (let sIdx = 0; sIdx < totalSegments; sIdx++) {
      if (signal.aborted) break;

      let segResp: Response | null = null;
      let retries = 2;
      while (retries >= 0 && !signal.aborted) {
        try {
          segResp = await fetch(segmentUrls[sIdx], { signal });
          if (segResp.ok) break;
        } catch {
          if (signal.aborted) break;
        }
        retries--;
        if (retries >= 0) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      if (!segResp || !segResp.ok) {
        throw new Error(`Failed to download audio segment ${sIdx + 1}/${totalSegments} for track: ${title}`);
      }

      const segBuf = new Uint8Array(await segResp.arrayBuffer());
      chunks.push(segBuf);
      receivedBytes += segBuf.length;

      const now = Date.now();
      if (now - lastProgressTime >= 40 || sIdx === totalSegments - 1) {
        lastProgressTime = now;
        const elapsedSec = (now - startTime) / 1000;
        const speedKbps = elapsedSec > 0 ? (receivedBytes / 1024) / elapsedSec : 0;
        const percent = ((sIdx + 1) / totalSegments) * 100;
        const estimatedTotalBytes = Math.round((receivedBytes / (sIdx + 1)) * totalSegments);

        this.emit('progress', {
          trackTitle: title,
          trackArtist: artist,
          artworkUrl: artwork,
          trackIndex,
          totalTracks,
          bytesReceived: receivedBytes,
          totalBytes: estimatedTotalBytes,
          speedKbps: Math.round(speedKbps),
          percent: Math.min(100, Math.round(percent * 10) / 10)
        });
      }
    }

    const combined = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    return combined;
  }
}


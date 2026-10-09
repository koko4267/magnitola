import {
  SoundcloudTrack,
  SoundcloudTranscoding,
  SoundcloudPlaylist,
  SoundcloudUserProfile,
  SoundcloudLikesResponse
} from '@shared/types/soundcloud';

export interface StreamInfo {
  url: string;
  protocol: 'progressive' | 'hls';
  mimeType: string;
}

export class SoundcloudService {
  private clientId: string = 'so5r9Dsxv6jJRgHa5fGXfevkxr4VgNJf';

  public getClientId(): string {
    return this.clientId;
  }

  public setClientId(id: string): void {
    this.clientId = id;
  }

  /**
   * Resolves a SoundCloud URL (track, playlist, user) into a queue of tracks.
   */
  public async resolveUrl(
    targetUrl: string,
    abortSignal?: AbortSignal
  ): Promise<SoundcloudTrack[]> {
    if (!targetUrl || typeof targetUrl !== 'string' || !targetUrl.trim()) {
      throw new Error('Please enter a valid SoundCloud URL.');
    }

    let cleanUrl = targetUrl.trim();

    // Auto-prepend https:// if protocol is missing, or reject if clearly not a URL
    if (!/^https?:\/\//i.test(cleanUrl)) {
      if (!cleanUrl.includes('.')) {
        throw new Error('Invalid URL format. Please provide a full URL (e.g. https://soundcloud.com/...)');
      }
      cleanUrl = `https://${cleanUrl}`;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(cleanUrl);
    } catch {
      throw new Error('Invalid URL format. Please provide a full URL (e.g. https://soundcloud.com/...)');
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const isSoundCloudDomain =
      hostname === 'soundcloud.com' ||
      hostname.endsWith('.soundcloud.com') ||
      hostname === 'on.soundcloud.com';

    if (!isSoundCloudDomain) {
      throw new Error('Unsupported link. Please provide a soundcloud.com link.');
    }

    // Expand on.soundcloud.com mobile short links
    if (hostname === 'on.soundcloud.com') {
      try {
        const redirectResp = await fetch(cleanUrl, {
          method: 'GET',
          redirect: 'follow',
          signal: abortSignal
        });
        if (redirectResp.url && redirectResp.url !== cleanUrl) {
          cleanUrl = redirectResp.url;
        }
      } catch (err) {
        if (abortSignal?.aborted) throw err;
        console.warn('Failed to expand on.soundcloud.com redirect:', err);
      }
    }

    // Detect if likes was explicitly targeted before stripping
    const isLikesUrl = /\/likes\/?(\?.*)?$/i.test(cleanUrl);
    cleanUrl = cleanUrl.replace(/\/likes\/?(\?.*)?$/i, '');
    cleanUrl = cleanUrl.replace(/\/+$/, '');

    const resolveApi = `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(cleanUrl)}&client_id=${this.clientId}`;
    const resp = await fetch(resolveApi, { signal: abortSignal });

    if (!resp.ok) {
      if (resp.status === 404) {
        throw new Error('SoundCloud item not found. Please verify the URL.');
      }
      throw new Error(`SoundCloud resolve failed: HTTP ${resp.status}`);
    }

    const data = (await resp.json()) as { kind: string; id: number; tracks?: any[]; [key: string]: any };
    const kind = data.kind;
    const trackQueue: SoundcloudTrack[] = [];

    if (kind === 'track') {
      trackQueue.push(data as unknown as SoundcloudTrack);
    } else if (kind === 'playlist' || kind === 'system-playlist') {
      const playlist = data as unknown as SoundcloudPlaylist;
      const tracksElement = playlist.tracks || [];
      const trackIdsToFetch: number[] = [];

      for (const item of tracksElement) {
        if (!('media' in item && item.media?.transcodings) && item.id) {
          trackIdsToFetch.push(item.id);
        }
      }

      const fetchedTracksMap = new Map<number, SoundcloudTrack>();
      if (trackIdsToFetch.length > 0) {
        for (let i = 0; i < trackIdsToFetch.length; i += 50) {
          if (abortSignal?.aborted) break;
          const batch = trackIdsToFetch.slice(i, i + 50);
          const batchUrl = `https://api-v2.soundcloud.com/tracks?ids=${batch.join('%2C')}&client_id=${this.clientId}`;
          try {
            const bResp = await fetch(batchUrl, { signal: abortSignal });
            if (bResp.ok) {
              const bTracks = (await bResp.json()) as SoundcloudTrack[];
              for (const tr of bTracks) {
                if (tr && tr.id) {
                  fetchedTracksMap.set(tr.id, tr);
                }
              }
            }
          } catch (batchErr) {
            if (abortSignal?.aborted) throw batchErr;
            console.warn('Failed to fetch a batch of tracks for playlist:', batchErr);
          }
        }
      }

      // Reconstruct trackQueue preserving exact playlist order
      for (const item of tracksElement) {
        if ('media' in item && item.media?.transcodings) {
          trackQueue.push(item as SoundcloudTrack);
        } else if (item.id && fetchedTracksMap.has(item.id)) {
          trackQueue.push(fetchedTracksMap.get(item.id)!);
        }
      }
    } else if (kind === 'user') {
      const user = data as unknown as SoundcloudUserProfile;
      let targetApiUrl: string | null = isLikesUrl
        ? `https://api-v2.soundcloud.com/users/${user.id}/likes?client_id=${this.clientId}&limit=50`
        : `https://api-v2.soundcloud.com/users/${user.id}/tracks?client_id=${this.clientId}&limit=50`;

      let fetchedCount = 0;
      const maxTracksToFetch = 500;

      while (targetApiUrl && !abortSignal?.aborted && fetchedCount < maxTracksToFetch) {
        const urlToFetch: string = targetApiUrl;
        const lResp = await fetch(urlToFetch, { signal: abortSignal });
        if (!lResp.ok) break;
        const lData = (await lResp.json()) as { collection?: any[]; next_href?: string | null };

        for (const item of lData.collection || []) {
          const trackItem = item.track || item;
          if (trackItem?.media?.transcodings) {
            trackQueue.push(trackItem as SoundcloudTrack);
            fetchedCount++;
            if (fetchedCount >= maxTracksToFetch) break;
          }
        }

        // Fallback to likes if user has zero uploaded tracks and wasn't explicitly requesting likes
        if (trackQueue.length === 0 && !isLikesUrl && targetApiUrl.includes('/tracks')) {
          targetApiUrl = `https://api-v2.soundcloud.com/users/${user.id}/likes?client_id=${this.clientId}&limit=50`;
          continue;
        }

        if (lData.next_href && fetchedCount < maxTracksToFetch) {
          targetApiUrl = lData.next_href;
          if (!targetApiUrl.includes('client_id=')) {
            targetApiUrl += `&client_id=${this.clientId}`;
          }
        } else {
          targetApiUrl = null;
        }
      }
    } else {
      throw new Error(`Unsupported SoundCloud link type: ${kind}`);
    }

    return trackQueue;
  }

  /**
   * Retrieves detailed stream info (URL, protocol, and MIME type) for a track.
   * Prioritizes MP3 (audio/mpeg) streams so downloaded tracks are genuine MP3 files.
   */
  public async getAudioStreamInfo(
    track: SoundcloudTrack,
    abortSignal?: AbortSignal
  ): Promise<StreamInfo> {
    const transcodings: SoundcloudTranscoding[] = track.media?.transcodings || [];

    // Prioritize MP3 (audio/mpeg) streams so downloaded files are authentic MP3s:
    // 1. progressive audio/mpeg
    // 2. hls audio/mpeg
    // 3. progressive (other)
    // 4. hls (other)
    const sortedTranscodings = [...transcodings].sort((a, b) => {
      const getScore = (t: SoundcloudTranscoding): number => {
        let score = 0;
        const mime = t.format?.mime_type || '';
        const proto = t.format?.protocol || '';
        if (proto === 'progressive') score += 100;
        if (proto === 'hls') score += 50;
        if (mime === 'audio/mpeg') score += 200;
        else if (mime.includes('mpeg') && !mime.includes('mpegurl')) score += 150;
        return score;
      };
      return getScore(b) - getScore(a);
    });

    if (sortedTranscodings.length === 0) {
      throw new Error(`No compatible audio transcoding found for track: ${track.title}`);
    }

    let lastError: Error | null = null;
    for (const selectedTranscoding of sortedTranscodings) {
      const separator = selectedTranscoding.url.includes('?') ? '&' : '?';
      let streamInfoUrl = `${selectedTranscoding.url}${separator}client_id=${this.clientId}`;
      if (track.track_authorization) {
        streamInfoUrl += `&track_authorization=${encodeURIComponent(track.track_authorization)}`;
      }

      try {
        const streamInfoResp = await fetch(streamInfoUrl, {
          signal: abortSignal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'application/json',
            Connection: 'keep-alive'
          }
        });

        if (streamInfoResp.ok) {
          const streamInfoJson = (await streamInfoResp.json()) as { url?: string };
          if (streamInfoJson?.url) {
            return {
              url: streamInfoJson.url,
              protocol: selectedTranscoding.format?.protocol || 'progressive',
              mimeType: selectedTranscoding.format?.mime_type || 'audio/mpeg'
            };
          }
        } else {
          lastError = new Error(`Failed to retrieve stream info: HTTP ${streamInfoResp.status}`);
        }
      } catch (err) {
        if (abortSignal?.aborted) throw err;
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw lastError || new Error(`No playable stream could be resolved for track: ${track.title}`);
  }

  /**
   * Fetches the direct CDN audio stream URL for a given track.
   */
  public async getAudioStreamUrl(
    track: SoundcloudTrack,
    abortSignal?: AbortSignal
  ): Promise<string> {
    const info = await this.getAudioStreamInfo(track, abortSignal);
    return info.url;
  }

  /**
   * Downloads high-resolution artwork (500x500) if available with fallback to original URL.
   * Includes a 2.5-second timeout and listener cleanup.
   */
  public async fetchArtworkBuffer(
    artworkUrl: string | null,
    abortSignal?: AbortSignal
  ): Promise<Uint8Array | null> {
    if (!artworkUrl) return null;

    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), 2500);
    let cleanupListeners: (() => void) | null = null;

    try {
      const hiResUrl = artworkUrl.replace('-large', '-t500x500');

      let combinedSignal: AbortSignal;
      if (abortSignal) {
        if ('any' in AbortSignal && typeof AbortSignal.any === 'function') {
          combinedSignal = AbortSignal.any([abortSignal, timeoutController.signal]);
        } else {
          const fallbackController = new AbortController();
          const onAbort = () => fallbackController.abort();
          abortSignal.addEventListener('abort', onAbort, { once: true });
          timeoutController.signal.addEventListener('abort', onAbort, { once: true });
          cleanupListeners = () => {
            abortSignal.removeEventListener('abort', onAbort);
            timeoutController.signal.removeEventListener('abort', onAbort);
          };
          combinedSignal = fallbackController.signal;
        }
      } else {
        combinedSignal = timeoutController.signal;
      }

      let resp = await fetch(hiResUrl, {
        signal: combinedSignal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Connection': 'keep-alive'
        }
      });

      // If high-res variant is missing (404), fallback to original artworkUrl
      if (!resp.ok && hiResUrl !== artworkUrl && !combinedSignal.aborted) {
        resp = await fetch(artworkUrl, {
          signal: combinedSignal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Connection': 'keep-alive'
          }
        });
      }

      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer();
        return new Uint8Array(arrayBuf);
      }
    } catch {
      // Ignore artwork failures gracefully
    } finally {
      clearTimeout(timer);
      if (cleanupListeners) cleanupListeners();
    }
    return null;
  }
}


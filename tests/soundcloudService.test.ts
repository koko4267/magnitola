import { describe, it, expect } from 'vitest';
import { SoundcloudService } from '../src/main/services/soundcloudService';

describe('SoundcloudService URL Parsing & Validation', () => {
  const service = new SoundcloudService();

  it('should reject empty or whitespace URLs with descriptive error', async () => {
    await expect(service.resolveUrl('')).rejects.toThrow('Please enter a valid SoundCloud URL.');
    await expect(service.resolveUrl('   ')).rejects.toThrow('Please enter a valid SoundCloud URL.');
  });

  it('should reject non-URL formatted strings', async () => {
    await expect(service.resolveUrl('not-a-url')).rejects.toThrow('Invalid URL format');
  });

  it('should reject non-SoundCloud domain URLs', async () => {
    await expect(service.resolveUrl('https://example.com/audio.mp3')).rejects.toThrow(
      'Unsupported link. Please provide a soundcloud.com link.'
    );
  });

  it('should accept valid soundcloud.com URLs and call resolve API', async () => {
    const originalFetch = globalThis.fetch;
    let requestedUrl = '';
    globalThis.fetch = (async (url: string | URL | Request) => {
      requestedUrl = typeof url === 'string' ? url : url.toString();
      return {
        ok: true,
        json: async () => ({
          kind: 'track',
          id: 999,
          title: 'Resolved Track',
          media: { transcodings: [] }
        })
      } as Response;
    }) as typeof fetch;

    try {
      const result = await service.resolveUrl('https://soundcloud.com/creepypastak1ng/sets/militantum');
      expect(requestedUrl).toContain('api-v2.soundcloud.com/resolve');
      expect(requestedUrl).toContain(encodeURIComponent('https://soundcloud.com/creepypastak1ng/sets/militantum'));
      expect(result.length).toBe(1);

      // Also test URL without https://
      await service.resolveUrl('soundcloud.com/artist/single-track');
      expect(requestedUrl).toContain(encodeURIComponent('https://soundcloud.com/artist/single-track'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should allow getting and setting clientId', () => {
    const original = service.getClientId();
    expect(original).toBeTruthy();
    service.setClientId('test-client-id-123');
    expect(service.getClientId()).toBe('test-client-id-123');
    service.setClientId(original);
  });

  it('should return null when artworkUrl is null', async () => {
    const result = await service.fetchArtworkBuffer(null);
    expect(result).toBeNull();
  });

  it('should prioritize audio/mpeg progressive and HLS streams over opus streams', async () => {
    const mockTrack = {
      id: 123,
      title: 'Priority Test',
      artwork_url: null,
      media: {
        transcodings: [
          {
            url: 'https://api.soundcloud.com/stream/hls-opus',
            preset: 'opus',
            duration: 120000,
            snipped: false,
            format: { protocol: 'hls' as const, mime_type: 'audio/ogg; codecs="opus"' },
            quality: 'sq'
          },
          {
            url: 'https://api.soundcloud.com/stream/prog-mp3',
            preset: 'mp3',
            duration: 120000,
            snipped: false,
            format: { protocol: 'progressive' as const, mime_type: 'audio/mpeg' },
            quality: 'sq'
          }
        ]
      }
    };

    // Mock fetch for the stream info endpoint
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      expect(urlStr).toContain('stream/prog-mp3');
      expect(urlStr).toContain('client_id=');
      // Ensure no double question marks in URL
      const qIndex = urlStr.indexOf('?');
      expect(urlStr.indexOf('?', qIndex + 1)).toBe(-1);
      return {
        ok: true,
        json: async () => ({ url: 'https://cdn.soundcloud.com/audio.mp3' })
      } as Response;
    }) as typeof fetch;

    try {
      const info = await service.getAudioStreamInfo(mockTrack as any);
      expect(info.url).toBe('https://cdn.soundcloud.com/audio.mp3');
      expect(info.protocol).toBe('progressive');
      expect(info.mimeType).toBe('audio/mpeg');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should fall back to alternative transcoding if the primary candidate returns an error', async () => {
    const mockTrack = {
      id: 456,
      title: 'Fallback Test',
      artwork_url: null,
      media: {
        transcodings: [
          {
            url: 'https://api.soundcloud.com/stream/prog-broken',
            preset: 'mp3',
            duration: 100000,
            snipped: false,
            format: { protocol: 'progressive' as const, mime_type: 'audio/mpeg' },
            quality: 'sq'
          },
          {
            url: 'https://api.soundcloud.com/stream/hls-working',
            preset: 'mp3',
            duration: 100000,
            snipped: false,
            format: { protocol: 'hls' as const, mime_type: 'audio/mpeg' },
            quality: 'sq'
          }
        ]
      }
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('prog-broken')) {
        return { ok: false, status: 404 } as Response;
      }
      return {
        ok: true,
        json: async () => ({ url: 'https://cdn.soundcloud.com/hls-stream.m3u8' })
      } as Response;
    }) as typeof fetch;

    try {
      const info = await service.getAudioStreamInfo(mockTrack as any);
      expect(info.url).toBe('https://cdn.soundcloud.com/hls-stream.m3u8');
      expect(info.protocol).toBe('hls');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

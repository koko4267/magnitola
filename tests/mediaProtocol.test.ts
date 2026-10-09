import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { parseMediaPath, handleMediaRequest } from '../src/main/protocols/mediaProtocol';

describe('mediaProtocol', () => {
  let tempDir: string;
  let testMp3Path: string;
  const testPayload = Buffer.from('TEST_AUDIO_BYTES_FOR_MAGNITOLA_MEDIA_PROTOCOL_TEST');

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magnitola-media-test-'));
    testMp3Path = path.join(tempDir, 'sample_audio.mp3');
    fs.writeFileSync(testMp3Path, testPayload);
  });

  afterAll(() => {
    try {
      if (fs.existsSync(testMp3Path)) fs.unlinkSync(testMp3Path);
      if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
    } catch {}
  });

  describe('parseMediaPath', () => {
    it('should parse and resolve encoded media URL', () => {
      const encoded = encodeURIComponent(testMp3Path);
      const url = `media://local/${encoded}`;
      const resolved = parseMediaPath(url);
      expect(resolved).toBeTruthy();
      expect(path.resolve(resolved!)).toBe(path.resolve(testMp3Path));
    });

    it('should reject URLs with non-media schemes', () => {
      expect(parseMediaPath('https://example.com/audio.mp3')).toBeNull();
      expect(parseMediaPath('file:///C:/audio.mp3')).toBeNull();
    });

    it('should reject URLs containing null bytes', () => {
      expect(parseMediaPath('media://local/C%3A%5CUsers%00%5Cmusic.mp3')).toBeNull();
    });

    it('should normalize Windows drive letters', () => {
      if (process.platform === 'win32') {
        const p1 = parseMediaPath('media://c/Users/music.mp3');
        expect(p1).toMatch(/^[a-zA-Z]:\\/);

        const p2 = parseMediaPath('media:///C:/Users/music.mp3');
        expect(p2).toMatch(/^[a-zA-Z]:\\/);
      }
    });
  });

  describe('handleMediaRequest', () => {
    it('should reject non-media file types with 403 Forbidden', async () => {
      const dummyExe = path.join(tempDir, 'danger.exe');
      fs.writeFileSync(dummyExe, 'binary');
      try {
        const url = `media://local/${encodeURIComponent(dummyExe)}`;
        const resp = await handleMediaRequest(url, null);
        expect(resp.status).toBe(403);
      } finally {
        fs.unlinkSync(dummyExe);
      }
    });

    it('should return 404 for non-existent media files', async () => {
      const nonExistent = path.join(tempDir, 'does_not_exist_404.mp3');
      const url = `media://local/${encodeURIComponent(nonExistent)}`;
      const resp = await handleMediaRequest(url, null);
      expect(resp.status).toBe(404);
    });

    it('should return 200 OK with full content when Range header is not present', async () => {
      const url = `media://local/${encodeURIComponent(testMp3Path)}`;
      const resp = await handleMediaRequest(url, null);
      expect(resp.status).toBe(200);
      expect(resp.headers.get('Content-Type')).toBe('audio/mpeg');
      expect(resp.headers.get('Content-Length')).toBe(String(testPayload.length));
      expect(resp.headers.get('Accept-Ranges')).toBe('bytes');
    });

    it('should return 206 Partial Content for closed byte range (RFC 7233)', async () => {
      const url = `media://local/${encodeURIComponent(testMp3Path)}`;
      const resp = await handleMediaRequest(url, 'bytes=0-9');
      expect(resp.status).toBe(206);
      expect(resp.headers.get('Content-Range')).toBe(`bytes 0-9/${testPayload.length}`);
      expect(resp.headers.get('Content-Length')).toBe('10');
      expect(resp.headers.get('Content-Type')).toBe('audio/mpeg');

      const arrayBuf = await resp.arrayBuffer();
      expect(Buffer.from(arrayBuf).toString()).toBe(testPayload.subarray(0, 10).toString());
    });

    it('should return 206 Partial Content for open-ended byte range', async () => {
      const url = `media://local/${encodeURIComponent(testMp3Path)}`;
      const resp = await handleMediaRequest(url, 'bytes=10-');
      expect(resp.status).toBe(206);
      expect(resp.headers.get('Content-Range')).toBe(`bytes 10-${testPayload.length - 1}/${testPayload.length}`);
      expect(resp.headers.get('Content-Length')).toBe(String(testPayload.length - 10));
    });

    it('should return 206 Partial Content for suffix byte range (last N bytes)', async () => {
      const url = `media://local/${encodeURIComponent(testMp3Path)}`;
      const resp = await handleMediaRequest(url, 'bytes=-10');
      expect(resp.status).toBe(206);
      expect(resp.headers.get('Content-Length')).toBe('10');
      expect(resp.headers.get('Content-Range')).toBe(
        `bytes ${testPayload.length - 10}-${testPayload.length - 1}/${testPayload.length}`
      );
    });

    it('should return 416 Range Not Satisfiable for out-of-bounds start', async () => {
      const url = `media://local/${encodeURIComponent(testMp3Path)}`;
      const resp = await handleMediaRequest(url, 'bytes=99999-');
      expect(resp.status).toBe(416);
      expect(resp.headers.get('Content-Range')).toBe(`bytes */${testPayload.length}`);
    });

    it('should return 400 for malformed Range headers', async () => {
      const url = `media://local/${encodeURIComponent(testMp3Path)}`;
      const resp = await handleMediaRequest(url, 'bytes=invalid-range');
      expect(resp.status).toBe(400);
    });
  });
});

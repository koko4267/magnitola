import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { LibraryService, SUPPORTED_AUDIO_EXTENSIONS } from '../src/main/services/libraryService';

describe('LibraryService', () => {
  let tempDir: string;
  let service: LibraryService;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magnitola-lib-test-'));
    service = new LibraryService();

    // Create mock audio and non-audio files
    fs.writeFileSync(path.join(tempDir, 'Artist A - Alpha.mp3'), 'mock-mp3-content');
    fs.writeFileSync(path.join(tempDir, 'Artist B - Beta.ogg'), 'mock-ogg-content');
    fs.writeFileSync(path.join(tempDir, 'Artist C - Gamma.flac'), 'mock-flac-content');
    fs.writeFileSync(path.join(tempDir, 'ignored.txt'), 'text-content');
    fs.writeFileSync(path.join(tempDir, 'ignored.exe'), 'exe-content');
  });

  afterAll(() => {
    try {
      const files = fs.readdirSync(tempDir);
      for (const f of files) fs.unlinkSync(path.join(tempDir, f));
      fs.rmdirSync(tempDir);
    } catch {}
  });

  it('should define all supported audio extensions', () => {
    expect(SUPPORTED_AUDIO_EXTENSIONS.has('.mp3')).toBe(true);
    expect(SUPPORTED_AUDIO_EXTENSIONS.has('.ogg')).toBe(true);
    expect(SUPPORTED_AUDIO_EXTENSIONS.has('.flac')).toBe(true);
    expect(SUPPORTED_AUDIO_EXTENSIONS.has('.wav')).toBe(true);
    expect(SUPPORTED_AUDIO_EXTENSIONS.has('.m4a')).toBe(true);
    expect(SUPPORTED_AUDIO_EXTENSIONS.has('.aac')).toBe(true);
    expect(SUPPORTED_AUDIO_EXTENSIONS.has('.opus')).toBe(true);
    expect(SUPPORTED_AUDIO_EXTENSIONS.has('.txt')).toBe(false);
  });

  it('should scan folder and discover all supported audio formats while ignoring non-audio files', async () => {
    const tracks = await service.scanFolder(tempDir);
    expect(tracks.length).toBe(3);

    const fileNames = tracks.map((t) => t.fileName).sort();
    expect(fileNames).toEqual([
      'Artist A - Alpha.mp3',
      'Artist B - Beta.ogg',
      'Artist C - Gamma.flac'
    ]);
  });

  it('should parse artist and title from filename pattern "Artist - Title.ext"', async () => {
    const filePath = path.join(tempDir, 'Artist A - Alpha.mp3');
    const track = await service.getOrParseTrack(filePath);
    expect(track).not.toBeNull();
    expect(track?.artist).toBe('Artist A');
    expect(track?.title).toBe('Alpha');
  });

  it('should cache tracks and support case-insensitive getCachedTrack retrieval', () => {
    const dummyPath = path.join(tempDir, 'Direct Track.mp3');
    const added = service.addTrackDirectly(
      dummyPath,
      'Direct Title',
      'Direct Artist',
      'data:image/jpeg;base64,123',
      5000,
      180
    );

    expect(added.title).toBe('Direct Title');
    expect(added.artist).toBe('Direct Artist');
    expect(added.duration).toBe(180);
    expect(added.hasArtwork).toBe(true);

    // Retrieve via exact path
    const cached = service.getCachedTrack(dummyPath);
    expect(cached).not.toBeNull();
    expect(cached?.title).toBe('Direct Title');

    // Retrieve via uppercase / different-cased path
    const cachedUpper = service.getCachedTrack(dummyPath.toUpperCase());
    expect(cachedUpper).not.toBeNull();
    expect(cachedUpper?.title).toBe('Direct Title');
  });

  it('should return empty list for non-existent folders gracefully', async () => {
    const nonExistent = path.join(tempDir, 'does-not-exist-dir');
    const tracks = await service.scanFolder(nonExistent);
    expect(tracks).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import { Id3Writer } from '../src/main/services/id3Writer';

describe('Id3Writer', () => {
  it('should generate valid ID3v2.3 header and text frames', () => {
    const title = 'Retro Synthwave';
    const artist = 'Magnitola Artist';
    const tag = Id3Writer.createTagBuffer(title, artist, null);

    // Header checks
    expect(tag.length).toBeGreaterThan(10);
    expect(String.fromCharCode(tag[0], tag[1], tag[2])).toBe('ID3');
    expect(tag[3]).toBe(3); // Version 2.3
    expect(tag[4]).toBe(0); // Revision 0

    // Ensure TIT2 and TPE1 frames exist in buffer
    const tagString = Buffer.from(tag).toString('binary');
    expect(tagString).toContain('TIT2');
    expect(tagString).toContain('TPE1');
  });

  it('should embed APIC frame when artwork is provided', () => {
    const title = 'Artwork Test';
    const artist = 'Artist';
    // Dummy JPEG image bytes (FF D8 FF)
    const dummyJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const tag = Id3Writer.createTagBuffer(title, artist, dummyJpeg);

    const tagString = Buffer.from(tag).toString('binary');
    expect(tagString).toContain('APIC');
    expect(tagString).toContain('image/jpeg');
  });

  it('should attach ID3v2.3 tags to audio bytes correctly', () => {
    const dummyAudio = new Uint8Array([0x49, 0x54, 0x53, 0x20, 0x41, 0x55, 0x44, 0x49, 0x4f]);
    const tagged = Id3Writer.attachTagsToAudio(dummyAudio, 'Track', 'Singer', null);

    expect(tagged.length).toBeGreaterThan(dummyAudio.length);
    expect(tagged.subarray(0, 3).toString()).toBe('ID3');

    // Tail of buffer must be the original audio
    const audioTail = tagged.subarray(tagged.length - dummyAudio.length);
    expect(Array.from(audioTail)).toEqual(Array.from(dummyAudio));
  });

  it('should detect PNG image magic bytes for APIC frame', () => {
    const dummyPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const tag = Id3Writer.createTagBuffer('PNG Track', 'PNG Artist', dummyPng);
    const tagString = Buffer.from(tag).toString('binary');
    expect(tagString).toContain('APIC');
    expect(tagString).toContain('image/png');
  });

  it('should detect WebP image magic bytes for APIC frame', () => {
    // RIFF....WEBP
    const dummyWebP = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20
    ]);
    const tag = Id3Writer.createTagBuffer('WebP Track', 'WebP Artist', dummyWebP);
    const tagString = Buffer.from(tag).toString('binary');
    expect(tagString).toContain('APIC');
    expect(tagString).toContain('image/webp');
  });

  it('should strip existing ID3v2 tag from audio buffer before re-tagging', () => {
    const rawAudio = new Uint8Array([1, 2, 3, 4, 5]);
    // Create an initial tagged buffer
    const taggedOnce = Id3Writer.attachTagsToAudio(rawAudio, 'Old Title', 'Old Artist', null);

    // Verify stripExistingId3Tags recovers the original audio payload
    const stripped = Id3Writer.stripExistingId3Tags(taggedOnce);
    expect(Array.from(stripped)).toEqual(Array.from(rawAudio));

    // Re-tagging should not duplicate headers
    const reTagged = Id3Writer.attachTagsToAudio(taggedOnce, 'New Title', 'New Artist', null);
    const str = Buffer.from(reTagged).toString('binary');
    // Count occurrences of 'ID3' - should only appear once
    const id3Occurrences = (str.match(/ID3/g) || []).length;
    expect(id3Occurrences).toBe(1);
    const titleUtf16 = Buffer.from('New Title', 'utf16le').toString('binary');
    expect(str).toContain(titleUtf16);
  });

  it('should strip multiple nested ID3v2 tags and ID3v1 trailer', () => {
    const rawAudio = new Uint8Array([10, 20, 30, 40]);
    const tagged1 = Id3Writer.attachTagsToAudio(rawAudio, 'Tag 1', 'Artist 1', null);
    // Artificially prepend a second ID3 tag
    const tagged2 = Id3Writer.attachTagsToAudio(tagged1, 'Tag 2', 'Artist 2', null);

    // Append a mock 128-byte ID3v1 trailer starting with 'TAG'
    const id3v1Trailer = new Uint8Array(128);
    id3v1Trailer[0] = 0x54; // 'T'
    id3v1Trailer[1] = 0x41; // 'A'
    id3v1Trailer[2] = 0x47; // 'G'

    const doubleTaggedWithTrailer = Buffer.concat([tagged2, Buffer.from(id3v1Trailer)]);
    const cleaned = Id3Writer.stripExistingId3Tags(doubleTaggedWithTrailer);

    expect(Array.from(cleaned)).toEqual(Array.from(rawAudio));
  });
});

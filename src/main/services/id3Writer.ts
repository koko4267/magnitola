/**
 * Pure TypeScript ID3v2.3 tag generator with zero native C++ dependencies.
 * Creates valid ID3v2.3 headers and frames (TIT2, TPE1, APIC) for MP3 files.
 */
export class Id3Writer {
  private static makeTextFrame(frameId: string, text: string): Uint8Array | null {
    if (!text) return null;
    // UTF-16 with Little-Endian BOM (0xFF, 0xFE)
    const bytes: number[] = [0x01, 0xff, 0xfe];
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      bytes.push(code & 0xff, (code >> 8) & 0xff);
    }

    const body = new Uint8Array(bytes);
    const frame = new Uint8Array(10 + body.length);
    for (let i = 0; i < 4; i++) {
      frame[i] = frameId.charCodeAt(i);
    }

    const sz = body.length;
    frame[4] = (sz >> 24) & 0xff;
    frame[5] = (sz >> 16) & 0xff;
    frame[6] = (sz >> 8) & 0xff;
    frame[7] = sz & 0xff;
    frame[8] = 0x00;
    frame[9] = 0x00;
    frame.set(body, 10);
    return frame;
  }

  private static makeApicFrame(imgBytes: Uint8Array): Uint8Array | null {
    if (!imgBytes || imgBytes.length === 0) return null;

    // Detect MIME type from magic numbers (default to image/jpeg)
    let mime = 'image/jpeg\0';
    if (imgBytes[0] === 0x89 && imgBytes[1] === 0x50 && imgBytes[2] === 0x4e && imgBytes[3] === 0x47) {
      mime = 'image/png\0';
    } else if (
      imgBytes.length >= 12 &&
      imgBytes[0] === 0x52 && imgBytes[1] === 0x49 && imgBytes[2] === 0x46 && imgBytes[3] === 0x46 && // 'RIFF'
      imgBytes[8] === 0x57 && imgBytes[9] === 0x45 && imgBytes[10] === 0x42 && imgBytes[11] === 0x50   // 'WEBP'
    ) {
      mime = 'image/webp\0';
    }

    const mimeBytes: number[] = [];
    for (let i = 0; i < mime.length; i++) {
      mimeBytes.push(mime.charCodeAt(i));
    }

    const bodyLen = 1 + mimeBytes.length + 1 + 1 + imgBytes.length;
    const body = new Uint8Array(bodyLen);
    let p = 0;
    body[p++] = 0x00; // ISO-8859-1
    for (const b of mimeBytes) body[p++] = b;
    body[p++] = 0x03; // Picture Type: 0x03 = Cover (front)
    body[p++] = 0x00; // Empty description null terminator
    body.set(imgBytes, p);

    const frame = new Uint8Array(10 + bodyLen);
    for (let i = 0; i < 4; i++) {
      frame[i] = 'APIC'.charCodeAt(i);
    }

    const sz = bodyLen;
    frame[4] = (sz >> 24) & 0xff;
    frame[5] = (sz >> 16) & 0xff;
    frame[6] = (sz >> 8) & 0xff;
    frame[7] = sz & 0xff;
    frame[8] = 0x00;
    frame[9] = 0x00;
    frame.set(body, 10);
    return frame;
  }

  /**
   * Generates a complete ID3v2.3 tag header and frame block.
   */
  public static createTagBuffer(
    title: string,
    artist: string,
    artworkBuffer?: Uint8Array | null
  ): Uint8Array {
    const frames: Uint8Array[] = [];

    const tit2 = this.makeTextFrame('TIT2', title);
    const tpe1 = this.makeTextFrame('TPE1', artist);
    if (tit2) frames.push(tit2);
    if (tpe1) frames.push(tpe1);

    if (artworkBuffer && artworkBuffer.length > 0) {
      const apic = this.makeApicFrame(artworkBuffer);
      if (apic) frames.push(apic);
    }

    const totalFramesSize = frames.reduce((acc, f) => acc + f.length, 0);

    const header = new Uint8Array(10);
    header[0] = 0x49; // 'I'
    header[1] = 0x44; // 'D'
    header[2] = 0x33; // '3'
    header[3] = 0x03; // Version 2.3
    header[4] = 0x00; // Revision 0
    header[5] = 0x00; // Flags

    // Synchsafe integer (7 bits per byte)
    header[6] = (totalFramesSize >> 21) & 0x7f;
    header[7] = (totalFramesSize >> 14) & 0x7f;
    header[8] = (totalFramesSize >> 7) & 0x7f;
    header[9] = totalFramesSize & 0x7f;

    const tag = new Uint8Array(10 + totalFramesSize);
    tag.set(header, 0);

    let offset = 10;
    for (const f of frames) {
      tag.set(f, offset);
      offset += f.length;
    }

    return tag;
  }

  /**
   * Strips any pre-existing ID3v2 headers or ID3v1 trailers from the raw audio buffer
   * to prevent corrupted, duplicated, or nested ID3 headers.
   */
  public static stripExistingId3Tags(audioBuffer: Uint8Array): Uint8Array {
    let startOffset = 0;

    // Detect all sequential ID3v2 headers at the start
    while (
      startOffset + 10 <= audioBuffer.length &&
      audioBuffer[startOffset] === 0x49 &&     // 'I'
      audioBuffer[startOffset + 1] === 0x44 && // 'D'
      audioBuffer[startOffset + 2] === 0x33    // '3'
    ) {
      const flags = audioBuffer[startOffset + 5];
      const b6 = audioBuffer[startOffset + 6];
      const b7 = audioBuffer[startOffset + 7];
      const b8 = audioBuffer[startOffset + 8];
      const b9 = audioBuffer[startOffset + 9];

      // ID3v2 synchsafe tag length (excluding 10-byte header)
      const tagSize = ((b6 & 0x7f) << 21) | ((b7 & 0x7f) << 14) | ((b8 & 0x7f) << 7) | (b9 & 0x7f);
      const hasFooter = (flags & 0x10) !== 0;
      const totalHeaderSize = 10 + tagSize + (hasFooter ? 10 : 0);

      if (startOffset + totalHeaderSize <= audioBuffer.length) {
        startOffset += totalHeaderSize;
      } else {
        break;
      }
    }

    let endOffset = audioBuffer.length;

    // Detect all sequential ID3v1 trailers at the end (128-byte block starting with 'TAG')
    while (
      endOffset - startOffset >= 128 &&
      audioBuffer[endOffset - 128] === 0x54 && // 'T'
      audioBuffer[endOffset - 127] === 0x41 && // 'A'
      audioBuffer[endOffset - 126] === 0x47    // 'G'
    ) {
      endOffset -= 128;
    }

    if (startOffset > 0 || endOffset < audioBuffer.length) {
      return audioBuffer.subarray(startOffset, endOffset);
    }
    return audioBuffer;
  }

  /**
   * Prepends ID3v2.3 tag to audio buffer and returns combined Buffer.
   * Cleans existing tags from audio stream before attaching the fresh ID3v2.3 tag.
   */
  public static attachTagsToAudio(
    audioBuffer: Uint8Array,
    title: string,
    artist: string,
    artworkBuffer?: Uint8Array | null
  ): Buffer {
    const cleanAudio = this.stripExistingId3Tags(audioBuffer);
    const id3Tag = this.createTagBuffer(title, artist, artworkBuffer);
    const combined = Buffer.alloc(id3Tag.length + cleanAudio.length);
    combined.set(id3Tag, 0);
    combined.set(cleanAudio, id3Tag.length);
    return combined;
  }
}

import { describe, it, expect } from 'vitest';
import { sanitizeFileName } from '../src/main/utils/sanitize';

describe('sanitizeFileName', () => {
  it('should remove invalid characters from filenames', () => {
    const raw = 'Artist: Name / Album * Track? <Cool> | "Nice".mp3';
    const cleaned = sanitizeFileName(raw);

    expect(cleaned).not.toContain(':');
    expect(cleaned).not.toContain('/');
    expect(cleaned).not.toContain('*');
    expect(cleaned).not.toContain('?');
    expect(cleaned).not.toContain('<');
    expect(cleaned).not.toContain('>');
    expect(cleaned).not.toContain('|');
    expect(cleaned).not.toContain('"');
  });

  it('should trim trailing dots and whitespace', () => {
    const raw = '  Song Title...  ';
    const cleaned = sanitizeFileName(raw);
    expect(cleaned).toBe('Song Title');
  });

  it('should handle empty or whitespace-only inputs with fallback', () => {
    expect(sanitizeFileName('')).toBe('track');
    expect(sanitizeFileName('   ')).toBe('track');
    expect(sanitizeFileName('...', 'customFallback')).toBe('customFallback');
  });

  it('should avoid Windows reserved device names', () => {
    expect(sanitizeFileName('CON')).toBe('CON_');
    expect(sanitizeFileName('aux')).toBe('aux_');
    expect(sanitizeFileName('NUL')).toBe('NUL_');
    expect(sanitizeFileName('com1')).toBe('com1_');
  });

  it('should truncate excessively long names to 180 characters', () => {
    const longName = 'A'.repeat(250);
    const cleaned = sanitizeFileName(longName);
    expect(cleaned.length).toBeLessThanOrEqual(180);
  });
});

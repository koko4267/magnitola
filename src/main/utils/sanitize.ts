const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/**
 * Sanitize a filename to prevent invalid filesystem characters across Windows, Linux, and macOS.
 * Handles empty inputs, Windows reserved device names, and filesystem length limitations.
 */
export function sanitizeFileName(name: string, fallback = 'track'): string {
  if (!name || typeof name !== 'string') {
    return fallback;
  }

  let cleaned = name
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, '_')
    .trim()
    .replace(/\.+$/, '');

  // Truncate to safe length (leaving room for extension)
  if (cleaned.length > 180) {
    cleaned = cleaned.slice(0, 180).trim().replace(/\.+$/, '');
  }

  // Handle Windows reserved device names (e.g. CON, PRN, AUX, NUL)
  if (WINDOWS_RESERVED.test(cleaned)) {
    cleaned = `${cleaned}_`;
  }

  return cleaned || fallback;
}


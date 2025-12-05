/**
 * Normalize text for better song matching
 * - Remove special characters
 * - Convert to lowercase
 * - Trim whitespace
 * - Remove common prefixes (The, A, etc.)
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\b(the|a|an)\b/g, '') // Remove common articles
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Parse song metadata from various formats
 * Common formats:
 * - "Artist - Title"
 * - "Title - Artist"
 * - "Artist: Title"
 */
export function parseSongMetadata(raw: string): { artist: string; title: string } {
  const separators = [' - ', ' – ', ' — ', ': '];
  
  for (const sep of separators) {
    if (raw.includes(sep)) {
      const parts = raw.split(sep);
      if (parts.length >= 2) {
        return {
          artist: parts[0].trim(),
          title: parts.slice(1).join(sep).trim()
        };
      }
    }
  }

  // Fallback: treat entire string as title
  return {
    artist: 'Unknown Artist',
    title: raw.trim()
  };
}

/**
 * Utility functions for detecting radio station shows/programs
 *
 * Radio stations often broadcast their own shows with metadata where:
 * - The artist field contains the station name (e.g., "The Rock", "Mai", "George FM")
 * - The title contains the show/program name (e.g., "The Rock Weekends", "Hit Music Now")
 * - The title contains "[Station Name] + [Show Pattern]" (e.g., "The Edge Breakfast")
 * - The artist field contains time slots (e.g., "8-10am Sundays")
 * - The artist field contains multiple host names (e.g., "Clint, Meg & Dan")
 */

import { normalizeText } from './normalizer';

/**
 * Common station name variations that map to normalized forms
 */
const STATION_NAME_MAPPINGS: Record<string, string[]> = {
  'mai fm': ['mai', 'mai fm'],
  'the rock': ['the rock', 'rock'],
  'the edge': ['the edge', 'edge'],
  'the breeze': ['the breeze', 'breeze'],
  'more fm': ['more fm', 'more'],
  'george fm': ['george fm', 'george'],
  'coast': ['coast'],
  'zm': ['zm'],
  'newstalk zb': ['newstalk zb', 'newstalk', 'zb'],
  'radio hauraki': ['radio hauraki', 'hauraki'],
};

/**
 * Check if an artist name matches or is part of a station name
 * This is the primary indicator that the "song" is actually a radio show
 */
export function isArtistStationMatch(artist: string, stationName: string): boolean {
  const normalizedArtist = normalizeText(artist);
  const normalizedStation = normalizeText(stationName);

  // Direct match
  if (normalizedArtist === normalizedStation) {
    return true;
  }

  // Check if normalized artist is contained in or contains station name
  if (normalizedStation.includes(normalizedArtist) && normalizedArtist.length >= 2) {
    return true;
  }

  // Check known mappings
  for (const [stationKey, variations] of Object.entries(STATION_NAME_MAPPINGS)) {
    const normalizedKey = normalizeText(stationKey);
    if (normalizedStation === normalizedKey || normalizedStation.includes(normalizedKey)) {
      if (variations.some(v => normalizeText(v) === normalizedArtist)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Patterns that commonly indicate show/program names in titles
 */
const SHOW_TITLE_PATTERNS = [
  /weekend/i,
  /morning/i,
  /afternoon/i,
  /evening/i,
  /night/i,
  /breakfast/i,
  /drive/i,
  /show$/i,
  /hits?(\s+now)?$/i,
  /music\s+now/i,
  /top\s+\d+/i,
  /countdown/i,
  /hot(test)?\s+/i,
  /best\s+of/i,
  /favourites?/i,
  /favorites?/i,
  /non[\s-]?stop/i,
  /mix/i,
  /chill/i,
  /beats/i,
  /working/i,  // e.g., "Beats Working"
  /party/i,
];

/**
 * Check if a title looks like a show/program name
 */
export function isShowLikeTitle(title: string): boolean {
  return SHOW_TITLE_PATTERNS.some(pattern => pattern.test(title));
}

/**
 * Check if the title contains a station name reference
 * e.g., "The Edge Breakfast" contains "Edge"
 */
export function titleContainsStationName(title: string, stationName: string): boolean {
  const normalizedTitle = normalizeText(title);
  const normalizedStation = normalizeText(stationName);

  // Check direct inclusion
  if (normalizedTitle.includes(normalizedStation)) {
    return true;
  }

  // Check known variations
  for (const [stationKey, variations] of Object.entries(STATION_NAME_MAPPINGS)) {
    const normalizedKey = normalizeText(stationKey);
    if (normalizedStation === normalizedKey || normalizedStation.includes(normalizedKey)) {
      // Check if any variation appears in the title
      if (variations.some(v => normalizedTitle.includes(normalizeText(v)))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Patterns that indicate time slots in artist names (strong indicator of shows)
 * e.g., "8-10am Sundays", "6am-9am", "Weekday Mornings"
 *
 * These must be conservative to avoid false positives on artist names like "Sundayman"
 */
const TIME_SLOT_PATTERNS = [
  /^\d{1,2}[:\-]?\d{0,2}\s*(am|pm)/i,  // Starts with time: "8am", "8-10am", "8:00am"
  /\d{1,2}\s*(am|pm)\s*[-–]\s*\d{1,2}\s*(am|pm)/i,  // Time range: "8am-10am", "6am - 9am"
  /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\s/i,  // Starts with day + space
  /\s(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?$/i,  // Ends with space + day
  /^weekday/i,  // Starts with weekday
  /^weekend/i,  // Starts with weekend
];

/**
 * Check if artist name looks like a time slot
 */
export function isTimeSlotArtist(artist: string): boolean {
  return TIME_SLOT_PATTERNS.some(pattern => pattern.test(artist));
}

/**
 * Check if artist name looks like multiple radio hosts
 * e.g., "Clint, Meg & Dan", "Simon, Lana & The Breakfast Club"
 *
 * Patterns:
 * - Contains comma AND ampersand/and (multiple people listed)
 * - Contains "& The" followed by show-like words
 */
export function isMultipleHostsArtist(artist: string): boolean {
  // Must contain comma AND (&, and, +) - indicates "Name, Name & Name" format
  const hasComma = artist.includes(',');
  const hasAmpersand = /[&+]|\band\b/i.test(artist);

  if (hasComma && hasAmpersand) {
    // Additional check: shouldn't look like a real band name
    // Real bands typically don't have formats like "First, First & First"
    // Check if it looks like first names (short words before punctuation)
    const parts = artist.split(/[,&+]|\band\b/i).map(p => p.trim());
    const allShortNames = parts.every(p => {
      const words = p.split(/\s+/);
      // Either a single short word (first name) or "The Something"
      return words.length <= 3 && words[0].length <= 12;
    });
    if (allShortNames) {
      return true;
    }
  }

  // Check for "& The [Show-like word]" pattern
  if (/&\s*the\s+(breakfast|morning|afternoon|evening|show|club|crew|team)/i.test(artist)) {
    return true;
  }

  return false;
}

export interface ShowDetectionResult {
  isShow: boolean;
  confidence: number;
  reason?: string;
}

/**
 * Detect if a track entry is likely a radio show rather than a song
 *
 * @param artist - The artist field from metadata
 * @param title - The title field from metadata
 * @param stationName - The name of the station that played this
 * @returns Detection result with confidence score
 */
export function detectRadioShow(
  artist: string,
  title: string,
  stationName: string
): ShowDetectionResult {
  // Primary check: artist matches station name (highest confidence)
  const artistMatchesStation = isArtistStationMatch(artist, stationName);

  if (artistMatchesStation) {
    const titleIsShowLike = isShowLikeTitle(title);

    return {
      isShow: true,
      confidence: titleIsShowLike ? 1.0 : 0.9,
      reason: titleIsShowLike
        ? `Artist "${artist}" matches station and title "${title}" has show-like pattern`
        : `Artist "${artist}" matches station name "${stationName}"`
    };
  }

  // Secondary check: title contains station name + show-like pattern
  // e.g., "The Edge Breakfast" on "The Edge" station
  const titleHasStation = titleContainsStationName(title, stationName);
  const titleIsShowLike = isShowLikeTitle(title);

  if (titleHasStation && titleIsShowLike) {
    return {
      isShow: true,
      confidence: 0.95,
      reason: `Title "${title}" contains station name and has show-like pattern`
    };
  }

  // Check for time slot artist (very strong indicator)
  // e.g., "8-10am Sundays" as artist
  if (isTimeSlotArtist(artist)) {
    return {
      isShow: true,
      confidence: 0.95,
      reason: `Artist "${artist}" appears to be a time slot`
    };
  }

  // Check for multiple hosts pattern combined with show-like title
  // e.g., "Clint, Meg & Dan" with "The Edge Breakfast"
  // This requires BOTH conditions to avoid false positives on bands
  // Also exclude remix/edit titles as these often have multiple artists
  const isRemixOrEdit = /\((.*remix|.*edit|.*version|.*mix)\)/i.test(title);
  if (isMultipleHostsArtist(artist) && titleIsShowLike && !isRemixOrEdit) {
    return {
      isShow: true,
      confidence: 0.85,
      reason: `Artist "${artist}" looks like multiple hosts and title "${title}" has show-like pattern`
    };
  }

  return {
    isShow: false,
    confidence: 0,
  };
}

/**
 * Get a list of all songs that should be marked as shows
 * based on station name matching
 *
 * This is useful for batch processing existing data
 */
export function generateShowDetectionQuery(): string {
  return `
    WITH station_plays AS (
      SELECT DISTINCT
        s.id as song_id,
        s.title,
        s.artist,
        st.name as station_name,
        st.id as station_id
      FROM songs s
      JOIN plays p ON s.id = p.song_id
      JOIN stations st ON p.station_id = st.id
    )
    SELECT
      song_id,
      title,
      artist,
      station_name,
      station_id
    FROM station_plays
    WHERE
      -- Artist closely matches station name
      LOWER(TRIM(artist)) = LOWER(TRIM(REPLACE(REPLACE(station_name, ' FM', ''), 'Radio ', '')))
      OR LOWER(TRIM(REPLACE(REPLACE(station_name, ' FM', ''), 'Radio ', ''))) LIKE '%' || LOWER(TRIM(artist)) || '%'
      OR LOWER(TRIM(artist)) LIKE '%' || LOWER(TRIM(REPLACE(REPLACE(station_name, ' FM', ''), 'Radio ', ''))) || '%'
    ORDER BY station_name, artist;
  `;
}

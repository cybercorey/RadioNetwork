/**
 * Utility functions for detecting radio station shows/programs
 *
 * Radio stations often broadcast their own shows with metadata where:
 * - The artist field contains the station name (e.g., "The Rock", "Mai", "George FM")
 * - The title contains the show/program name (e.g., "The Rock Weekends", "Hit Music Now")
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
  // Primary check: artist matches station name
  const artistMatchesStation = isArtistStationMatch(artist, stationName);

  if (artistMatchesStation) {
    // High confidence if artist exactly or closely matches station
    const titleIsShowLike = isShowLikeTitle(title);

    return {
      isShow: true,
      confidence: titleIsShowLike ? 1.0 : 0.9,
      reason: titleIsShowLike
        ? `Artist "${artist}" matches station and title "${title}" has show-like pattern`
        : `Artist "${artist}" matches station name "${stationName}"`
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

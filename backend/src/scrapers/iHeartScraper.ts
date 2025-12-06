import axios from 'axios';
import { logger } from '../utils/logger';

export interface IHeartNowPlaying {
  artist: string;
  title: string;
  raw: string;
  album?: string;
  imagePath?: string;
  duration?: number;
}

/**
 * Scrape current track from iHeartRadio API
 * Used for stations like Radio Hauraki and ZM that stream via iHeartRadio
 *
 * @param stationId - The iHeartRadio station ID (e.g., 6191 for Hauraki, 6190 for ZM)
 * @returns Current track metadata
 */
export async function scrapeIHeartStation(stationId: string | number): Promise<IHeartNowPlaying> {
  try {
    const url = `https://us.api.iheart.com/api/v3/live-meta/stream/${stationId}/currentTrackMeta`;
    logger.debug(`Fetching iHeart metadata: ${url}`);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    const data = response.data;

    // Check if we have valid track data
    if (!data || !data.artist || !data.title) {
      throw new Error('Invalid response from iHeart API: missing artist or title');
    }

    // Check if the track status indicates a valid match
    if (data.status !== 'match') {
      logger.warn(`iHeart station ${stationId} returned status: ${data.status}`);
    }

    const metadata: IHeartNowPlaying = {
      artist: data.artist,
      title: data.title,
      raw: `${data.artist} - ${data.title}`,
      album: data.album || undefined,
      imagePath: data.imagePath || undefined,
      duration: data.trackDuration || undefined,
    };

    logger.info(`Scraped from iHeart ${stationId}: ${metadata.raw}`);
    return metadata;

  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        logger.error(`iHeart API error for station ${stationId}: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        logger.error(`iHeart API no response for station ${stationId}: ${error.message}`);
      } else {
        logger.error(`iHeart API request error for station ${stationId}: ${error.message}`);
      }
    } else {
      logger.error(`Failed to scrape iHeart station ${stationId}:`, error.message);
    }
    throw error;
  }
}

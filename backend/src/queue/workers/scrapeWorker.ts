import { scrapeQueue } from '../../config/bull';
import { parseIcyStream } from '../../scrapers/icyMetadataParser';
import { scrapeRovaStation } from '../../scrapers/rovaWebScraper';
import { scrapeIHeartStation } from '../../scrapers/iHeartScraper';
import { stationService } from '../../services/stationService';
import { songService } from '../../services/songService';
import { playService } from '../../services/playService';
import { logger } from '../../utils/logger';
import { io } from '../../server';

export interface ScrapeJobData {
  stationId: number;
  streamUrl: string;
  metadataType?: string;
  rovaSlug?: string;
  iheartId?: string;
}

// Process scrape jobs
scrapeQueue.process(async (job) => {
  const { stationId, streamUrl, metadataType, rovaSlug, iheartId } = job.data as ScrapeJobData;

  try {
    logger.debug(`Scraping station ${stationId}...`);

    // Parse metadata based on type
    let metadata: { artist: string; title: string; raw: string };

    if (metadataType === 'rova' && rovaSlug) {
      metadata = await scrapeRovaStation(rovaSlug);
    } else if (metadataType === 'iheart' && iheartId) {
      metadata = await scrapeIHeartStation(iheartId);
    } else {
      // Default to ICY metadata parsing
      metadata = await parseIcyStream(streamUrl);
    }

    if (!metadata.artist || !metadata.title || metadata.artist === '' || metadata.title === '') {
      logger.warn(`Invalid metadata for station ${stationId}: ${JSON.stringify(metadata)}`);
      return { success: false, reason: 'Invalid metadata' };
    }

    // Find or create song
    const song = await songService.findOrCreate({
      artist: metadata.artist,
      title: metadata.title
    });

    // Check if this is a new play (not duplicate of last song)
    const lastPlay = await playService.getLastPlay(stationId);

    if (!lastPlay || lastPlay.songId !== song.id) {
      // Record new play
      const play = await playService.create({
        station: { connect: { id: stationId } },
        song: { connect: { id: song.id } },
        playedAt: new Date(),
        rawMetadata: metadata as any,
        confidenceScore: 1.0
      });

      // Update station last scraped time
      await stationService.updateLastScraped(stationId);

      // Get full station details
      const station = await stationService.findById(stationId);

      // Emit real-time update via Socket.io
      if (io) {
        io.to(`station:${stationId}`).emit('newSong', {
          station,
          song,
          play,
          playedAt: play.playedAt
        });

        io.emit('globalNewSong', {
          station,
          song,
          play,
          playedAt: play.playedAt
        });
      }

      logger.info(`New song recorded for station ${stationId}: ${song.artist} - ${song.title}`);

      // Check for duplicates during work hours
      await checkWorkHourDuplicates(stationId, song.id);

      return { success: true, song, play };
    } else {
      logger.debug(`Same song still playing on station ${stationId}: ${song.artist} - ${song.title}`);
      return { success: true, duplicate: true, song };
    }
  } catch (error: any) {
    logger.error(`Scrape failed for station ${stationId}:`, error);
    throw error;
  }
});

/**
 * Check for duplicate plays during work hours (9am-5pm weekdays)
 */
async function checkWorkHourDuplicates(stationId: number, songId: number): Promise<void> {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Only check Monday-Friday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return;
    }

    // Check if current time is between 9am and 5pm
    const hour = now.getHours();
    if (hour < 9 || hour >= 17) {
      return;
    }

    // Get start of work day (9am)
    const startOfWorkDay = new Date(now);
    startOfWorkDay.setHours(9, 0, 0, 0);

    // Get end of work day (5pm)
    const endOfWorkDay = new Date(now);
    endOfWorkDay.setHours(17, 0, 0, 0);

    // Check for plays during work hours
    const plays = await playService.getPlaysBetween(stationId, startOfWorkDay, endOfWorkDay);
    const duplicatePlays = plays.filter(p => p.songId === songId);

    if (duplicatePlays.length > 1) {
      const station = await stationService.findById(stationId);
      const song = await songService.findById(songId);

      logger.warn(`⚠️  Duplicate detected on ${station?.name}: ${song?.artist} - ${song?.title} played ${duplicatePlays.length} times during work hours`);

      // Emit duplicate alert
      if (io) {
        io.emit('duplicateAlert', {
          station,
          song,
          count: duplicatePlays.length,
          plays: duplicatePlays
        });
      }
    }
  } catch (error) {
    logger.error('Error checking work hour duplicates:', error);
  }
}

export { scrapeQueue };

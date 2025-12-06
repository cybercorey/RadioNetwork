import { scrapeQueue } from '../workers/scrapeWorker';
import { stationService } from '../../services/stationService';
import { logger } from '../../utils/logger';

/**
 * Schedule recurring scrape jobs for all active stations
 */
export async function scheduleStationScrapes(): Promise<void> {
  try {
    // Clear existing jobs
    await scrapeQueue.empty();
    
    const repeatableJobs = await scrapeQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await scrapeQueue.removeRepeatableByKey(job.key);
    }

    // Get all active stations
    const stations = await stationService.findAllActive();

    logger.info(`Scheduling scrape jobs for ${stations.length} active stations`);

    for (const station of stations) {
      const jobId = `station-${station.id}`;

      // Parse metadata config from JSON
      const config = station.metadataConfig as any || {};

      await scrapeQueue.add(
        {
          stationId: station.id,
          streamUrl: station.streamUrl,
          metadataType: station.metadataType,
          rovaSlug: config.rovaSlug || station.slug, // Use config or fall back to station slug
          iheartId: config.iheartId
        },
        {
          repeat: {
            every: station.scrapeInterval * 1000 // convert seconds to ms
          },
          jobId,
          removeOnComplete: true,
          removeOnFail: false
        }
      );

      logger.info(`✓ Scheduled scrape job for "${station.name}" (every ${station.scrapeInterval}s)`);
    }

    logger.info('✅ All scrape jobs scheduled successfully');
  } catch (error) {
    logger.error('Failed to schedule scrape jobs:', error);
    throw error;
  }
}

/**
 * Add a single station scrape job
 */
export async function addStationScrapeJob(stationId: number): Promise<void> {
  const station = await stationService.findById(stationId);
  
  if (!station) {
    throw new Error(`Station ${stationId} not found`);
  }

  if (!station.isActive) {
    throw new Error(`Station ${stationId} is not active`);
  }

  const jobId = `station-${station.id}`;

  await scrapeQueue.add(
    {
      stationId: station.id,
      streamUrl: station.streamUrl
    },
    {
      repeat: {
        every: station.scrapeInterval * 1000
      },
      jobId,
      removeOnComplete: true,
      removeOnFail: false
    }
  );

  logger.info(`Added scrape job for station "${station.name}"`);
}

/**
 * Remove a station's scrape job
 */
export async function removeStationScrapeJob(stationId: number): Promise<void> {
  const jobId = `station-${stationId}`;
  const repeatableJobs = await scrapeQueue.getRepeatableJobs();
  
  for (const job of repeatableJobs) {
    if (job.id === jobId) {
      await scrapeQueue.removeRepeatableByKey(job.key);
      logger.info(`Removed scrape job for station ${stationId}`);
      break;
    }
  }
}

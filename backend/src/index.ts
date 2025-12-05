import 'dotenv/config';
import { app, server } from './server';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';
import { redis } from './config/redis';
import { scheduleStationScrapes } from './queue/jobs/scheduleJobs';
import './queue/workers/scrapeWorker'; // Initialize worker

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('✅ Database connected');

    // Connect to Redis (don't wait for event, just check connection)
    try {
      await redis.ping();
      logger.info('✅ Redis connected');
    } catch (error) {
      logger.error('Redis connection failed:', error);
    }

    // Schedule scraping jobs (skip if no stations)
    try {
      await scheduleStationScrapes();
      logger.info('✅ Scraping jobs scheduled');
    } catch (error) {
      logger.warn('Could not schedule scraping jobs:', error);
    }

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📡 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

start();

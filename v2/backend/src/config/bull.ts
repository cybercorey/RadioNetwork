import Queue from 'bull';
import { redis } from './redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const scrapeQueue = new Queue('station-scrape', redisUrl, {
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

// Queue event handlers
scrapeQueue.on('error', (error) => {
  console.error('Queue error:', error);
});

scrapeQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

scrapeQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

export { Queue };

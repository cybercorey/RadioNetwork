import { Request, Response, NextFunction } from 'express';

/**
 * Cache control middleware for CDN caching
 * Sets appropriate Cache-Control headers for Cloudflare and other CDNs
 */
export const cacheControl = (seconds: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (seconds === 0) {
      // No caching - for real-time endpoints
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    } else {
      // Public caching with specific duration
      res.set('Cache-Control', `public, max-age=${seconds}, s-maxage=${seconds}`);
      res.set('CDN-Cache-Control', `max-age=${seconds}`);

      // For Cloudflare specifically
      res.set('Cloudflare-CDN-Cache-Control', `max-age=${seconds}`);
    }
    next();
  };
};

/**
 * Predefined cache durations for common use cases
 */
export const CacheDuration = {
  NONE: 0,              // No cache - real-time data
  SHORT: 30,            // 30 seconds - frequently changing data
  MEDIUM: 300,          // 5 minutes - semi-static data
  LONG: 900,            // 15 minutes - mostly static data
  VERY_LONG: 3600,      // 1 hour - rarely changing data
} as const;

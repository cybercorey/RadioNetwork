import puppeteer from 'puppeteer';
import { logger } from '../utils/logger';

export interface RovaNowPlaying {
  artist: string;
  title: string;
  raw: string;
}

let browser: any = null;

/**
 * Scrape "Now Playing" from Rova NZ station pages using Puppeteer
 * Example: https://www.rova.nz/radio/the-rock
 */
export async function scrapeRovaStation(stationSlug: string): Promise<RovaNowPlaying> {
  try {
    const url = `https://www.rova.nz/radio/${stationSlug}`;
    logger.info(`Fetching Rova page with Puppeteer: ${url}`);

    // Reuse browser instance
    if (!browser) {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: '/usr/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--ignore-certificate-errors',
          '--ignore-certificate-errors-spki-list',
        ],
      });
    }

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Extract "Now playing" text from page body
    // Format: "Now playing<track> • <artist><track> • <artist>"
    const nowPlaying = await page.evaluate(() => {
      const bodyText = document.body.textContent || '';
      
      // Look for pattern: "Now playing<text>•<text>"
      const match = bodyText.match(/Now playing([^•]+)•([^@]{1,150})/i);
      
      if (match) {
        let track = match[1].trim();
        let artist = match[2].trim();
        
        // Remove the duplicate track name if it appears in artist field
        // Example: "Hash Pipe • WeezerHash Pipe" -> artist should be just "Weezer"
        if (artist.endsWith(track)) {
          artist = artist.substring(0, artist.length - track.length).trim();
        }
        
        // Additional cleanup - remove any remaining duplicates  
        const parts = artist.split(track);
        if (parts.length > 1) {
          artist = parts[0].trim();
        }
        
        if (track && artist && track.length > 1 && artist.length > 1) {
          return { track, artist };
        }
      }
      
      return null;
    });

    await page.close();

    if (!nowPlaying || !nowPlaying.artist || !nowPlaying.track) {
      throw new Error('No "Now Playing" data found on page');
    }

    const metadata: RovaNowPlaying = {
      artist: nowPlaying.artist,
      title: nowPlaying.track,
      raw: `${nowPlaying.artist} - ${nowPlaying.track}`
    };

    logger.info(`Scraped from Rova ${stationSlug}: ${metadata.raw}`);
    return metadata;

  } catch (error: any) {
    logger.error(`Failed to scrape Rova station ${stationSlug}:`, error.message);
    throw error;
  }
}

// Cleanup on exit
process.on('exit', async () => {
  if (browser) {
    await browser.close();
  }
});

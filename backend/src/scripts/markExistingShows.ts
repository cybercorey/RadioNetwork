/**
 * Migration script to mark existing radio shows in the database
 *
 * This script identifies songs where the artist name matches a station name,
 * which indicates they are likely radio shows/programs rather than actual songs.
 *
 * Run with: npx ts-node src/scripts/markExistingShows.ts
 * Or: npm run mark-shows (if added to package.json)
 */

import { prisma } from '../config/database';
import { detectRadioShow } from '../utils/showDetection';
import { logger } from '../utils/logger';

interface SongWithStation {
  song_id: number;
  title: string;
  artist: string;
  station_name: string;
  station_id: number;
  play_count: bigint;
}

async function markExistingShows(): Promise<void> {
  logger.info('Starting migration to mark existing radio shows...');

  try {
    // Find all songs that have been played along with their station info
    // Group by song and station to get the station context for each song
    const songsWithStations = await prisma.$queryRaw<SongWithStation[]>`
      SELECT DISTINCT
        s.id as song_id,
        s.title,
        s.artist,
        st.name as station_name,
        st.id as station_id,
        COUNT(p.id) as play_count
      FROM songs s
      JOIN plays p ON s.id = p.song_id
      JOIN stations st ON p.station_id = st.id
      WHERE s.is_non_song = false
      GROUP BY s.id, s.title, s.artist, st.name, st.id
      ORDER BY s.artist, s.title
    `;

    logger.info(`Found ${songsWithStations.length} song-station combinations to check`);

    const showsToMark = new Map<number, { title: string; artist: string; reason: string }>();

    // Check each song-station combination
    for (const record of songsWithStations) {
      const detection = detectRadioShow(record.artist, record.title, record.station_name);

      if (detection.isShow && !showsToMark.has(record.song_id)) {
        showsToMark.set(record.song_id, {
          title: record.title,
          artist: record.artist,
          reason: detection.reason || 'Artist matches station name',
        });
      }
    }

    logger.info(`Identified ${showsToMark.size} songs to mark as shows`);

    if (showsToMark.size === 0) {
      logger.info('No shows to mark. Exiting.');
      return;
    }

    // Log what will be marked
    console.log('\n=== Songs to be marked as shows ===\n');
    for (const [songId, info] of showsToMark) {
      console.log(`  [${songId}] "${info.artist}" - "${info.title}"`);
      console.log(`         Reason: ${info.reason}\n`);
    }

    // Prompt for confirmation (skip in non-interactive mode)
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const autoConfirm = args.includes('--yes') || args.includes('-y');

    if (dryRun) {
      logger.info('Dry run mode - no changes will be made');
      return;
    }

    if (!autoConfirm) {
      console.log('\nRun with --yes or -y to automatically apply changes');
      console.log('Run with --dry-run to see what would be changed without applying');
      return;
    }

    // Update all identified shows
    const songIds = Array.from(showsToMark.keys());

    const result = await prisma.song.updateMany({
      where: {
        id: { in: songIds },
      },
      data: {
        isNonSong: true,
        nonSongType: 'show',
      },
    });

    logger.info(`Successfully marked ${result.count} songs as shows`);

    // Log summary
    console.log('\n=== Migration Summary ===');
    console.log(`Total songs checked: ${songsWithStations.length} combinations`);
    console.log(`Shows identified: ${showsToMark.size}`);
    console.log(`Songs updated: ${result.count}`);

  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
markExistingShows()
  .then(() => {
    logger.info('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Migration failed:', error);
    process.exit(1);
  });

import { Router } from 'express';
import { playService } from '../../services/playService';
import { prisma } from '../../config/database';

const router = Router();

// Helper function to parse date filters (both modern and legacy)
function parseDateFilter(dateFilter: string): { gte?: Date; lte?: Date } | null {
  if (!dateFilter || dateFilter === 'all') return null;

  const now = new Date();
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  switch (dateFilter) {
    // Modern relative filters
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    // Legacy year filters
    case '2013':
      startDate = new Date('2013-01-01T00:00:00Z');
      endDate = new Date('2013-12-31T23:59:59Z');
      break;
    case '2014':
      startDate = new Date('2014-01-01T00:00:00Z');
      endDate = new Date('2014-12-31T23:59:59Z');
      break;
    case '2015':
      startDate = new Date('2015-01-01T00:00:00Z');
      endDate = new Date('2015-12-31T23:59:59Z');
      break;
    // Legacy half-year filters
    case '2013-H1':
      startDate = new Date('2013-01-01T00:00:00Z');
      endDate = new Date('2013-06-30T23:59:59Z');
      break;
    case '2013-H2':
      startDate = new Date('2013-07-01T00:00:00Z');
      endDate = new Date('2013-12-31T23:59:59Z');
      break;
    case '2014-H1':
      startDate = new Date('2014-01-01T00:00:00Z');
      endDate = new Date('2014-06-30T23:59:59Z');
      break;
    case '2014-H2':
      startDate = new Date('2014-07-01T00:00:00Z');
      endDate = new Date('2014-12-31T23:59:59Z');
      break;
    case '2015-Q1':
      startDate = new Date('2015-01-01T00:00:00Z');
      endDate = new Date('2015-03-31T23:59:59Z');
      break;
    default:
      return null;
  }

  if (startDate && endDate) {
    return { gte: startDate, lte: endDate };
  } else if (startDate) {
    return { gte: startDate };
  }
  return null;
}

// GET /api/plays/stats - Get overall database statistics
// Query params:
//   - source: 'v1' | 'v2' | 'all' - filter by data source (legacy vs modern)
router.get('/stats', async (req, res, next) => {
  try {
    const sourceFilter = req.query.source as string || 'all';

    // Build where clause for source filter
    const playWhere: any = {};
    if (sourceFilter === 'v1') {
      playWhere.source = 'v1';
    } else if (sourceFilter === 'v2') {
      playWhere.source = 'v2';
    }

    const totalPlays = await prisma.play.count({ where: playWhere });

    // Get unique songs and artists based on source filter
    let totalSongs: number;
    let uniqueArtists: number;
    let totalStations: number;

    if (sourceFilter === 'v1' || sourceFilter === 'v2') {
      // Get songs that have plays with the specified source
      const songsWithPlays = await prisma.play.findMany({
        where: playWhere,
        select: { songId: true },
        distinct: ['songId'],
      });
      totalSongs = songsWithPlays.length;

      // Get unique artists from those songs
      const songIds = songsWithPlays.map(p => p.songId);
      const artistsFromSongs = await prisma.song.findMany({
        where: { id: { in: songIds } },
        select: { artist: true },
      });
      uniqueArtists = new Set(artistsFromSongs.map(s => s.artist)).size;

      // Get stations that have plays with the specified source
      const stationsWithPlays = await prisma.play.findMany({
        where: playWhere,
        select: { stationId: true },
        distinct: ['stationId'],
      });
      totalStations = stationsWithPlays.length;
    } else {
      // All sources - count everything
      totalSongs = await prisma.song.count();
      totalStations = await prisma.station.count({ where: { isActive: true } });
      const allSongs = await prisma.song.findMany({ select: { artist: true } });
      uniqueArtists = new Set(allSongs.map(s => s.artist)).size;
    }

    // Get breakdown by source
    const legacyPlays = await prisma.play.count({ where: { source: 'v1' } });
    const modernPlays = await prisma.play.count({ where: { source: 'v2' } });

    // Get date range for legacy data
    const oldestLegacy = await prisma.play.findFirst({
      where: { source: 'v1' },
      orderBy: { playedAt: 'asc' },
      select: { playedAt: true },
    });
    const newestLegacy = await prisma.play.findFirst({
      where: { source: 'v1' },
      orderBy: { playedAt: 'desc' },
      select: { playedAt: true },
    });

    res.json({
      totalPlays,
      totalSongs,
      totalStations,
      uniqueArtists,
      source: sourceFilter,
      breakdown: {
        legacy: {
          plays: legacyPlays,
          dateRange: oldestLegacy && newestLegacy ? {
            from: oldestLegacy.playedAt,
            to: newestLegacy.playedAt,
          } : null,
        },
        modern: {
          plays: modernPlays,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/plays/recent - Get recent plays with pagination and filtering
// Query params:
//   - limit, offset: pagination
//   - station: filter by station slug
//   - genre: filter by genre tag
//   - search: search in title/artist/station
//   - dateFilter: '24h' | '7d' | '30d' | 'all'
//   - filter: 'songs' (default) | 'shows' | 'all' - filter by content type
//   - source: 'v1' | 'v2' | 'all' - filter by data source (legacy vs modern)
router.get('/recent', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const stationSlug = req.query.station as string;
    const genre = req.query.genre as string;
    const search = req.query.search as string;
    const dateFilter = req.query.dateFilter as string;
    const contentFilter = req.query.filter as string || 'songs'; // 'songs', 'shows', or 'all'
    const sourceFilter = req.query.source as string || 'all'; // 'v1', 'v2', or 'all'

    // Build where clause
    const where: any = {};

    // Source filter (legacy v1 vs modern v2)
    if (sourceFilter === 'v1') {
      where.source = 'v1';
    } else if (sourceFilter === 'v2') {
      where.source = 'v2';
    }
    // 'all' = no filter

    // Content type filter (songs vs shows)
    if (contentFilter === 'songs') {
      where.song = { isNonSong: false };
    } else if (contentFilter === 'shows') {
      where.song = { isNonSong: true };
    }
    // 'all' = no filter

    // Station filter
    if (stationSlug && stationSlug !== 'all') {
      const station = await prisma.station.findUnique({ where: { slug: stationSlug } });
      if (station) {
        where.stationId = station.id;
      }
    }

    // Date filter (supports both modern relative and legacy year-based filters)
    const dateRange = parseDateFilter(dateFilter);
    if (dateRange) {
      where.playedAt = dateRange;
    }

    // Get total count with filters
    const total = await prisma.play.count({ where });

    // Get plays
    let plays = await prisma.play.findMany({
      where,
      include: {
        song: true,
        station: true,
      },
      orderBy: { playedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Client-side filters (genre and search) - apply after fetching
    if (genre && genre !== 'all') {
      plays = plays.filter(play => play.station.tags.includes(genre));
    }

    if (search) {
      const searchLower = search.toLowerCase();
      plays = plays.filter(play =>
        play.song.title.toLowerCase().includes(searchLower) ||
        play.song.artist.toLowerCase().includes(searchLower) ||
        play.station.name.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      plays,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + plays.length < total,
      },
      filter: contentFilter,
      source: sourceFilter,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/plays/most-played - Get most played songs with pagination
// Query params:
//   - limit, offset: pagination
//   - station: filter by station slug
//   - dateFilter: '24h' | '7d' | '30d' | 'all'
//   - filter: 'songs' (default) | 'shows' | 'all' - filter by content type
//   - source: 'v1' | 'v2' | 'all' - filter by data source (legacy vs modern)
router.get('/most-played', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const stationSlug = req.query.station as string;
    const dateFilter = req.query.dateFilter as string;
    const contentFilter = req.query.filter as string || 'songs'; // 'songs', 'shows', or 'all'
    const sourceFilter = req.query.source as string || 'all'; // 'v1', 'v2', or 'all'

    // Build where clause for filtering
    const where: any = {};

    // Source filter (legacy v1 vs modern v2)
    if (sourceFilter === 'v1') {
      where.source = 'v1';
    } else if (sourceFilter === 'v2') {
      where.source = 'v2';
    }
    // 'all' = no filter

    // Content type filter (songs vs shows)
    if (contentFilter === 'songs') {
      where.song = { isNonSong: false };
    } else if (contentFilter === 'shows') {
      where.song = { isNonSong: true };
    }
    // 'all' = no filter

    // Station filter
    if (stationSlug && stationSlug !== 'all') {
      const station = await prisma.station.findUnique({ where: { slug: stationSlug } });
      if (station) {
        where.stationId = station.id;
      }
    }

    // Date filter (supports both modern relative and legacy year-based filters)
    const dateRange = parseDateFilter(dateFilter);
    if (dateRange) {
      where.playedAt = dateRange;
    }

    // Group by songId and count
    const songPlayCounts = await prisma.play.groupBy({
      by: ['songId'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const total = songPlayCounts.length;

    // Get paginated results
    const paginatedSongs = songPlayCounts.slice(offset, offset + limit);

    // Fetch full song and latest play details
    const results = await Promise.all(
      paginatedSongs.map(async (item) => {
        const song = await prisma.song.findUnique({ where: { id: item.songId } });
        const latestPlay = await prisma.play.findFirst({
          where: { songId: item.songId, ...where },
          include: { station: true },
          orderBy: { playedAt: 'desc' },
        });

        return {
          song,
          playCount: item._count.id,
          latestPlay: latestPlay
            ? {
                playedAt: latestPlay.playedAt,
                station: latestPlay.station,
              }
            : null,
        };
      })
    );

    res.json({
      results,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + results.length < total,
      },
      filter: contentFilter,
      source: sourceFilter,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/plays/song/:id - Get plays for a specific song
router.get('/song/:id', async (req, res, next) => {
  try {
    const songId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit as string) || 100;

    const plays = await playService.getPlaysForSong(songId, limit);

    res.json(plays);
  } catch (error) {
    next(error);
  }
});

export default router;

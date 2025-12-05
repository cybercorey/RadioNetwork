import { Router } from 'express';
import { playService } from '../../services/playService';
import { prisma } from '../../config/database';

const router = Router();

// GET /api/plays/stats - Get overall database statistics
router.get('/stats', async (req, res, next) => {
  try {
    const totalPlays = await prisma.play.count();
    const totalSongs = await prisma.song.count();
    const totalStations = await prisma.station.count({ where: { isActive: true } });

    // Get unique artists count
    const songs = await prisma.song.findMany({ select: { artist: true } });
    const uniqueArtists = new Set(songs.map(s => s.artist)).size;

    res.json({
      totalPlays,
      totalSongs,
      totalStations,
      uniqueArtists,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/plays/recent - Get recent plays with pagination and filtering
router.get('/recent', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const stationSlug = req.query.station as string;
    const genre = req.query.genre as string;
    const search = req.query.search as string;
    const dateFilter = req.query.dateFilter as string;

    // Build where clause
    const where: any = {};

    // Station filter
    if (stationSlug && stationSlug !== 'all') {
      const station = await prisma.station.findUnique({ where: { slug: stationSlug } });
      if (station) {
        where.stationId = station.id;
      }
    }

    // Date filter
    if (dateFilter && dateFilter !== 'all') {
      const now = new Date();
      let cutoffDate: Date;

      switch (dateFilter) {
        case '24h':
          cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(0);
      }

      where.playedAt = { gte: cutoffDate };
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
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/plays/most-played - Get most played songs with pagination
router.get('/most-played', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const stationSlug = req.query.station as string;
    const dateFilter = req.query.dateFilter as string;

    // Build where clause for filtering
    const where: any = {};

    // Station filter
    if (stationSlug && stationSlug !== 'all') {
      const station = await prisma.station.findUnique({ where: { slug: stationSlug } });
      if (station) {
        where.stationId = station.id;
      }
    }

    // Date filter
    if (dateFilter && dateFilter !== 'all') {
      const now = new Date();
      let cutoffDate: Date;

      switch (dateFilter) {
        case '24h':
          cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(0);
      }

      where.playedAt = { gte: cutoffDate };
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

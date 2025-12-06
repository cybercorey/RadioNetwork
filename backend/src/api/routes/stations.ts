import { Router } from 'express';
import { stationService } from '../../services/stationService';
import { playService } from '../../services/playService';
import { logger } from '../../utils/logger';
import { cacheControl, CacheDuration } from '../middleware/cacheControl';
import { prisma } from '../../config/database';

const router = Router();

// GET /api/stations - List all stations (cache 5 minutes)
router.get('/', cacheControl(CacheDuration.MEDIUM), async (req, res, next) => {
  try {
    const stations = await stationService.findAll();
    res.json(stations);
  } catch (error) {
    next(error);
  }
});

// GET /api/stations/:slug - Get station by slug (cache 5 minutes)
router.get('/:slug', cacheControl(CacheDuration.MEDIUM), async (req, res, next) => {
  try {
    const station = await stationService.findBySlug(req.params.slug);

    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    res.json(station);
  } catch (error) {
    next(error);
  }
});

// GET /api/stations/:slug/current - Get current playing song (cache 30 seconds)
router.get('/:slug/current', cacheControl(CacheDuration.SHORT), async (req, res, next) => {
  try {
    const station = await stationService.findBySlug(req.params.slug);

    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    const currentPlay = await playService.getCurrentPlay(station.id);

    if (!currentPlay) {
      return res.json({
        station,
        currentSong: null,
        playedAt: null
      });
    }

    res.json({
      station,
      currentSong: currentPlay.song,
      playedAt: currentPlay.playedAt
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/stations/:slug/history - Get play history for station (cache 1 minute)
router.get('/:slug/history', cacheControl(60), async (req, res, next) => {
  try {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const station = await stationService.findBySlug(slug);
    
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    const plays = await playService.getHistory(station.id, { limit, offset });
    
    res.json({
      station,
      plays,
      pagination: {
        limit,
        offset,
        hasMore: plays.length === limit
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/stations/compare - Compare multiple stations (cache 10 minutes)
router.get('/compare/stats', cacheControl(CacheDuration.LONG), async (req, res, next) => {
  try {
    const stationIds = req.query.stationIds as string;
    const days = parseInt(req.query.days as string) || 30;

    if (!stationIds) {
      return res.status(400).json({ error: 'stationIds parameter required' });
    }

    const ids = stationIds.split(',').map(id => parseInt(id.trim()));

    if (ids.length < 2) {
      return res.status(400).json({ error: 'At least 2 stations required for comparison' });
    }

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Get basic stats for each station
    const stationsData = await Promise.all(
      ids.map(async (stationId) => {
        const station = await prisma.station.findUnique({
          where: { id: stationId },
        });

        if (!station) return null;

        // Get play count
        const playCount = await prisma.play.count({
          where: {
            stationId,
            playedAt: { gte: dateThreshold },
          },
        });

        // Get unique songs count
        const uniqueSongs = await prisma.play.groupBy({
          by: ['songId'],
          where: {
            stationId,
            playedAt: { gte: dateThreshold },
          },
          _count: true,
        });

        // Get unique artists count
        const uniqueArtistsData = await prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(DISTINCT s.artist) as count
          FROM plays p
          JOIN songs s ON p."songId" = s.id
          WHERE p."stationId" = ${stationId}
            AND p."playedAt" >= ${dateThreshold}
        `;

        // Get top genres
        const topGenres = await prisma.$queryRaw<{ genre: string; plays: bigint }[]>`
          SELECT UNNEST(st.tags) as genre, COUNT(*) as plays
          FROM plays p
          JOIN stations st ON p."stationId" = st.id
          WHERE p."stationId" = ${stationId}
            AND p."playedAt" >= ${dateThreshold}
          GROUP BY genre
          ORDER BY plays DESC
          LIMIT 5
        `;

        return {
          station,
          stats: {
            totalPlays: playCount,
            uniqueSongs: uniqueSongs.length,
            uniqueArtists: Number(uniqueArtistsData[0]?.count || 0),
            topGenres: topGenres.map(g => ({
              genre: g.genre,
              plays: Number(g.plays),
            })),
          },
        };
      })
    );

    const validStations = stationsData.filter(s => s !== null);

    res.json({
      stations: validStations,
      timeRange: `${days} days`,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/stations/compare/overlap - Find song overlap between stations (cache 10 minutes)
router.get('/compare/overlap', cacheControl(CacheDuration.LONG), async (req, res, next) => {
  try {
    const stationIds = req.query.stationIds as string;
    const days = parseInt(req.query.days as string) || 30;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!stationIds) {
      return res.status(400).json({ error: 'stationIds parameter required' });
    }

    const ids = stationIds.split(',').map(id => parseInt(id.trim()));

    if (ids.length < 2) {
      return res.status(400).json({ error: 'At least 2 stations required for comparison' });
    }

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Find songs played on multiple stations
    const overlapSongs = await prisma.$queryRaw<{
      id: number;
      title: string;
      artist: string;
      station_count: bigint;
      total_plays: bigint;
      stations: string[];
    }[]>`
      SELECT
        s.id,
        s.title,
        s.artist,
        COUNT(DISTINCT p."stationId") as station_count,
        COUNT(*) as total_plays,
        array_agg(DISTINCT st.name) as stations
      FROM songs s
      JOIN plays p ON s.id = p."songId"
      JOIN stations st ON p."stationId" = st.id
      WHERE p."stationId" = ANY(${ids})
        AND p."playedAt" >= ${dateThreshold}
      GROUP BY s.id, s.title, s.artist
      HAVING COUNT(DISTINCT p."stationId") > 1
      ORDER BY COUNT(DISTINCT p."stationId") DESC, COUNT(*) DESC
      LIMIT ${limit}
    `;

    const formattedSongs = overlapSongs.map(song => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      stationCount: Number(song.station_count),
      totalPlays: Number(song.total_plays),
      stations: song.stations,
    }));

    res.json({
      songs: formattedSongs,
      timeRange: `${days} days`,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/stations/compare/unique - Find unique songs per station (cache 10 minutes)
router.get('/compare/unique', cacheControl(CacheDuration.LONG), async (req, res, next) => {
  try {
    const stationId = parseInt(req.query.stationId as string);
    const compareIds = req.query.compareIds as string;
    const days = parseInt(req.query.days as string) || 30;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!stationId || !compareIds) {
      return res.status(400).json({ error: 'stationId and compareIds parameters required' });
    }

    const otherIds = compareIds.split(',').map(id => parseInt(id.trim()));
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Find songs played ONLY on this station, not on others
    const uniqueSongs = await prisma.$queryRaw<{
      id: number;
      title: string;
      artist: string;
      play_count: bigint;
    }[]>`
      SELECT
        s.id,
        s.title,
        s.artist,
        COUNT(*) as play_count
      FROM songs s
      JOIN plays p ON s.id = p."songId"
      WHERE p."stationId" = ${stationId}
        AND p."playedAt" >= ${dateThreshold}
        AND s.id NOT IN (
          SELECT DISTINCT "songId"
          FROM plays
          WHERE "stationId" = ANY(${otherIds})
            AND "playedAt" >= ${dateThreshold}
        )
      GROUP BY s.id, s.title, s.artist
      ORDER BY COUNT(*) DESC
      LIMIT ${limit}
    `;

    const station = await prisma.station.findUnique({
      where: { id: stationId },
    });

    res.json({
      station,
      songs: uniqueSongs.map(song => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        playCount: Number(song.play_count),
      })),
      timeRange: `${days} days`,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/stations/compare/timeline - Get play timeline comparison (cache 10 minutes)
router.get('/compare/timeline', cacheControl(CacheDuration.LONG), async (req, res, next) => {
  try {
    const stationIds = req.query.stationIds as string;
    const days = parseInt(req.query.days as string) || 7;

    if (!stationIds) {
      return res.status(400).json({ error: 'stationIds parameter required' });
    }

    const ids = stationIds.split(',').map(id => parseInt(id.trim()));

    if (ids.length < 2) {
      return res.status(400).json({ error: 'At least 2 stations required for comparison' });
    }

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Get play counts per day for each station
    const timeline = await Promise.all(
      ids.map(async (stationId) => {
        const station = await prisma.station.findUnique({
          where: { id: stationId },
        });

        const dailyPlays = await prisma.$queryRaw<{
          date: Date;
          plays: bigint;
        }[]>`
          SELECT
            DATE("playedAt") as date,
            COUNT(*) as plays
          FROM plays
          WHERE "stationId" = ${stationId}
            AND "playedAt" >= ${dateThreshold}
          GROUP BY DATE("playedAt")
          ORDER BY date ASC
        `;

        return {
          stationId,
          stationName: station?.name || 'Unknown',
          data: dailyPlays.map(d => ({
            date: d.date.toISOString().split('T')[0],
            plays: Number(d.plays),
          })),
        };
      })
    );

    res.json({
      timeline,
      timeRange: `${days} days`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

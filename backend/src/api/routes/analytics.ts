import { Router } from 'express';
import { prisma } from '../../config/database';
import { playService } from '../../services/playService';
import { cacheControl, CacheDuration } from '../middleware/cacheControl';

const router = Router();

// GET /api/analytics/stats - Get system statistics (cache 5 minutes)
router.get('/stats', cacheControl(CacheDuration.MEDIUM), async (req, res, next) => {
  try {
    const [totalStations, totalSongs, totalPlays] = await Promise.all([
      prisma.station.count(),
      prisma.song.count(),
      playService.getTotalPlays()
    ]);

    const activeStations = await prisma.station.count({
      where: { isActive: true }
    });

    res.json({
      totalStations,
      activeStations,
      totalSongs,
      totalPlays,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/dashboard - Get comprehensive dashboard analytics (cache 5 minutes)
router.get('/dashboard', cacheControl(CacheDuration.MEDIUM), async (req, res, next) => {
  try {
    const timeRange = req.query.timeRange as string || '7d';

    // Calculate date filter
    let cutoffDate: Date;
    const now = new Date();

    switch (timeRange) {
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
        cutoffDate = new Date(0); // All time
    }

    // Get overall stats
    const totalPlays = await prisma.play.count();
    const totalSongs = await prisma.song.count();
    const activeStations = await prisma.station.count({ where: { isActive: true } });

    const songs = await prisma.song.findMany({ select: { artist: true } });
    const uniqueArtists = new Set(songs.map(s => s.artist)).size;

    // Plays over time (grouped by date)
    const playsOverTime = await prisma.$queryRaw<{ date: string; plays: number }[]>`
      SELECT
        DATE(played_at) as date,
        COUNT(*)::int as plays
      FROM plays
      WHERE played_at >= ${cutoffDate}
      GROUP BY DATE(played_at)
      ORDER BY date ASC
    `;

    // Top songs
    const topSongsData = await prisma.play.groupBy({
      by: ['songId'],
      where: { playedAt: { gte: cutoffDate } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 15,
    });

    const topSongs = await Promise.all(
      topSongsData.map(async (item) => {
        const song = await prisma.song.findUnique({ where: { id: item.songId } });
        return {
          song: song?.title || 'Unknown',
          artist: song?.artist || 'Unknown',
          plays: item._count.id,
        };
      })
    );

    // Top artists
    const playsWithSongs = await prisma.play.findMany({
      where: { playedAt: { gte: cutoffDate } },
      include: { song: true },
    });

    const artistCounts = playsWithSongs.reduce((acc, play) => {
      const artist = play.song.artist;
      acc[artist] = (acc[artist] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topArtists = Object.entries(artistCounts)
      .map(([artist, plays]) => ({ artist, plays }))
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 15);

    // Plays by station
    const playsByStationData = await prisma.play.groupBy({
      by: ['stationId'],
      where: { playedAt: { gte: cutoffDate } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const playsByStation = await Promise.all(
      playsByStationData.map(async (item) => {
        const station = await prisma.station.findUnique({ where: { id: item.stationId } });
        return {
          station: station?.name || 'Unknown',
          plays: item._count.id,
        };
      })
    );

    // Plays by genre (from station tags)
    const genreCounts: Record<string, number> = {};
    const playsWithStations = await prisma.play.findMany({
      where: { playedAt: { gte: cutoffDate } },
      include: { station: true },
    });

    playsWithStations.forEach((play) => {
      play.station.tags.forEach((tag) => {
        genreCounts[tag] = (genreCounts[tag] || 0) + 1;
      });
    });

    const playsByGenre = Object.entries(genreCounts)
      .map(([genre, plays]) => ({ genre, plays }))
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 10);

    // Plays by hour of day
    const playsByHourData = await prisma.$queryRaw<{ hour: number; plays: number }[]>`
      SELECT
        EXTRACT(HOUR FROM played_at)::int as hour,
        COUNT(*)::int as plays
      FROM plays
      WHERE played_at >= ${cutoffDate}
      GROUP BY EXTRACT(HOUR FROM played_at)
      ORDER BY hour ASC
    `;

    res.json({
      totalPlays,
      totalSongs,
      uniqueArtists,
      activeStations,
      playsOverTime,
      topSongs,
      topArtists,
      playsByStation,
      playsByGenre,
      playsByHour: playsByHourData,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/station/:id - Get analytics for a specific station (cache 5 minutes)
router.get('/station/:id', cacheControl(CacheDuration.MEDIUM), async (req, res, next) => {
  try {
    const stationId = parseInt(req.params.id);

    const totalPlays = await playService.getPlaysByStation(stationId);

    // Get plays per day for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const playsPerDay = await prisma.$queryRaw`
      SELECT
        DATE(played_at) as date,
        COUNT(*) as count
      FROM plays
      WHERE station_id = ${stationId}
        AND played_at >= ${thirtyDaysAgo}
      GROUP BY DATE(played_at)
      ORDER BY date DESC
    `;

    res.json({
      stationId,
      totalPlays,
      playsPerDay
    });
  } catch (error) {
    next(error);
  }
});

export default router;

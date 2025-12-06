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

// GET /api/analytics/song-momentum - Track song momentum and trends (cache 10 minutes)
router.get('/song-momentum', cacheControl(CacheDuration.LONG), async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const days = parseInt(req.query.days as string) || 7;

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    const previousPeriodStart = new Date(dateThreshold);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days);

    // Compare current period vs previous period
    const momentum = await prisma.$queryRaw`
      WITH current_period AS (
        SELECT
          "songId",
          COUNT(*) as current_plays,
          COUNT(DISTINCT "stationId") as current_stations
        FROM plays
        WHERE "playedAt" >= ${dateThreshold}
        GROUP BY "songId"
      ),
      previous_period AS (
        SELECT
          "songId",
          COUNT(*) as previous_plays
        FROM plays
        WHERE "playedAt" >= ${previousPeriodStart} AND "playedAt" < ${dateThreshold}
        GROUP BY "songId"
      )
      SELECT
        s.id,
        s.title,
        s.artist,
        cp.current_plays,
        cp.current_stations,
        COALESCE(pp.previous_plays, 0) as previous_plays,
        (cp.current_plays - COALESCE(pp.previous_plays, 0)) as momentum_delta,
        CASE
          WHEN COALESCE(pp.previous_plays, 0) > 0
          THEN ((cp.current_plays - COALESCE(pp.previous_plays, 0))::float / pp.previous_plays::float * 100)
          ELSE 100
        END as momentum_percent
      FROM songs s
      JOIN current_period cp ON s.id = cp."songId"
      LEFT JOIN previous_period pp ON s.id = pp."songId"
      WHERE cp.current_plays > 5
      ORDER BY momentum_delta DESC
      LIMIT ${limit}
    `;

    res.json({
      timeframe: `${days} days`,
      songs: momentum
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/cross-station - Analyze cross-station patterns (cache 10 minutes)
router.get('/cross-station', cacheControl(CacheDuration.LONG), async (req, res, next) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Find songs played on multiple stations
    const crossStationSongs = await prisma.$queryRaw`
      SELECT
        s.id,
        s.title,
        s.artist,
        COUNT(DISTINCT p."stationId") as station_count,
        COUNT(p.id) as total_plays,
        array_agg(DISTINCT st.name) as stations,
        MAX(p."playedAt") as last_played
      FROM songs s
      JOIN plays p ON s.id = p."songId"
      JOIN stations st ON p."stationId" = st.id
      WHERE p."playedAt" >= ${dateThreshold}
      GROUP BY s.id, s.title, s.artist
      HAVING COUNT(DISTINCT p."stationId") > 1
      ORDER BY COUNT(DISTINCT p."stationId") DESC, COUNT(p.id) DESC
      LIMIT 100
    `;

    // Station overlap analysis
    const stationOverlap = await prisma.$queryRaw`
      WITH station_pairs AS (
        SELECT
          p1."stationId" as station_a,
          p2."stationId" as station_b,
          COUNT(DISTINCT p1."songId") as shared_songs
        FROM plays p1
        JOIN plays p2 ON p1."songId" = p2."songId" AND p1."stationId" < p2."stationId"
        WHERE p1."playedAt" >= ${dateThreshold}
          AND p2."playedAt" >= ${dateThreshold}
        GROUP BY p1."stationId", p2."stationId"
      )
      SELECT
        sa.name as station_a_name,
        sb.name as station_b_name,
        sp.shared_songs,
        array_agg(DISTINCT sa.tags) as station_a_tags,
        array_agg(DISTINCT sb.tags) as station_b_tags
      FROM station_pairs sp
      JOIN stations sa ON sp.station_a = sa.id
      JOIN stations sb ON sp.station_b = sb.id
      GROUP BY sa.name, sb.name, sp.shared_songs
      ORDER BY sp.shared_songs DESC
      LIMIT 20
    `;

    res.json({
      crossStationSongs,
      stationOverlap,
      timeframe: `${days} days`
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/genre-evolution - Track genre evolution over time (cache 1 hour)
router.get('/genre-evolution', cacheControl(CacheDuration.LONG), async (req, res, next) => {
  try {
    const months = parseInt(req.query.months as string) || 6;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Get genre play counts by month
    const genreEvolution = await prisma.$queryRaw`
      WITH monthly_plays AS (
        SELECT
          DATE_TRUNC('month', p."playedAt") as month,
          s.tags,
          COUNT(p.id) as play_count
        FROM plays p
        JOIN stations s ON p."stationId" = s.id
        WHERE p."playedAt" >= ${startDate}
        GROUP BY DATE_TRUNC('month', p."playedAt"), s.tags
      )
      SELECT
        month,
        UNNEST(tags) as genre,
        SUM(play_count) as plays
      FROM monthly_plays
      GROUP BY month, UNNEST(tags)
      ORDER BY month ASC, plays DESC
    `;

    res.json({
      evolution: genreEvolution,
      timeframe: `${months} months`
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/artist-insights/:artist - Deep insights for specific artist (cache 10 minutes)
router.get('/artist-insights/:artist', cacheControl(CacheDuration.MEDIUM), async (req, res, next) => {
  try {
    const artist = req.params.artist;

    // Get all songs by this artist
    const artistSongs = await prisma.song.findMany({
      where: { artist }
    });

    const songIds = artistSongs.map(s => s.id);

    // Get play statistics
    const playStats = await prisma.$queryRaw`
      SELECT
        s.id,
        s.title,
        COUNT(p.id) as total_plays,
        COUNT(DISTINCT p."stationId") as stations_played_on,
        MIN(p."playedAt") as first_played,
        MAX(p."playedAt") as last_played,
        array_agg(DISTINCT st.name) as stations
      FROM songs s
      JOIN plays p ON s.id = p."songId"
      JOIN stations st ON p."stationId" = st.id
      WHERE s.artist = ${artist}
      GROUP BY s.id, s.title
      ORDER BY COUNT(p.id) DESC
    `;

    // Get play trend over last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const playTrend = await prisma.$queryRaw`
      SELECT
        DATE(p."playedAt") as date,
        COUNT(p.id)::int as plays
      FROM plays p
      JOIN songs s ON p."songId" = s.id
      WHERE s.artist = ${artist}
        AND p."playedAt" >= ${thirtyDaysAgo}
      GROUP BY DATE(p."playedAt")
      ORDER BY date ASC
    `;

    // Total plays across all songs
    const totalPlays = await prisma.play.count({
      where: {
        songId: { in: songIds }
      }
    });

    res.json({
      artist,
      totalSongs: artistSongs.length,
      totalPlays,
      songs: playStats,
      playTrend
    });
  } catch (error) {
    next(error);
  }
});

export default router;

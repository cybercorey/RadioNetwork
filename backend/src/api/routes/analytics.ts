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
// Query params:
//   - timeRange: '24h' | '7d' | '30d' | 'all' (default: '7d')
//   - includeNonSongs: 'true' to include shows/commercials (default: false, excludes them)
router.get('/dashboard', cacheControl(CacheDuration.MEDIUM), async (req, res, next) => {
  try {
    const timeRange = req.query.timeRange as string || '7d';
    // By default, exclude non-songs (shows, commercials, etc.) from analytics
    const includeNonSongs = req.query.includeNonSongs === 'true';

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

    // Song filter to exclude non-songs (shows, commercials) by default
    const songFilter = includeNonSongs ? {} : { isNonSong: false };

    // Get overall stats (always include non-songs in counts for accuracy)
    const totalPlays = await prisma.play.count();
    const totalSongs = await prisma.song.count({ where: songFilter });
    const activeStations = await prisma.station.count({ where: { isActive: true } });

    const songs = await prisma.song.findMany({
      where: songFilter,
      select: { artist: true }
    });
    const uniqueArtists = new Set(songs.map(s => s.artist)).size;

    // Plays over time (grouped by date) - filter non-songs via join
    const playsOverTime = includeNonSongs
      ? await prisma.$queryRaw<{ date: string; plays: number }[]>`
          SELECT
            DATE(played_at) as date,
            COUNT(*)::int as plays
          FROM plays
          WHERE played_at >= ${cutoffDate}
          GROUP BY DATE(played_at)
          ORDER BY date ASC
        `
      : await prisma.$queryRaw<{ date: string; plays: number }[]>`
          SELECT
            DATE(p.played_at) as date,
            COUNT(*)::int as plays
          FROM plays p
          JOIN songs s ON p.song_id = s.id
          WHERE p.played_at >= ${cutoffDate}
            AND s.is_non_song = false
          GROUP BY DATE(p.played_at)
          ORDER BY date ASC
        `;

    // Top songs - filter to only include actual songs
    const topSongsData = await prisma.play.groupBy({
      by: ['songId'],
      where: {
        playedAt: { gte: cutoffDate },
        song: songFilter,
      },
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

    // Top artists - exclude non-songs
    const playsWithSongs = await prisma.play.findMany({
      where: {
        playedAt: { gte: cutoffDate },
        song: songFilter,
      },
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

    // Plays by station - filter non-songs
    const playsByStationData = await prisma.play.groupBy({
      by: ['stationId'],
      where: {
        playedAt: { gte: cutoffDate },
        song: songFilter,
      },
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

    // Plays by genre (from station tags) - filter non-songs
    const genreCounts: Record<string, number> = {};
    const playsWithStations = await prisma.play.findMany({
      where: {
        playedAt: { gte: cutoffDate },
        song: songFilter,
      },
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

    // Plays by hour of day - filter non-songs
    const playsByHourData = includeNonSongs
      ? await prisma.$queryRaw<{ hour: number; plays: number }[]>`
          SELECT
            EXTRACT(HOUR FROM played_at)::int as hour,
            COUNT(*)::int as plays
          FROM plays
          WHERE played_at >= ${cutoffDate}
          GROUP BY EXTRACT(HOUR FROM played_at)
          ORDER BY hour ASC
        `
      : await prisma.$queryRaw<{ hour: number; plays: number }[]>`
          SELECT
            EXTRACT(HOUR FROM p.played_at)::int as hour,
            COUNT(*)::int as plays
          FROM plays p
          JOIN songs s ON p.song_id = s.id
          WHERE p.played_at >= ${cutoffDate}
            AND s.is_non_song = false
          GROUP BY EXTRACT(HOUR FROM p.played_at)
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
      includeNonSongs,
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
// Query params:
//   - limit: number of results (default: 50)
//   - days: time window in days (default: 7)
//   - includeNonSongs: 'true' to include shows/commercials (default: false)
router.get('/song-momentum', cacheControl(CacheDuration.LONG), async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const days = parseInt(req.query.days as string) || 7;
    const includeNonSongs = req.query.includeNonSongs === 'true';

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    const previousPeriodStart = new Date(dateThreshold);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days);

    // Compare current period vs previous period (exclude non-songs by default)
    const momentum = includeNonSongs
      ? await prisma.$queryRaw`
          WITH current_period AS (
            SELECT
              song_id,
              COUNT(*) as current_plays,
              COUNT(DISTINCT station_id) as current_stations
            FROM plays
            WHERE played_at >= ${dateThreshold}
            GROUP BY song_id
          ),
          previous_period AS (
            SELECT
              song_id,
              COUNT(*) as previous_plays
            FROM plays
            WHERE played_at >= ${previousPeriodStart} AND played_at < ${dateThreshold}
            GROUP BY song_id
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
          JOIN current_period cp ON s.id = cp.song_id
          LEFT JOIN previous_period pp ON s.id = pp.song_id
          WHERE cp.current_plays > 5
          ORDER BY momentum_delta DESC
          LIMIT ${limit}
        `
      : await prisma.$queryRaw`
          WITH current_period AS (
            SELECT
              p.song_id,
              COUNT(*) as current_plays,
              COUNT(DISTINCT p.station_id) as current_stations
            FROM plays p
            JOIN songs s ON p.song_id = s.id
            WHERE p.played_at >= ${dateThreshold}
              AND s.is_non_song = false
            GROUP BY p.song_id
          ),
          previous_period AS (
            SELECT
              p.song_id,
              COUNT(*) as previous_plays
            FROM plays p
            JOIN songs s ON p.song_id = s.id
            WHERE p.played_at >= ${previousPeriodStart} AND p.played_at < ${dateThreshold}
              AND s.is_non_song = false
            GROUP BY p.song_id
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
          JOIN current_period cp ON s.id = cp.song_id
          LEFT JOIN previous_period pp ON s.id = pp.song_id
          WHERE cp.current_plays > 5
          ORDER BY momentum_delta DESC
          LIMIT ${limit}
        `;

    res.json({
      timeframe: `${days} days`,
      songs: momentum,
      includeNonSongs,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/cross-station - Analyze cross-station patterns (cache 10 minutes)
// Query params:
//   - days: time window in days (default: 30)
//   - includeNonSongs: 'true' to include shows/commercials (default: false)
router.get('/cross-station', cacheControl(CacheDuration.LONG), async (req, res, next) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const includeNonSongs = req.query.includeNonSongs === 'true';

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Find songs played on multiple stations (exclude non-songs by default)
    const crossStationSongs = includeNonSongs
      ? await prisma.$queryRaw`
          SELECT
            s.id,
            s.title,
            s.artist,
            COUNT(DISTINCT p.station_id) as station_count,
            COUNT(p.id) as total_plays,
            array_agg(DISTINCT st.name) as stations,
            MAX(p.played_at) as last_played
          FROM songs s
          JOIN plays p ON s.id = p.song_id
          JOIN stations st ON p.station_id = st.id
          WHERE p.played_at >= ${dateThreshold}
          GROUP BY s.id, s.title, s.artist
          HAVING COUNT(DISTINCT p.station_id) > 1
          ORDER BY COUNT(DISTINCT p.station_id) DESC, COUNT(p.id) DESC
          LIMIT 100
        `
      : await prisma.$queryRaw`
          SELECT
            s.id,
            s.title,
            s.artist,
            COUNT(DISTINCT p.station_id) as station_count,
            COUNT(p.id) as total_plays,
            array_agg(DISTINCT st.name) as stations,
            MAX(p.played_at) as last_played
          FROM songs s
          JOIN plays p ON s.id = p.song_id
          JOIN stations st ON p.station_id = st.id
          WHERE p.played_at >= ${dateThreshold}
            AND s.is_non_song = false
          GROUP BY s.id, s.title, s.artist
          HAVING COUNT(DISTINCT p.station_id) > 1
          ORDER BY COUNT(DISTINCT p.station_id) DESC, COUNT(p.id) DESC
          LIMIT 100
        `;

    // Station overlap analysis (exclude non-songs by default)
    const stationOverlap = includeNonSongs
      ? await prisma.$queryRaw`
          WITH station_pairs AS (
            SELECT
              p1.station_id as station_a,
              p2.station_id as station_b,
              COUNT(DISTINCT p1.song_id) as shared_songs
            FROM plays p1
            JOIN plays p2 ON p1.song_id = p2.song_id AND p1.station_id < p2.station_id
            WHERE p1.played_at >= ${dateThreshold}
              AND p2.played_at >= ${dateThreshold}
            GROUP BY p1.station_id, p2.station_id
          )
          SELECT
            sa.name as station_a_name,
            sb.name as station_b_name,
            sp.shared_songs
          FROM station_pairs sp
          JOIN stations sa ON sp.station_a = sa.id
          JOIN stations sb ON sp.station_b = sb.id
          ORDER BY sp.shared_songs DESC
          LIMIT 20
        `
      : await prisma.$queryRaw`
          WITH station_pairs AS (
            SELECT
              p1.station_id as station_a,
              p2.station_id as station_b,
              COUNT(DISTINCT p1.song_id) as shared_songs
            FROM plays p1
            JOIN plays p2 ON p1.song_id = p2.song_id AND p1.station_id < p2.station_id
            JOIN songs s ON p1.song_id = s.id
            WHERE p1.played_at >= ${dateThreshold}
              AND p2.played_at >= ${dateThreshold}
              AND s.is_non_song = false
            GROUP BY p1.station_id, p2.station_id
          )
          SELECT
            sa.name as station_a_name,
            sb.name as station_b_name,
            sp.shared_songs
          FROM station_pairs sp
          JOIN stations sa ON sp.station_a = sa.id
          JOIN stations sb ON sp.station_b = sb.id
          ORDER BY sp.shared_songs DESC
          LIMIT 20
        `;

    res.json({
      crossStationSongs,
      stationOverlap,
      timeframe: `${days} days`,
      includeNonSongs,
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
          DATE_TRUNC('month', p.played_at) as month,
          s.tags,
          COUNT(p.id) as play_count
        FROM plays p
        JOIN stations s ON p.station_id = s.id
        WHERE p.played_at >= ${startDate}
        GROUP BY DATE_TRUNC('month', p.played_at), s.tags
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
        COUNT(DISTINCT p.station_id) as stations_played_on,
        MIN(p.played_at) as first_played,
        MAX(p.played_at) as last_played,
        array_agg(DISTINCT st.name) as stations
      FROM songs s
      JOIN plays p ON s.id = p.song_id
      JOIN stations st ON p.station_id = st.id
      WHERE s.artist = ${artist}
      GROUP BY s.id, s.title
      ORDER BY COUNT(p.id) DESC
    `;

    // Get play trend over last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const playTrend = await prisma.$queryRaw`
      SELECT
        DATE(p.played_at) as date,
        COUNT(p.id)::int as plays
      FROM plays p
      JOIN songs s ON p.song_id = s.id
      WHERE s.artist = ${artist}
        AND p.played_at >= ${thirtyDaysAgo}
      GROUP BY DATE(p.played_at)
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

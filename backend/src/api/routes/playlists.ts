import { Router } from 'express';
import { prisma } from '../../config/database';
import { cacheControl, CacheDuration } from '../middleware/cacheControl';

const router = Router();

// GET /api/playlists/trending - Get trending songs (cache 5 minutes)
router.get('/trending', cacheControl(CacheDuration.MEDIUM), async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const days = parseInt(req.query.days as string) || 7;

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Get songs with increasing play counts
    const trending = await prisma.$queryRaw`
      WITH recent_plays AS (
        SELECT
          "songId",
          COUNT(*) as recent_count,
          MAX("playedAt") as last_played
        FROM plays
        WHERE "playedAt" >= ${dateThreshold}
        GROUP BY "songId"
      ),
      older_plays AS (
        SELECT
          "songId",
          COUNT(*) as older_count
        FROM plays
        WHERE "playedAt" < ${dateThreshold}
          AND "playedAt" >= ${new Date(dateThreshold.getTime() - (days * 24 * 60 * 60 * 1000))}
        GROUP BY "songId"
      )
      SELECT
        s.id,
        s.title,
        s.artist,
        rp.recent_count as "recentPlays",
        COALESCE(op.older_count, 0) as "olderPlays",
        (rp.recent_count - COALESCE(op.older_count, 0)) as momentum,
        rp.last_played as "lastPlayed"
      FROM songs s
      JOIN recent_plays rp ON s.id = rp."songId"
      LEFT JOIN older_plays op ON s.id = op."songId"
      WHERE rp.recent_count > COALESCE(op.older_count, 0)
      ORDER BY (rp.recent_count - COALESCE(op.older_count, 0)) DESC
      LIMIT ${limit}
    `;

    res.json({ songs: trending, timeRange: `${days} days` });
  } catch (error) {
    next(error);
  }
});

// GET /api/playlists/weekly-top - Get weekly top songs (cache 1 hour)
router.get('/weekly-top', cacheControl(CacheDuration.LONG), async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weeklyTop = await prisma.$queryRaw`
      SELECT
        s.id,
        s.title,
        s.artist,
        COUNT(p.id) as "playCount",
        MAX(p."playedAt") as "lastPlayed",
        array_agg(DISTINCT st.name) as stations
      FROM songs s
      JOIN plays p ON s.id = p."songId"
      JOIN stations st ON p."stationId" = st.id
      WHERE p."playedAt" >= ${weekAgo}
      GROUP BY s.id, s.title, s.artist
      ORDER BY COUNT(p.id) DESC
      LIMIT ${limit}
    `;

    res.json({ songs: weeklyTop, period: 'Last 7 days' });
  } catch (error) {
    next(error);
  }
});

// GET /api/playlists/similar/:songId - Get similar songs (cache 10 minutes)
router.get('/similar/:songId', cacheControl(CacheDuration.MEDIUM), async (req, res, next) => {
  try {
    const songId = parseInt(req.params.songId);
    const limit = parseInt(req.query.limit as string) || 20;

    // Get the source song
    const sourceSong = await prisma.song.findUnique({
      where: { id: songId }
    });

    if (!sourceSong) {
      return res.status(404).json({ error: 'Song not found' });
    }

    // Find similar songs based on:
    // 1. Same artist
    // 2. Songs played on same stations
    // 3. Songs played around the same time
    const similarSongs = await prisma.$queryRaw`
      WITH source_plays AS (
        SELECT DISTINCT "stationId"
        FROM plays
        WHERE "songId" = ${songId}
      ),
      candidate_songs AS (
        SELECT
          s.id,
          s.title,
          s.artist,
          COUNT(DISTINCT p."stationId") as station_overlap,
          COUNT(p.id) as play_count,
          MAX(p."playedAt") as last_played,
          CASE
            WHEN s.artist = ${sourceSong.artist} THEN 100
            ELSE 0
          END as artist_score
        FROM songs s
        JOIN plays p ON s.id = p."songId"
        WHERE s.id != ${songId}
          AND (
            s.artist = ${sourceSong.artist}
            OR p."stationId" IN (SELECT "stationId" FROM source_plays)
          )
        GROUP BY s.id, s.title, s.artist
      )
      SELECT
        id,
        title,
        artist,
        play_count as "playCount",
        last_played as "lastPlayed",
        (artist_score + (station_overlap * 10)) as similarity_score
      FROM candidate_songs
      ORDER BY (artist_score + (station_overlap * 10)) DESC, play_count DESC
      LIMIT ${limit}
    `;

    res.json({
      sourceSong: {
        id: sourceSong.id,
        title: sourceSong.title,
        artist: sourceSong.artist
      },
      similarSongs
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/playlists/discover - Discover new songs (cache 5 minutes)
router.get('/discover', cacheControl(CacheDuration.MEDIUM), async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const minPlays = parseInt(req.query.minPlays as string) || 3;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Find songs that are new (first played in last 7 days) and getting traction
    const newSongs = await prisma.$queryRaw`
      WITH song_first_play AS (
        SELECT
          "songId",
          MIN("playedAt") as first_played,
          COUNT(*) as play_count,
          COUNT(DISTINCT "stationId") as station_count
        FROM plays
        GROUP BY "songId"
      )
      SELECT
        s.id,
        s.title,
        s.artist,
        sfp.first_played as "firstPlayed",
        sfp.play_count as "playCount",
        sfp.station_count as "stationCount"
      FROM songs s
      JOIN song_first_play sfp ON s.id = sfp."songId"
      WHERE sfp.first_played >= ${weekAgo}
        AND sfp.play_count >= ${minPlays}
      ORDER BY sfp.play_count DESC, sfp.station_count DESC
      LIMIT ${limit}
    `;

    res.json({ songs: newSongs, criteria: `New in last 7 days, min ${minPlays} plays` });
  } catch (error) {
    next(error);
  }
});

// GET /api/playlists/genre/:genre - Get songs by genre (cache 10 minutes)
router.get('/genre/:genre', cacheControl(CacheDuration.MEDIUM), async (req, res, next) => {
  try {
    const genre = req.params.genre;
    const limit = parseInt(req.query.limit as string) || 100;
    const days = parseInt(req.query.days as string) || 30;

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Get songs played on stations with this genre tag
    const genreSongs = await prisma.$queryRaw`
      SELECT
        s.id,
        s.title,
        s.artist,
        COUNT(p.id) as "playCount",
        MAX(p."playedAt") as "lastPlayed",
        array_agg(DISTINCT st.name) as stations
      FROM songs s
      JOIN plays p ON s.id = p."songId"
      JOIN stations st ON p."stationId" = st.id
      WHERE ${genre} = ANY(st.tags)
        AND p."playedAt" >= ${dateThreshold}
      GROUP BY s.id, s.title, s.artist
      ORDER BY COUNT(p.id) DESC
      LIMIT ${limit}
    `;

    res.json({
      genre,
      songs: genreSongs,
      timeRange: `${days} days`
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/playlists/throwback - Throwback songs (cache 1 hour)
router.get('/throwback', cacheControl(CacheDuration.LONG), async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const yearsAgo = parseInt(req.query.years as string) || 1;

    const targetDate = new Date();
    targetDate.setFullYear(targetDate.getFullYear() - yearsAgo);

    // Get a window around the target date (±7 days)
    const startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 7);

    const throwbackSongs = await prisma.$queryRaw`
      SELECT
        s.id,
        s.title,
        s.artist,
        COUNT(p.id) as "playCount",
        MIN(p."playedAt") as "firstPlayed",
        MAX(p."playedAt") as "lastPlayed"
      FROM songs s
      JOIN plays p ON s.id = p."songId"
      WHERE p."playedAt" BETWEEN ${startDate} AND ${endDate}
      GROUP BY s.id, s.title, s.artist
      ORDER BY COUNT(p.id) DESC
      LIMIT ${limit}
    `;

    res.json({
      songs: throwbackSongs,
      period: `Around ${targetDate.toDateString()}`,
      yearsAgo
    });
  } catch (error) {
    next(error);
  }
});

export default router;

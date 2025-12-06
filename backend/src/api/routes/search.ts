import { Router } from 'express';
import { prisma } from '../../config/database';

const router = Router();

// GET /api/search - Universal search endpoint
router.get('/', async (req, res, next) => {
  try {
    const query = req.query.q as string;
    const type = req.query.type as string || 'all';

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const searchLower = query.toLowerCase();
    const results: any = {
      songs: [],
      stations: [],
      plays: [],
    };

    // Search songs
    if (type === 'all' || type === 'songs' || type === 'artists') {
      const songWhere: any = {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { artist: { contains: query, mode: 'insensitive' } },
        ],
      };

      const songs = await prisma.song.findMany({
        where: songWhere,
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { plays: true },
          },
        },
      });

      results.songs = songs.map(song => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        isNonSong: song.isNonSong,
        nonSongType: song.nonSongType,
        playCount: song._count.plays,
      }));
    }

    // Search stations
    if (type === 'all' || type === 'stations') {
      const stations = await prisma.station.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { tags: { hasSome: [query] } },
          ],
        },
        take: 20,
      });

      results.stations = stations;
    }

    // Search recent plays
    if (type === 'all') {
      const plays = await prisma.play.findMany({
        where: {
          OR: [
            { song: { title: { contains: query, mode: 'insensitive' } } },
            { song: { artist: { contains: query, mode: 'insensitive' } } },
            { station: { name: { contains: query, mode: 'insensitive' } } },
          ],
        },
        include: {
          song: true,
          station: true,
        },
        orderBy: { playedAt: 'desc' },
        take: 25,
      });

      results.plays = plays;
    }

    res.json(results);
  } catch (error) {
    next(error);
  }
});

// GET /api/search/advanced - Advanced search with filters
router.get('/advanced', async (req, res, next) => {
  try {
    const query = req.query.q as string;
    const genre = req.query.genre as string;
    const minPlays = parseInt(req.query.minPlays as string) || 0;
    const maxPlays = parseInt(req.query.maxPlays as string) || Number.MAX_SAFE_INTEGER;
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : null;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : null;
    const sortBy = req.query.sortBy as string || 'relevance';
    const stationId = req.query.stationId ? parseInt(req.query.stationId as string) : null;
    const limit = parseInt(req.query.limit as string) || 50;

    // Build dynamic where clause
    const where: any = {};

    if (query && query.length >= 2) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { artist: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Get songs with play count filtering
    let songs = await prisma.song.findMany({
      where,
      include: {
        plays: {
          where: {
            ...(dateFrom && { playedAt: { gte: dateFrom } }),
            ...(dateTo && { playedAt: { lte: dateTo } }),
            ...(stationId && { stationId }),
            ...(genre && { station: { tags: { has: genre } } }),
          },
        },
        _count: {
          select: { plays: true },
        },
      },
      take: 500, // Get more for filtering
    });

    // Apply play count filters
    songs = songs.filter(song => {
      const playCount = song.plays.length || song._count.plays;
      return playCount >= minPlays && playCount <= maxPlays;
    });

    // Get detailed stats for each song
    const songsWithStats = await Promise.all(
      songs.map(async (song) => {
        const playCount = song.plays.length > 0 ? song.plays.length : song._count.plays;
        const recentPlay = song.plays[0]?.playedAt || null;

        // Get station count
        const stationCount = await prisma.play.groupBy({
          by: ['stationId'],
          where: { songId: song.id },
          _count: true,
        });

        return {
          id: song.id,
          title: song.title,
          artist: song.artist,
          playCount,
          stationCount: stationCount.length,
          lastPlayed: recentPlay,
        };
      })
    );

    // Sort results
    let sortedSongs = songsWithStats;
    switch (sortBy) {
      case 'plays':
        sortedSongs.sort((a, b) => b.playCount - a.playCount);
        break;
      case 'recent':
        sortedSongs.sort((a, b) => {
          if (!a.lastPlayed) return 1;
          if (!b.lastPlayed) return -1;
          return new Date(b.lastPlayed).getTime() - new Date(a.lastPlayed).getTime();
        });
        break;
      case 'title':
        sortedSongs.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'artist':
        sortedSongs.sort((a, b) => a.artist.localeCompare(b.artist));
        break;
      case 'stations':
        sortedSongs.sort((a, b) => b.stationCount - a.stationCount);
        break;
      default: // relevance
        // Already sorted by creation date from initial query
        break;
    }

    res.json({
      results: sortedSongs.slice(0, limit),
      total: sortedSongs.length,
      filters: {
        query,
        genre,
        minPlays,
        maxPlays,
        dateFrom,
        dateTo,
        sortBy,
        stationId,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/search/autocomplete - Fast autocomplete endpoint
router.get('/autocomplete', async (req, res, next) => {
  try {
    const query = req.query.q as string;
    const type = req.query.type as string || 'all';
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query || query.length < 2) {
      return res.json({ suggestions: [] });
    }

    const suggestions: any[] = [];

    // Autocomplete for songs/artists
    if (type === 'all' || type === 'songs') {
      const songs = await prisma.$queryRaw`
        SELECT DISTINCT ON (title, artist)
          id, title, artist
        FROM songs
        WHERE
          title ILIKE ${`%${query}%`}
          OR artist ILIKE ${`%${query}%`}
        ORDER BY title, artist
        LIMIT ${limit}
      `;

      suggestions.push(...(songs as any[]).map(s => ({
        type: 'song',
        id: s.id,
        title: s.title,
        artist: s.artist,
        display: `${s.title} - ${s.artist}`,
      })));
    }

    // Autocomplete for artists
    if (type === 'all' || type === 'artists') {
      const artists = await prisma.$queryRaw`
        SELECT DISTINCT artist, COUNT(*) as song_count
        FROM songs
        WHERE artist ILIKE ${`%${query}%`}
        GROUP BY artist
        ORDER BY COUNT(*) DESC
        LIMIT ${Math.floor(limit / 2)}
      `;

      suggestions.push(...(artists as any[]).map(a => ({
        type: 'artist',
        artist: a.artist,
        songCount: Number(a.song_count),
        display: `${a.artist} (${a.song_count} songs)`,
      })));
    }

    res.json({ suggestions: suggestions.slice(0, limit) });
  } catch (error) {
    next(error);
  }
});

// GET /api/search/filters/values - Get available filter values
router.get('/filters/values', async (req, res, next) => {
  try {
    // Get all unique genres from station tags
    const stations = await prisma.station.findMany({
      select: { tags: true },
    });

    const genres = new Set<string>();
    stations.forEach(station => {
      station.tags.forEach(tag => genres.add(tag));
    });

    // Get play count ranges
    const playStats = await prisma.$queryRaw<{ min_plays: number; max_plays: number }[]>`
      SELECT
        MIN(play_count)::int as min_plays,
        MAX(play_count)::int as max_plays
      FROM (
        SELECT COUNT(*) as play_count
        FROM plays
        GROUP BY "songId"
      ) subquery
    `;

    const stationList = await prisma.station.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });

    res.json({
      genres: Array.from(genres).sort(),
      playRange: playStats[0] || { min_plays: 0, max_plays: 0 },
      stations: stationList,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

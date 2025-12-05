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

export default router;

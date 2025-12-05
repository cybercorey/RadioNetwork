import { Router } from 'express';
import { songService } from '../../services/songService';
import { prisma } from '../../config/database';
import { cacheControl, CacheDuration } from '../middleware/cacheControl';

const router = Router();

// GET /api/songs - List all songs (cache 5 minutes)
router.get('/', cacheControl(CacheDuration.MEDIUM), async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const songs = await songService.findAll(limit, offset);
    
    res.json({
      songs,
      pagination: {
        limit,
        offset,
        hasMore: songs.length === limit
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/songs/top - Get top songs (cache 5 minutes)
router.get('/top', cacheControl(CacheDuration.MEDIUM), async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const stationId = req.query.stationId ? parseInt(req.query.stationId as string) : undefined;
    
    const topSongs = await songService.getTopSongs(limit, stationId);
    
    res.json(topSongs);
  } catch (error) {
    next(error);
  }
});

// GET /api/songs/search - Search songs (cache 1 minute)
router.get('/search', cacheControl(60), async (req, res, next) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 50;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const songs = await songService.search(query, limit);
    
    res.json(songs);
  } catch (error) {
    next(error);
  }
});

// GET /api/songs/:id - Get song by ID with stats (cache 5 minutes)
router.get('/:id', cacheControl(CacheDuration.MEDIUM), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const song = await songService.findById(id);

    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json(song);
  } catch (error) {
    next(error);
  }
});

// GET /api/songs/:id/stats - Get detailed song statistics (cache 5 minutes)
router.get('/:id/stats', cacheControl(CacheDuration.MEDIUM), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const song = await songService.findById(id);

    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const stats = await songService.getSongStats(id);

    res.json({
      song,
      stats
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/songs/:id/mark-non-song - Mark a song as non-song content
router.patch('/:id/mark-non-song', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { type } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Non-song type is required' });
    }

    const validTypes = ['show', 'commercial', 'station-id', 'weather', 'news', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid non-song type' });
    }

    const song = await prisma.song.update({
      where: { id },
      data: {
        isNonSong: true,
        nonSongType: type,
      },
    });

    res.json(song);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/songs/:id/mark-as-song - Revert a non-song back to a song
router.patch('/:id/mark-as-song', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    const song = await prisma.song.update({
      where: { id },
      data: {
        isNonSong: false,
        nonSongType: null,
      },
    });

    res.json(song);
  } catch (error) {
    next(error);
  }
});

export default router;

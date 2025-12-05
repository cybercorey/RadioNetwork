import { Router } from 'express';
import { songService } from '../../services/songService';

const router = Router();

// GET /api/songs - List all songs
router.get('/', async (req, res, next) => {
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

// GET /api/songs/top - Get top songs
router.get('/top', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const stationId = req.query.stationId ? parseInt(req.query.stationId as string) : undefined;
    
    const topSongs = await songService.getTopSongs(limit, stationId);
    
    res.json(topSongs);
  } catch (error) {
    next(error);
  }
});

// GET /api/songs/search - Search songs
router.get('/search', async (req, res, next) => {
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

// GET /api/songs/:id - Get song by ID with stats
router.get('/:id', async (req, res, next) => {
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

// GET /api/songs/:id/stats - Get detailed song statistics
router.get('/:id/stats', async (req, res, next) => {
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

export default router;

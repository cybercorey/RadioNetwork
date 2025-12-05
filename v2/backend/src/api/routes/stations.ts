import { Router } from 'express';
import { stationService } from '../../services/stationService';
import { playService } from '../../services/playService';
import { logger } from '../../utils/logger';

const router = Router();

// GET /api/stations - List all stations
router.get('/', async (req, res, next) => {
  try {
    const stations = await stationService.findAll();
    res.json(stations);
  } catch (error) {
    next(error);
  }
});

// GET /api/stations/:slug - Get station by slug
router.get('/:slug', async (req, res, next) => {
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

// GET /api/stations/:slug/current - Get current playing song
router.get('/:slug/current', async (req, res, next) => {
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

// GET /api/stations/:slug/history - Get play history for station
router.get('/:slug/history', async (req, res, next) => {
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

export default router;

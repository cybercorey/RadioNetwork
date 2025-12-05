import { Router } from 'express';
import { playService } from '../../services/playService';

const router = Router();

// GET /api/plays/recent - Get recent plays
router.get('/recent', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const plays = await playService.getRecentPlays(limit);
    
    res.json(plays);
  } catch (error) {
    next(error);
  }
});

// GET /api/plays/song/:id - Get plays for a specific song
router.get('/song/:id', async (req, res, next) => {
  try {
    const songId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit as string) || 100;
    
    const plays = await playService.getPlaysForSong(songId, limit);
    
    res.json(plays);
  } catch (error) {
    next(error);
  }
});

export default router;
